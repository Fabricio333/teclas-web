/**
 * The notes and stars floating around the hero keyboard.
 *
 * Placement and glyph shapes only — no React, no animation. The landing page
 * maps this to animated SVG groups; `scripts/flyer/template.mjs` renders the
 * same list statically into the event flyer. Sharing the data is the point:
 * move a note here and it moves in both places.
 *
 * Coordinates are in the keyboard's 1000 × 710 viewBox, see `./keyboard`.
 */

export type NoteGlyph = 'single' | 'double' | 'treble';

/** Which of the hero's drift animations a decoration rides. Static renders
 *  ignore it. */
export type FloatSpeed = 'slow' | 'medium' | 'tiny';

/** One primitive of a glyph. Kept as data so a static renderer can emit the
 *  same shapes without a JSX runtime. */
export type GlyphShape =
  | {
      kind: 'ellipse';
      cx: number;
      cy: number;
      rx: number;
      ry: number;
      transform?: string;
    }
  | {
      kind: 'path';
      d: string;
      /** Filled when absent; stroked with this width when present. */
      strokeWidth?: number;
      round?: boolean;
    };

export const NOTE_SHAPES: Record<'single' | 'double', GlyphShape[]> = {
  single: [
    {
      kind: 'ellipse',
      cx: 0,
      cy: 48,
      rx: 14,
      ry: 10,
      transform: 'rotate(-18 0 48)',
    },
    { kind: 'path', d: 'M 13 47 L 19 2', strokeWidth: 7 },
    {
      kind: 'path',
      d: 'M 18 2 C 42 12 42 36 25 48',
      strokeWidth: 6,
      round: true,
    },
  ],
  double: [
    {
      kind: 'ellipse',
      cx: 0,
      cy: 51,
      rx: 14,
      ry: 10,
      transform: 'rotate(-16 0 51)',
    },
    {
      kind: 'ellipse',
      cx: 51,
      cy: 46,
      rx: 14,
      ry: 10,
      transform: 'rotate(-16 51 46)',
    },
    { kind: 'path', d: 'M 13 50 L 13 2', strokeWidth: 6 },
    { kind: 'path', d: 'M 64 45 L 64 -6', strokeWidth: 6 },
    { kind: 'path', d: 'M 13 2 L 64 -6 L 64 7 L 13 16 Z' },
  ],
};

export interface Decoration {
  glyph: NoteGlyph;
  /** Places the glyph inside the viewBox. */
  transform: string;
  color: string;
  float: FloatSpeed;
}

export const DECORATIONS: Decoration[] = [
  {
    glyph: 'treble',
    transform: 'translate(202 62) rotate(-8) scale(0.86)',
    color: '#415ca9',
    float: 'slow',
  },
  {
    glyph: 'double',
    transform: 'translate(388 50) rotate(-14) scale(1.08)',
    color: '#ed3b95',
    float: 'medium',
  },
  {
    glyph: 'double',
    transform: 'translate(735 86) rotate(5) scale(1.04)',
    color: '#f3862c',
    float: 'slow',
  },
  {
    glyph: 'single',
    transform: 'translate(606 158) rotate(9) scale(1.04)',
    color: '#8658a7',
    float: 'tiny',
  },
  {
    glyph: 'double',
    transform: 'translate(770 245) rotate(4) scale(0.68)',
    color: '#60c9de',
    float: 'medium',
  },
  {
    glyph: 'double',
    transform: 'translate(878 294) rotate(25) scale(0.72)',
    color: '#8658a7',
    float: 'tiny',
  },
  {
    glyph: 'single',
    transform: 'translate(268 588) rotate(6) scale(0.74)',
    color: '#ed3b95',
    float: 'slow',
  },
  {
    glyph: 'single',
    transform: 'translate(515 515) rotate(-4) scale(0.48)',
    color: '#415ca9',
    float: 'medium',
  },
  {
    glyph: 'single',
    transform: 'translate(802 630) rotate(22) scale(0.74)',
    color: '#8658a7',
    float: 'slow',
  },
];

export interface StarPlacement {
  cx: number;
  cy: number;
  outer: number;
  inner: number;
  rotate: number;
  fill: string;
  float: FloatSpeed;
}

export const STARS: StarPlacement[] = [
  {
    cx: 72,
    cy: 292,
    outer: 58,
    inner: 29,
    rotate: 18,
    fill: '#8658a7',
    float: 'tiny',
  },
  {
    cx: 900,
    cy: 205,
    outer: 58,
    inner: 29,
    rotate: 10,
    fill: '#74c8dc',
    float: 'slow',
  },
  {
    cx: 930,
    cy: 390,
    outer: 44,
    inner: 22,
    rotate: 12,
    fill: '#415ca9',
    float: 'medium',
  },
  {
    cx: 410,
    cy: 600,
    outer: 70,
    inner: 34,
    rotate: -18,
    fill: '#f3862c',
    float: 'tiny',
  },
  {
    cx: 665,
    cy: 650,
    outer: 34,
    inner: 17,
    rotate: 16,
    fill: '#ffd122',
    float: 'slow',
  },
];

/** Five-pointed star as an SVG `points` list. */
export function starPoints(
  centerX: number,
  centerY: number,
  outerRadius: number,
  innerRadius: number,
) {
  const points: string[] = [];

  for (let index = 0; index < 10; index++) {
    const angle = (-90 + index * 36) * (Math.PI / 180);
    const radius = index % 2 === 0 ? outerRadius : innerRadius;
    points.push(
      `${(centerX + Math.cos(angle) * radius).toFixed(1)},${(
        centerY +
        Math.sin(angle) * radius
      ).toFixed(1)}`,
    );
  }

  return points.join(' ');
}
