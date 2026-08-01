import styles from './AmbientNotes.module.scss';

type AmbientTone = 'light' | 'brand' | 'ink';

type AmbientDensity = 'sparse' | 'normal' | 'dense';

type AmbientNotesProps = {
  className?: string;
  density?: AmbientDensity;
  tone?: AmbientTone;
};

type ShapeKind =
  'beam' | 'dot' | 'note' | 'ring' | 'sparkle' | 'wave' | 'whole';

type Shape = {
  /** Percentage of the host box — `left`. */
  x: number;
  /** Percentage of the host box — `top`. */
  y: number;
  kind: ShapeKind;
  /** Rendered width in rem. */
  size: number;
  /** Vertical bob period, seconds. */
  float: number;
  /** Horizontal wander period, seconds. Deliberately coprime-ish with `float` so
   *  the two never resync into a visibly repeating loop. */
  wander: number;
  /** Horizontal wander amplitude, px. */
  amplitude: number;
  /** Negative animation-delay, seconds — starts every shape mid-cycle so the
   *  field looks settled on first paint instead of all lifting off together. */
  delay: number;
  /** Peak opacity. */
  opacity: number;
  rotate: number;
};

// Fixed, hand-placed layout rather than anything random: this renders during a
// static export, so the server and client markup have to agree exactly.
const SHAPES: Shape[] = [
  {
    x: 6,
    y: 18,
    kind: 'note',
    size: 2.6,
    float: 17,
    wander: 23,
    amplitude: 26,
    delay: -3,
    opacity: 0.34,
    rotate: -8,
  },
  {
    x: 17,
    y: 68,
    kind: 'sparkle',
    size: 1.5,
    float: 12,
    wander: 19,
    amplitude: 18,
    delay: -8,
    opacity: 0.42,
    rotate: 12,
  },
  {
    x: 27,
    y: 32,
    kind: 'dot',
    size: 0.7,
    float: 21,
    wander: 15,
    amplitude: 34,
    delay: -1,
    opacity: 0.3,
    rotate: 0,
  },
  {
    x: 34,
    y: 82,
    kind: 'beam',
    size: 3.4,
    float: 15,
    wander: 26,
    amplitude: 22,
    delay: -11,
    opacity: 0.26,
    rotate: 6,
  },
  {
    x: 44,
    y: 12,
    kind: 'wave',
    size: 3.1,
    float: 19,
    wander: 29,
    amplitude: 30,
    delay: -5,
    opacity: 0.24,
    rotate: -4,
  },
  {
    x: 52,
    y: 58,
    kind: 'ring',
    size: 1.9,
    float: 23,
    wander: 17,
    amplitude: 24,
    delay: -14,
    opacity: 0.28,
    rotate: 0,
  },
  {
    x: 61,
    y: 24,
    kind: 'note',
    size: 2.1,
    float: 14,
    wander: 25,
    amplitude: 20,
    delay: -6,
    opacity: 0.36,
    rotate: 14,
  },
  {
    x: 71,
    y: 74,
    kind: 'sparkle',
    size: 2.2,
    float: 18,
    wander: 21,
    amplitude: 28,
    delay: -2,
    opacity: 0.4,
    rotate: -16,
  },
  {
    x: 79,
    y: 38,
    kind: 'whole',
    size: 1.4,
    float: 25,
    wander: 16,
    amplitude: 32,
    delay: -9,
    opacity: 0.3,
    rotate: 8,
  },
  {
    x: 88,
    y: 14,
    kind: 'beam',
    size: 2.8,
    float: 16,
    wander: 27,
    amplitude: 18,
    delay: -13,
    opacity: 0.3,
    rotate: -10,
  },
  {
    x: 93,
    y: 62,
    kind: 'dot',
    size: 0.9,
    float: 20,
    wander: 13,
    amplitude: 26,
    delay: -4,
    opacity: 0.34,
    rotate: 0,
  },
  {
    x: 11,
    y: 45,
    kind: 'wave',
    size: 2.4,
    float: 22,
    wander: 18,
    amplitude: 22,
    delay: -16,
    opacity: 0.22,
    rotate: 10,
  },
  {
    x: 38,
    y: 50,
    kind: 'dot',
    size: 0.6,
    float: 13,
    wander: 24,
    amplitude: 30,
    delay: -7,
    opacity: 0.28,
    rotate: 0,
  },
  {
    x: 66,
    y: 90,
    kind: 'ring',
    size: 1.3,
    float: 24,
    wander: 20,
    amplitude: 20,
    delay: -10,
    opacity: 0.26,
    rotate: 0,
  },
  {
    x: 84,
    y: 86,
    kind: 'note',
    size: 1.7,
    float: 17,
    wander: 28,
    amplitude: 24,
    delay: -12,
    opacity: 0.32,
    rotate: -6,
  },
  {
    x: 22,
    y: 6,
    kind: 'sparkle',
    size: 1.1,
    float: 15,
    wander: 22,
    amplitude: 16,
    delay: -15,
    opacity: 0.38,
    rotate: 20,
  },
  {
    x: 57,
    y: 4,
    kind: 'dot',
    size: 0.8,
    float: 26,
    wander: 14,
    amplitude: 28,
    delay: -18,
    opacity: 0.24,
    rotate: 0,
  },
  {
    x: 47,
    y: 94,
    kind: 'whole',
    size: 1.2,
    float: 19,
    wander: 30,
    amplitude: 22,
    delay: -19,
    opacity: 0.26,
    rotate: -12,
  },
];

const DENSITY_COUNT: Record<AmbientDensity, number> = {
  sparse: 8,
  normal: 13,
  dense: SHAPES.length,
};

const TONE_CLASS: Record<AmbientTone, string> = {
  light: styles.toneLight,
  brand: styles.toneBrand,
  ink: styles.toneInk,
};

function ShapeGlyph({ kind }: { kind: ShapeKind }) {
  switch (kind) {
    // A single eighth note.
    case 'note':
      return (
        <svg viewBox="0 0 48 64" fill="none">
          <ellipse
            cx="15"
            cy="50"
            rx="13"
            ry="9.5"
            fill="currentColor"
            transform="rotate(-20 15 50)"
          />
          <path
            d="M27 47V8"
            stroke="currentColor"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <path
            d="M27 9c13 4 17 16 8 25"
            stroke="currentColor"
            strokeWidth="5"
            strokeLinecap="round"
          />
        </svg>
      );
    // Two beamed eighth notes.
    case 'beam':
      return (
        <svg viewBox="0 0 72 64" fill="none">
          <ellipse
            cx="13"
            cy="52"
            rx="12"
            ry="9"
            fill="currentColor"
            transform="rotate(-18 13 52)"
          />
          <ellipse
            cx="55"
            cy="45"
            rx="12"
            ry="9"
            fill="currentColor"
            transform="rotate(-18 55 45)"
          />
          <path
            d="M24 50V12"
            stroke="currentColor"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <path
            d="M66 43V5"
            stroke="currentColor"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <path d="M22 14 66 6v12L22 26z" fill="currentColor" />
        </svg>
      );
    // Whole note — an open oval.
    case 'whole':
      return (
        <svg viewBox="0 0 48 40" fill="none">
          <ellipse
            cx="24"
            cy="20"
            rx="21"
            ry="14"
            stroke="currentColor"
            strokeWidth="6"
            transform="rotate(-16 24 20)"
          />
        </svg>
      );
    // Four-point sparkle.
    case 'sparkle':
      return (
        <svg viewBox="0 0 48 48" fill="none">
          <path
            d="M24 0c2.6 13.2 10.2 20.8 24 24-13.8 3.2-21.4 10.8-24 24-2.6-13.2-10.2-20.8-24-24 13.8-3.2 21.4-10.8 24-24z"
            fill="currentColor"
          />
        </svg>
      );
    case 'ring':
      return (
        <svg viewBox="0 0 48 48" fill="none">
          <circle
            cx="24"
            cy="24"
            r="20"
            stroke="currentColor"
            strokeWidth="4"
          />
        </svg>
      );
    // A fragment of a sound wave.
    case 'wave':
      return (
        <svg viewBox="0 0 96 40" fill="none">
          <path
            d="M2 20c10-22 20 22 30 0s20-22 30 0 20 14 32 0"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
          />
        </svg>
      );
    case 'dot':
    default:
      return (
        <svg viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="11" fill="currentColor" />
        </svg>
      );
  }
}

/**
 * Decorative field of drifting SVG glyphs, sized to whatever box it is dropped
 * into. Purely presentational: `aria-hidden`, not focusable, and switched off
 * entirely under `prefers-reduced-motion` via the `--ambient-opacity` token.
 *
 * The host element needs `position: relative` and, in almost every case,
 * `overflow: hidden`.
 */
export default function AmbientNotes({
  className,
  density = 'normal',
  tone = 'light',
}: AmbientNotesProps) {
  const shapes = SHAPES.slice(0, DENSITY_COUNT[density]);

  return (
    <div
      aria-hidden="true"
      className={[styles.layer, TONE_CLASS[tone], className]
        .filter(Boolean)
        .join(' ')}
    >
      {shapes.map((shape) => (
        <span
          className={styles.drifter}
          key={`${shape.kind}-${shape.x}-${shape.y}`}
          style={{
            left: `${shape.x}%`,
            top: `${shape.y}%`,
            width: `${shape.size}rem`,
            animationDuration: `${shape.wander}s`,
            animationDelay: `${shape.delay}s`,
            ['--wander' as string]: `${shape.amplitude}px`,
          }}
        >
          <span
            className={styles.floater}
            style={{
              animationDuration: `${shape.float}s, ${shape.float * 0.7}s`,
              animationDelay: `${shape.delay}s, ${shape.delay * 0.6}s`,
              ['--spin-from' as string]: `${shape.rotate}deg`,
              ['--spin-to' as string]: `${shape.rotate + 10}deg`,
              ['--drift-y' as string]: `-${18 + shape.size * 4}px`,
              ['--twinkle-max' as string]: `${shape.opacity}`,
              ['--twinkle-min' as string]: `${(shape.opacity * 0.35).toFixed(3)}`,
            }}
          >
            <ShapeGlyph kind={shape.kind} />
          </span>
        </span>
      ))}
    </div>
  );
}
