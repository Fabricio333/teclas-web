/**
 * Geometry of the curved keyboard drawn by the landing page's animated hero.
 *
 * Pure maths, no React and no DOM: the hero renders it as interactive SVG
 * paths, and `scripts/flyer/template.mjs` renders the same paths into the
 * event flyer. Extracted here so the two cannot drift — a change to the curve
 * moves both.
 *
 * Presentation is deliberately NOT here. The hero styles its keys from
 * `AnimatedTeclasHero.module.scss` against a light page; the flyer draws them
 * on a dark one and needs its own contrast. Only the shapes are shared.
 */

// ---------------------------------------------------------------- types

export type Point = {
  x: number;
  y: number;
};

export type CurveSample = {
  center: Point;
  top: Point;
  bottom: Point;
  tangent: Point;
  normal: Point;
};

export type HeroKeyKind = 'white' | 'black';

export type HeroKey = {
  id: string;
  midi: number;
  kind: HeroKeyKind;
  path: string;
  frontPath?: string;
  capPath?: string;
  center: Point;
};

// ------------------------------------------------------------ dimensions

export const VIEWBOX_WIDTH = 1000;
export const VIEWBOX_HEIGHT = 710;
const WHITE_KEY_COUNT = 36;
const KEY_HALF_WIDTH = 84;
const BLACK_KEY_LENGTH = 122;
const BLACK_KEY_WIDTH_FACTOR = 0.4;
const BLACK_KEY_BACK_OVERHANG = 8;
const BLACK_KEY_FRONT_WIDTH = 8;
const BLACK_KEY_SHOULDER_WIDTH = 7;
const BLACK_KEY_CAP_DEPTH = 16;
const WHITE_KEY_FRONT_DEPTH = 13;
const START_MIDI = 48;
const NATURAL_OFFSETS = [0, 2, 4, 5, 7, 9, 11];
const BLACK_AFTER_NATURAL_INDEX = new Set([0, 1, 3, 4, 5]);

/** The two cubics the keyboard rides along, left half then right. */
const curveA = {
  start: { x: 120, y: 415 },
  c1: { x: 270, y: 235 },
  c2: { x: 440, y: 220 },
  end: { x: 548, y: 292 },
};

const curveB = {
  start: curveA.end,
  c1: { x: 650, y: 350 },
  c2: { x: 830, y: 505 },
  end: { x: 970, y: 438 },
};

// ----------------------------------------------------------------- maths

function point(x: number, y: number): Point {
  return { x, y };
}

function add(a: Point, b: Point): Point {
  return point(a.x + b.x, a.y + b.y);
}

function subtract(a: Point, b: Point): Point {
  return point(a.x - b.x, a.y - b.y);
}

function scale(a: Point, value: number): Point {
  return point(a.x * value, a.y * value);
}

function normalize(a: Point): Point {
  const length = Math.hypot(a.x, a.y);

  if (length === 0) return point(1, 0);

  return point(a.x / length, a.y / length);
}

function cubicPoint(p0: Point, p1: Point, p2: Point, p3: Point, t: number) {
  const inverse = 1 - t;

  return point(
    inverse ** 3 * p0.x +
      3 * inverse ** 2 * t * p1.x +
      3 * inverse * t ** 2 * p2.x +
      t ** 3 * p3.x,
    inverse ** 3 * p0.y +
      3 * inverse ** 2 * t * p1.y +
      3 * inverse * t ** 2 * p2.y +
      t ** 3 * p3.y,
  );
}

function cubicDerivative(
  p0: Point,
  p1: Point,
  p2: Point,
  p3: Point,
  t: number,
) {
  const inverse = 1 - t;

  return point(
    3 * inverse ** 2 * (p1.x - p0.x) +
      6 * inverse * t * (p2.x - p1.x) +
      3 * t ** 2 * (p3.x - p2.x),
    3 * inverse ** 2 * (p1.y - p0.y) +
      6 * inverse * t * (p2.y - p1.y) +
      3 * t ** 2 * (p3.y - p2.y),
  );
}

function sampleKeyboardCurve(t: number): CurveSample {
  const split = 0.54;
  const segment = t <= split ? curveA : curveB;
  const localT = t <= split ? t / split : (t - split) / (1 - split);
  const center = cubicPoint(
    segment.start,
    segment.c1,
    segment.c2,
    segment.end,
    localT,
  );
  const tangent = normalize(
    cubicDerivative(segment.start, segment.c1, segment.c2, segment.end, localT),
  );
  const normal = normalize(point(-tangent.y, tangent.x));
  const top = subtract(center, scale(normal, KEY_HALF_WIDTH));
  const bottom = add(center, scale(normal, KEY_HALF_WIDTH));

  return {
    center,
    top,
    bottom,
    tangent,
    normal,
  };
}

function pathFromPoints(points: Point[]) {
  const [first, ...rest] = points;

  return [
    `M ${first.x.toFixed(2)} ${first.y.toFixed(2)}`,
    ...rest.map((item) => `L ${item.x.toFixed(2)} ${item.y.toFixed(2)}`),
    'Z',
  ].join(' ');
}

function openPathFromPoints(points: Point[]) {
  const [first, ...rest] = points;

  return [
    `M ${first.x.toFixed(2)} ${first.y.toFixed(2)}`,
    ...rest.map((item) => `L ${item.x.toFixed(2)} ${item.y.toFixed(2)}`),
  ].join(' ');
}

function keySegmentPath(startT: number, endT: number, inset = 0) {
  const start = sampleKeyboardCurve(startT);
  const end = sampleKeyboardCurve(endT);
  const topStart = add(start.top, scale(start.tangent, inset));
  const topEnd = subtract(end.top, scale(end.tangent, inset));
  const bottomEnd = subtract(end.bottom, scale(end.tangent, inset));
  const bottomStart = add(start.bottom, scale(start.tangent, inset));

  return pathFromPoints([topStart, topEnd, bottomEnd, bottomStart]);
}

function whiteKeyDividerPath(t: number) {
  const sample = sampleKeyboardCurve(t);
  const back = add(sample.top, scale(sample.normal, 8));
  const front = sample.bottom;

  return openPathFromPoints([back, front]);
}

function whiteKeyFrontPath(startT: number, endT: number, inset = 0) {
  const start = sampleKeyboardCurve(startT);
  const end = sampleKeyboardCurve(endT);
  const frontStart = add(start.bottom, scale(start.tangent, inset));
  const frontEnd = subtract(end.bottom, scale(end.tangent, inset));
  const backEnd = subtract(frontEnd, scale(end.normal, WHITE_KEY_FRONT_DEPTH));
  const backStart = subtract(
    frontStart,
    scale(start.normal, WHITE_KEY_FRONT_DEPTH),
  );

  return pathFromPoints([backStart, backEnd, frontEnd, frontStart]);
}

function blackKeyPath(centerT: number, keyStep: number) {
  const halfT = keyStep * BLACK_KEY_WIDTH_FACTOR * 0.5;
  const start = sampleKeyboardCurve(centerT - halfT);
  const end = sampleKeyboardCurve(centerT + halfT);
  const center = sampleKeyboardCurve(centerT);
  const topStart = subtract(
    start.top,
    scale(start.normal, BLACK_KEY_BACK_OVERHANG),
  );
  const topEnd = subtract(end.top, scale(end.normal, BLACK_KEY_BACK_OVERHANG));
  const bottomEnd = add(
    center.top,
    add(
      scale(center.normal, BLACK_KEY_LENGTH),
      scale(center.tangent, BLACK_KEY_FRONT_WIDTH),
    ),
  );
  const bottomStart = add(
    center.top,
    add(
      scale(center.normal, BLACK_KEY_LENGTH),
      scale(center.tangent, -BLACK_KEY_FRONT_WIDTH),
    ),
  );

  return pathFromPoints([topStart, topEnd, bottomEnd, bottomStart]);
}

function blackKeyCapPath(centerT: number) {
  const center = sampleKeyboardCurve(centerT);
  const backDistance = BLACK_KEY_LENGTH - BLACK_KEY_CAP_DEPTH;
  const frontDistance = BLACK_KEY_LENGTH - 2;
  const backLeft = add(
    center.top,
    add(
      scale(center.normal, backDistance),
      scale(center.tangent, -BLACK_KEY_SHOULDER_WIDTH),
    ),
  );
  const backRight = add(
    center.top,
    add(
      scale(center.normal, backDistance),
      scale(center.tangent, BLACK_KEY_SHOULDER_WIDTH),
    ),
  );
  const frontRight = add(
    center.top,
    add(
      scale(center.normal, frontDistance),
      scale(center.tangent, BLACK_KEY_FRONT_WIDTH),
    ),
  );
  const frontLeft = add(
    center.top,
    add(
      scale(center.normal, frontDistance),
      scale(center.tangent, -BLACK_KEY_FRONT_WIDTH),
    ),
  );

  return pathFromPoints([backLeft, backRight, frontRight, frontLeft]);
}

function getNaturalMidi(index: number) {
  const octave = Math.floor(index / NATURAL_OFFSETS.length);
  const noteIndex = index % NATURAL_OFFSETS.length;

  return START_MIDI + octave * 12 + NATURAL_OFFSETS[noteIndex];
}

export function buildKeyboard() {
  const whiteKeys: HeroKey[] = [];
  const blackKeys: HeroKey[] = [];
  const whiteKeyDividers: string[] = [];
  const keyStep = 1 / WHITE_KEY_COUNT;

  for (let index = 0; index < WHITE_KEY_COUNT; index++) {
    const startT = index * keyStep;
    const endT = (index + 1) * keyStep;
    const center = sampleKeyboardCurve(startT + keyStep / 2).center;

    whiteKeys.push({
      id: `white-${index}`,
      midi: getNaturalMidi(index),
      kind: 'white',
      path: keySegmentPath(startT, endT, 1.2),
      frontPath: whiteKeyFrontPath(startT, endT, 1.2),
      center,
    });
  }

  for (let index = 1; index < WHITE_KEY_COUNT; index++) {
    whiteKeyDividers.push(whiteKeyDividerPath(index * keyStep));
  }

  for (let index = 0; index < WHITE_KEY_COUNT - 1; index++) {
    const noteIndex = index % NATURAL_OFFSETS.length;
    if (!BLACK_AFTER_NATURAL_INDEX.has(noteIndex)) continue;

    const centerT = (index + 1) * keyStep;
    const sample = sampleKeyboardCurve(centerT);

    blackKeys.push({
      id: `black-${index}`,
      midi: getNaturalMidi(index) + 1,
      kind: 'black',
      path: blackKeyPath(centerT, keyStep),
      capPath: blackKeyCapPath(centerT),
      center: add(sample.top, scale(sample.normal, BLACK_KEY_LENGTH * 0.56)),
    });
  }

  return {
    whiteKeys,
    blackKeys,
    whiteKeyDividers,
    keyboardEdgePath: buildKeyboardEdgePath(),
  };
}

function buildKeyboardEdgePath() {
  const topPoints: Point[] = [];
  const bottomPoints: Point[] = [];

  for (let index = 0; index <= 72; index++) {
    const sample = sampleKeyboardCurve(index / 72);
    topPoints.push(sample.top);
    bottomPoints.push(sample.bottom);
  }

  return pathFromPoints([...topPoints, ...bottomPoints.reverse()]);
}
