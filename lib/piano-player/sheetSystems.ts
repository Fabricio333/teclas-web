/**
 * Staff-system geometry for an abcjs-rendered score.
 *
 * abcjs lays a tune out as a stack of "systems" (one line of music across the
 * page) inside a single SVG. It doesn't expose those boundaries in a stable,
 * documented way, so we recover them from the rendered note positions: notes
 * belonging to the same system share a vertical band, and consecutive systems
 * are separated by a gap much larger than any within-system variation.
 *
 * Working from the notes rather than from abcjs internals means this keeps
 * working across abcjs versions and across `responsive: 'resize'` rescaling.
 */

export interface StaffSystem {
  /** Offset from the top of the sheet container, in CSS pixels. */
  top: number;
  bottom: number;
  height: number;
  /** Indices into the note array that live on this system. */
  noteIndices: number[];
}

export interface SheetLayout {
  systems: StaffSystem[];
  /**
   * Median distance between consecutive system tops. Used to size the
   * viewport so it doesn't jitter as systems of differing height scroll past.
   */
  pitch: number;
  tallestSystem: number;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

interface Band {
  top: number;
  bottom: number;
}

/**
 * Vertical bands, one per system.
 *
 * abcjs wraps each system in `.abcjs-staff-wrapper` — one element per line of
 * music, containing every staff in it (both hands of a grand staff included).
 * That is exactly the unit we want, so use it when present.
 *
 * The fallback clusters note positions, which is less reliable: the gap
 * between the lowest note of one system and the highest note of the next can
 * be *smaller* than the height of a single stemmed note, so no note-height
 * derived threshold separates them correctly in general.
 */
function findSystemBands(
  root: HTMLElement,
  containerTop: number,
  measured: readonly { top: number; bottom: number; center: number; height: number }[],
): Band[] {
  const wrappers = root.querySelectorAll<SVGGraphicsElement>(
    '.abcjs-staff-wrapper',
  );
  if (wrappers.length > 0) {
    return Array.from(wrappers)
      .map((el) => {
        const r = el.getBoundingClientRect();
        return { top: r.top - containerTop, bottom: r.bottom - containerTop };
      })
      .sort((a, b) => a.top - b.top);
  }

  // Fallback: group staves that sit close together into one system.
  const staves = Array.from(
    root.querySelectorAll<SVGGraphicsElement>('.abcjs-staff'),
  )
    .map((el) => {
      const r = el.getBoundingClientRect();
      return { top: r.top - containerTop, bottom: r.bottom - containerTop };
    })
    .sort((a, b) => a.top - b.top);

  if (staves.length > 0) {
    const staffHeight = median(staves.map((s) => s.bottom - s.top)) || 24;
    const bands: Band[] = [];
    let cur = { ...staves[0] };
    for (let i = 1; i < staves.length; i++) {
      // A grand staff's two staves sit closer than two consecutive systems.
      if (staves[i].top - cur.bottom > staffHeight * 1.5) {
        bands.push(cur);
        cur = { ...staves[i] };
      } else {
        cur.bottom = Math.max(cur.bottom, staves[i].bottom);
      }
    }
    bands.push(cur);
    return bands;
  }

  // Last resort: cluster the notes themselves.
  const unit = median(measured.map((m) => m.height)) || 8;
  const byCenter = [...measured].sort((a, b) => a.center - b.center);
  const bands: Band[] = [];
  let cur = { top: byCenter[0].top, bottom: byCenter[0].bottom };
  for (let i = 1; i < byCenter.length; i++) {
    if (byCenter[i].center - byCenter[i - 1].center > unit * 2.5) {
      bands.push(cur);
      cur = { top: byCenter[i].top, bottom: byCenter[i].bottom };
    } else {
      cur.top = Math.min(cur.top, byCenter[i].top);
      cur.bottom = Math.max(cur.bottom, byCenter[i].bottom);
    }
  }
  bands.push(cur);
  return bands;
}

/**
 * Group note elements into systems.
 *
 * `container` is the element the offsets are measured against — normally the
 * scrolling inner wrapper, so the returned `top` can be fed straight into a
 * `translateY`. `root` is where the abcjs SVG lives; it defaults to the
 * container.
 */
export function computeSheetLayout(
  container: HTMLElement,
  notes: readonly SVGElement[],
  root: HTMLElement = container,
): SheetLayout {
  if (notes.length === 0) {
    return { systems: [], pitch: 0, tallestSystem: 0 };
  }

  const containerTop = container.getBoundingClientRect().top;

  const measured = notes.map((el, index) => {
    const r = el.getBoundingClientRect();
    return {
      index,
      top: r.top - containerTop,
      bottom: r.bottom - containerTop,
      center: r.top + r.height / 2 - containerTop,
      height: r.height,
    };
  });

  const bands = findSystemBands(root, containerTop, measured);

  // Assign each note to the band containing its centre, falling back to the
  // nearest band so a note with ledger lines poking outside still lands
  // somewhere sensible.
  const buckets: number[][] = bands.map(() => []);
  for (const m of measured) {
    let target = bands.findIndex(
      (bnd) => m.center >= bnd.top && m.center <= bnd.bottom,
    );
    if (target === -1) {
      let best = 0;
      let bestDist = Infinity;
      bands.forEach((bnd, i) => {
        const dist =
          m.center < bnd.top ? bnd.top - m.center : m.center - bnd.bottom;
        if (dist < bestDist) {
          bestDist = dist;
          best = i;
        }
      });
      target = best;
    }
    buckets[target].push(m.index);
  }

  const byIndex = new Map(measured.map((m) => [m.index, m]));

  const systems: StaffSystem[] = bands
    .map((bnd, i) => {
      const indices = buckets[i].sort((a, b) => a - b);
      // The staff wrapper only covers the five staff lines. Notes with stems,
      // ledger lines, accidentals or beams extend well beyond it, so union the
      // band with its notes' extents — otherwise a one-system viewport clips
      // everything above and below the stave.
      let top = bnd.top;
      let bottom = bnd.bottom;
      for (const idx of indices) {
        const m = byIndex.get(idx);
        if (!m) continue;
        top = Math.min(top, m.top);
        bottom = Math.max(bottom, m.bottom);
      }
      // Breathing room so glyphs don't sit flush against the clip edge.
      const pad = 6;
      return {
        top: top - pad,
        bottom: bottom + pad,
        height: bottom - top + pad * 2,
        noteIndices: indices,
      };
    })
    // A trailing band with no notes (e.g. an empty final staff) would be a
    // scroll target the student can never reach.
    .filter((s) => s.noteIndices.length > 0);

  if (systems.length === 0) {
    return { systems: [], pitch: 0, tallestSystem: 0 };
  }

  const gaps: number[] = [];
  for (let i = 1; i < systems.length; i++) {
    gaps.push(systems[i].top - systems[i - 1].top);
  }

  const tallestSystem = Math.max(...systems.map((s) => s.height));

  return {
    systems,
    pitch: gaps.length > 0 ? median(gaps) : tallestSystem * 1.4,
    tallestSystem,
  };
}

/** Which system contains a given note index. Returns 0 if not found. */
export function systemIndexForNote(
  layout: SheetLayout,
  noteIndex: number,
): number {
  for (let i = 0; i < layout.systems.length; i++) {
    if (layout.systems[i].noteIndices.includes(noteIndex)) return i;
  }
  return 0;
}

/**
 * Height the viewport should have to show `lines` systems.
 *
 * Derived from the median pitch rather than from the specific systems on
 * screen, so the box doesn't resize as the score scrolls.
 */
export function viewportHeightFor(layout: SheetLayout, lines: number): number {
  if (layout.systems.length === 0) return 0;
  const visible = Math.max(1, Math.min(lines, layout.systems.length));
  return layout.pitch * (visible - 1) + layout.tallestSystem;
}

/**
 * Scroll offset that puts `systemIndex` at the top of the viewport, clamped so
 * the last screenful doesn't scroll past the end of the music.
 */
export function scrollOffsetFor(
  layout: SheetLayout,
  systemIndex: number,
  lines: number,
): number {
  const { systems } = layout;
  if (systems.length === 0) return 0;
  // Don't scroll further than the point where the final system is visible.
  const lastStart = Math.max(0, systems.length - Math.max(1, lines));
  const clamped = Math.min(Math.max(0, systemIndex), lastStart);
  return systems[clamped].top;
}
