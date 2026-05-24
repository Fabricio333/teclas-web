'use client';

import type {
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
} from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { midiNumberToNote } from '@/lib/piano-player/Midi';
import styles from './AnimatedTeclasHero.module.scss';

type AnimatedTeclasHeroProps = {
  className?: string;
  enableSound?: boolean;
  reducedMotion?: boolean;
};

type Point = {
  x: number;
  y: number;
};

type CurveSample = {
  center: Point;
  top: Point;
  bottom: Point;
  tangent: Point;
  normal: Point;
};

type HeroKeyKind = 'white' | 'black';

type HeroKey = {
  id: string;
  midi: number;
  kind: HeroKeyKind;
  path: string;
  center: Point;
};

type Particle = {
  x: number;
  y: number;
  radius: number;
  phase: number;
  drift: number;
  alpha: number;
};

type Ripple = {
  x: number;
  y: number;
  startedAt: number;
};

type ToneModule = typeof import('tone');
type ToneSampler = import('tone').Sampler;

const VIEWBOX_WIDTH = 1000;
const VIEWBOX_HEIGHT = 710;
const TAU = Math.PI * 2;
const WHITE_KEY_COUNT = 36;
const KEY_HALF_WIDTH = 84;
const BLACK_KEY_LENGTH = 126;
const BLACK_KEY_WIDTH_FACTOR = 0.56;
const START_MIDI = 48;
const NATURAL_OFFSETS = [0, 2, 4, 5, 7, 9, 11];
const BLACK_AFTER_NATURAL_INDEX = new Set([0, 1, 3, 4, 5]);
const BURST_COLORS = ['#415ca9', '#ed3b95', '#f3862c', '#8658a7', '#60c9de'];
const SAMPLE_NOTES = [
  'C',
  'Db',
  'D',
  'Eb',
  'E',
  'F',
  'Gb',
  'G',
  'Ab',
  'A',
  'Bb',
  'B',
];

const curveA = {
  start: { x: 120, y: 415 },
  c1: { x: 270, y: 235 },
  c2: { x: 440, y: 220 },
  end: { x: 548, y: 292 },
};

const curveB = {
  start: curveA.end,
  c1: { x: 650, y: 350 },
  c2: { x: 805, y: 474 },
  end: { x: 970, y: 478 },
};

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
    cubicDerivative(
      segment.start,
      segment.c1,
      segment.c2,
      segment.end,
      localT,
    ),
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

function keySegmentPath(startT: number, endT: number, inset = 0) {
  const start = sampleKeyboardCurve(startT);
  const end = sampleKeyboardCurve(endT);
  const topStart = add(start.top, scale(start.tangent, inset));
  const topEnd = subtract(end.top, scale(end.tangent, inset));
  const bottomEnd = subtract(end.bottom, scale(end.tangent, inset));
  const bottomStart = add(start.bottom, scale(start.tangent, inset));

  return pathFromPoints([topStart, topEnd, bottomEnd, bottomStart]);
}

function blackKeyPath(centerT: number, keyStep: number) {
  const halfT = keyStep * BLACK_KEY_WIDTH_FACTOR * 0.5;
  const start = sampleKeyboardCurve(centerT - halfT);
  const end = sampleKeyboardCurve(centerT + halfT);
  const center = sampleKeyboardCurve(centerT);
  const topStart = add(start.top, scale(start.normal, 10));
  const topEnd = add(end.top, scale(end.normal, 10));
  const bottomEnd = add(
    center.top,
    add(scale(center.normal, BLACK_KEY_LENGTH), scale(center.tangent, 11)),
  );
  const bottomStart = add(
    center.top,
    add(scale(center.normal, BLACK_KEY_LENGTH), scale(center.tangent, -11)),
  );

  return pathFromPoints([topStart, topEnd, bottomEnd, bottomStart]);
}

function getNaturalMidi(index: number) {
  const octave = Math.floor(index / NATURAL_OFFSETS.length);
  const noteIndex = index % NATURAL_OFFSETS.length;

  return START_MIDI + octave * 12 + NATURAL_OFFSETS[noteIndex];
}

function buildKeyboard() {
  const whiteKeys: HeroKey[] = [];
  const blackKeys: HeroKey[] = [];
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
      center,
    });
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
      center: add(sample.top, scale(sample.normal, BLACK_KEY_LENGTH * 0.56)),
    });
  }

  return {
    whiteKeys,
    blackKeys,
    backingPath: buildBackingPath(),
  };
}

function buildBackingPath() {
  const topPoints: Point[] = [];
  const bottomPoints: Point[] = [];

  for (let index = 0; index <= 52; index++) {
    const sample = sampleKeyboardCurve(index / 52);
    topPoints.push(add(sample.top, scale(sample.normal, -14)));
    bottomPoints.push(add(sample.bottom, scale(sample.normal, 18)));
  }

  return pathFromPoints([...topPoints, ...bottomPoints.reverse()]);
}

function seededWave(x: number, y: number) {
  return Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
}

function buildParticles() {
  const particles: Particle[] = [];
  const step = 16;

  for (let y = 58; y <= 665; y += step) {
    for (let x = 135; x <= 970; x += step) {
      const upper =
        1 - ((x - 570) / 455) ** 2 - ((y - 215) / 185) ** 2;
      const lower =
        1 - ((x - 535) / 435) ** 2 - ((y - 515) / 220) ** 2;
      const field = Math.max(upper, lower * 0.94);

      if (field <= 0) continue;

      const wobble = seededWave(x, y) % 1;

      particles.push({
        x,
        y,
        radius: Math.max(0.8, 1.2 + field * 6 + wobble * 0.9),
        phase: (x * 0.018 + y * 0.027) % TAU,
        drift: 0.8 + Math.abs(wobble) * 1.8,
        alpha: 0.38 + Math.min(0.42, field * 0.36),
      });
    }
  }

  return particles;
}

function buildSamplerUrls() {
  const urls: Record<string, string> = {};

  for (let octave = 1; octave <= 7; octave++) {
    for (const note of SAMPLE_NOTES) {
      const name = `${note}${octave}`;
      urls[name] = `${name}.mp3`;
    }
  }

  urls.A0 = 'A0.mp3';
  urls.Bb0 = 'Bb0.mp3';
  urls.B0 = 'B0.mp3';
  urls.C8 = 'C8.mp3';

  return urls;
}

function starPoints(
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
        centerY + Math.sin(angle) * radius
      ).toFixed(1)}`,
    );
  }

  return points.join(' ');
}

function SingleNote() {
  return (
    <g fill="currentColor">
      <ellipse cx="0" cy="48" rx="14" ry="10" transform="rotate(-18 0 48)" />
      <path
        d="M 13 47 L 19 2"
        fill="none"
        stroke="currentColor"
        strokeWidth="7"
      />
      <path
        d="M 18 2 C 42 12 42 36 25 48"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="6"
      />
    </g>
  );
}

function DoubleNote() {
  return (
    <g fill="currentColor">
      <ellipse cx="0" cy="51" rx="14" ry="10" transform="rotate(-16 0 51)" />
      <ellipse cx="51" cy="46" rx="14" ry="10" transform="rotate(-16 51 46)" />
      <path
        d="M 13 50 L 13 2"
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
      />
      <path
        d="M 64 45 L 64 -6"
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
      />
      <path d="M 13 2 L 64 -6 L 64 7 L 13 16 Z" />
    </g>
  );
}

function TrebleMark() {
  return (
    <g fill="currentColor">
      <path
        d="M 55 8 C 35 34 35 66 60 84 C 89 104 104 63 70 62 C 40 61 27 96 53 118 C 84 145 119 116 101 78 C 90 53 68 40 51 20 C 34 1 26 23 35 49 C 45 76 75 102 86 134 C 97 168 64 188 38 162 C 17 142 33 108 64 125"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="7"
      />
      <ellipse cx="38" cy="162" rx="15" ry="21" transform="rotate(22 38 162)" />
    </g>
  );
}

function renderDecorations(motionIsReduced: boolean, sceneBurstId: number) {
  return (
    <g
      key={sceneBurstId}
      aria-hidden="true"
      className={classNames(
        motionIsReduced ? styles.reducedMotion : styles.sceneBurst,
      )}
    >
      <g transform="translate(205 78) rotate(-8) scale(0.78)">
        <g className={styles.floatSlow} style={{ color: '#415ca9' }}>
          <TrebleMark />
        </g>
      </g>
      <g transform="translate(388 50) rotate(-14) scale(1.08)">
        <g className={styles.floatMedium} style={{ color: '#ed3b95' }}>
          <DoubleNote />
        </g>
      </g>
      <g transform="translate(735 86) rotate(5) scale(1.04)">
        <g className={styles.floatSlow} style={{ color: '#f3862c' }}>
          <DoubleNote />
        </g>
      </g>
      <g transform="translate(606 158) rotate(9) scale(1.04)">
        <g className={styles.floatTiny} style={{ color: '#8658a7' }}>
          <SingleNote />
        </g>
      </g>
      <g transform="translate(770 245) rotate(4) scale(0.68)">
        <g className={styles.floatMedium} style={{ color: '#60c9de' }}>
          <DoubleNote />
        </g>
      </g>
      <g transform="translate(878 294) rotate(25) scale(0.72)">
        <g className={styles.floatTiny} style={{ color: '#8658a7' }}>
          <DoubleNote />
        </g>
      </g>
      <g transform="translate(268 588) rotate(6) scale(0.74)">
        <g className={styles.floatSlow} style={{ color: '#ed3b95' }}>
          <SingleNote />
        </g>
      </g>
      <g transform="translate(515 515) rotate(-4) scale(0.48)">
        <g className={styles.floatMedium} style={{ color: '#415ca9' }}>
          <SingleNote />
        </g>
      </g>
      <g transform="translate(802 630) rotate(22) scale(0.74)">
        <g className={styles.floatSlow} style={{ color: '#8658a7' }}>
          <SingleNote />
        </g>
      </g>

      <g className={styles.floatTiny}>
        <polygon
          fill="#8658a7"
          points={starPoints(72, 292, 58, 29)}
          transform="rotate(18 72 292)"
        />
      </g>
      <g className={styles.floatSlow}>
        <polygon
          fill="#74c8dc"
          points={starPoints(900, 205, 58, 29)}
          transform="rotate(10 900 205)"
        />
      </g>
      <g className={styles.floatMedium}>
        <polygon
          fill="#415ca9"
          points={starPoints(930, 390, 44, 22)}
          transform="rotate(12 930 390)"
        />
      </g>
      <g className={styles.floatTiny}>
        <polygon
          fill="#f3862c"
          points={starPoints(410, 600, 70, 34)}
          transform="rotate(-18 410 600)"
        />
      </g>
      <g className={styles.floatSlow}>
        <polygon
          fill="#ffd122"
          points={starPoints(665, 650, 34, 17)}
          transform="rotate(16 665 650)"
        />
      </g>
    </g>
  );
}

function classNames(...names: Array<string | false | undefined>) {
  return names.filter(Boolean).join(' ');
}

const PARTICLES = buildParticles();

export default function AnimatedTeclasHero({
  className,
  enableSound = true,
  reducedMotion,
}: AnimatedTeclasHeroProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rippleRef = useRef<Ripple[]>([]);
  const samplerRef = useRef<ToneSampler | null>(null);
  const toneRef = useRef<ToneModule | null>(null);
  const samplerPromiseRef = useRef<Promise<ToneSampler | null> | null>(null);
  const [pressedKey, setPressedKey] = useState<HeroKey | null>(null);
  const [sceneBurstId, setSceneBurstId] = useState(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const keyboard = useMemo(buildKeyboard, []);

  const motionIsReduced = reducedMotion ?? prefersReducedMotion;
  const allKeys = [...keyboard.whiteKeys, ...keyboard.blackKeys];

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updatePreference = () => setPrefersReducedMotion(mediaQuery.matches);

    updatePreference();
    mediaQuery.addEventListener('change', updatePreference);

    return () => {
      mediaQuery.removeEventListener('change', updatePreference);
    };
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    let animationFrame = 0;

    const resizeCanvas = () => {
      const { width, height } = root.getBoundingClientRect();
      const pixelRatio = window.devicePixelRatio || 1;

      canvas.width = Math.max(1, Math.floor(width * pixelRatio));
      canvas.height = Math.max(1, Math.floor(height * pixelRatio));
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(
        (width * pixelRatio) / VIEWBOX_WIDTH,
        0,
        0,
        (height * pixelRatio) / VIEWBOX_HEIGHT,
        0,
        0,
      );
    };

    const draw = (timestamp: number) => {
      context.clearRect(0, 0, VIEWBOX_WIDTH, VIEWBOX_HEIGHT);
      context.fillStyle = '#a5ce39';

      const activeRipples = rippleRef.current.filter(
        (ripple) => timestamp - ripple.startedAt < 900,
      );
      rippleRef.current = activeRipples;

      PARTICLES.forEach((particle) => {
        let offsetX = 0;
        let offsetY = 0;
        let radius = particle.radius;
        let alpha = particle.alpha;

        if (!motionIsReduced) {
          const wave = Math.sin(timestamp * 0.0015 + particle.phase);
          offsetX += Math.cos(particle.phase) * particle.drift * wave;
          offsetY += Math.sin(particle.phase) * particle.drift * wave;
          radius *= 1 + wave * 0.055;
        }

        activeRipples.forEach((ripple) => {
          const age = timestamp - ripple.startedAt;
          const waveRadius = age * 0.62;
          const distance = Math.hypot(
            particle.x - ripple.x,
            particle.y - ripple.y,
          );
          const waveDistance = Math.abs(distance - waveRadius);

          if (waveDistance > 80) return;

          const force = (1 - waveDistance / 80) * (1 - age / 900);
          const angle = Math.atan2(
            particle.y - ripple.y,
            particle.x - ripple.x,
          );

          offsetX += Math.cos(angle) * force * 20;
          offsetY += Math.sin(angle) * force * 20;
          radius += force * 3.4;
          alpha += force * 0.24;
        });

        context.globalAlpha = Math.min(0.95, alpha);
        context.beginPath();
        context.arc(
          particle.x + offsetX,
          particle.y + offsetY,
          Math.max(0.7, radius),
          0,
          TAU,
        );
        context.fill();
      });

      context.globalAlpha = 1;
      animationFrame = window.requestAnimationFrame(draw);
    };

    resizeCanvas();

    const resizeObserver = new ResizeObserver(resizeCanvas);
    resizeObserver.observe(root);

    animationFrame = window.requestAnimationFrame(draw);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
    };
  }, [motionIsReduced]);

  useEffect(() => {
    return () => {
      samplerRef.current?.dispose();
    };
  }, []);

  const getSampler = useCallback(async () => {
    if (!enableSound) return null;
    if (samplerRef.current) return samplerRef.current;

    if (!samplerPromiseRef.current) {
      samplerPromiseRef.current = import('tone')
        .then((Tone) => {
          toneRef.current = Tone;

          const sampler = new Tone.Sampler({
            urls: buildSamplerUrls(),
            baseUrl: '/samples/mp3/',
            release: 0.85,
          }).toDestination();

          samplerRef.current = sampler;

          return sampler;
        })
        .catch((error: unknown) => {
          console.error('Failed to load animated hero piano samples:', error);
          return null;
        });
    }

    return samplerPromiseRef.current;
  }, [enableSound]);

  const playMidi = useCallback(
    async (midi: number) => {
      if (!enableSound) return;

      const sampler = await getSampler();
      const Tone = toneRef.current;
      if (!sampler || !Tone) return;

      await Tone.start();
      sampler.triggerAttackRelease(
        midiNumberToNote(midi, undefined, true),
        '8n',
        undefined,
        0.86,
      );
    },
    [enableSound, getSampler],
  );

  const releaseKey = useCallback(() => {
    setPressedKey(null);
  }, []);

  const pressKey = useCallback(
    (key: HeroKey) => {
      setPressedKey(key);
      rippleRef.current.push({
        x: key.center.x,
        y: key.center.y,
        startedAt: performance.now(),
      });

      if (!motionIsReduced) {
        setSceneBurstId((current) => current + 1);
      }

      void playMidi(key.midi);
      window.setTimeout(releaseKey, 180);
    },
    [motionIsReduced, playMidi, releaseKey],
  );

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<SVGPathElement>, key: HeroKey) => {
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      pressKey(key);
    },
    [pressKey],
  );

  const handlePointerUp = useCallback(
    (event: ReactPointerEvent<SVGPathElement>) => {
      event.preventDefault();
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      releaseKey();
    },
    [releaseKey],
  );

  const handleKeyDown = useCallback(
    (event: ReactKeyboardEvent<SVGPathElement>, key: HeroKey) => {
      if (event.repeat) return;
      if (event.key !== 'Enter' && event.key !== ' ') return;

      event.preventDefault();
      pressKey(key);
    },
    [pressKey],
  );

  const handleKeyUp = useCallback(
    (event: ReactKeyboardEvent<SVGPathElement>) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;

      event.preventDefault();
      releaseKey();
    },
    [releaseKey],
  );

  return (
    <div
      ref={rootRef}
      aria-label="Piano animado con teclas interactivas y notas musicales"
      className={classNames(styles.root, className)}
    >
      <canvas ref={canvasRef} aria-hidden="true" className={styles.particles} />
      <svg
        className={styles.artwork}
        viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
      >
        <defs>
          <linearGradient id="teclasWhiteKey" x1="0%" x2="0%" y1="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="62%" stopColor="#fbfbf6" />
            <stop offset="100%" stopColor="#f0f0e8" />
          </linearGradient>
          <linearGradient id="teclasBlackKey" x1="0%" x2="0%" y1="0%" y2="100%">
            <stop offset="0%" stopColor="#313237" />
            <stop offset="58%" stopColor="#202126" />
            <stop offset="100%" stopColor="#0d0e12" />
          </linearGradient>
          <filter id="teclasSoftShadow" x="-20%" y="-20%" width="140%" height="150%">
            <feDropShadow
              dx="0"
              dy="7"
              floodColor="#1b1b1b"
              floodOpacity="0.18"
              stdDeviation="4"
            />
          </filter>
        </defs>

        {renderDecorations(motionIsReduced, sceneBurstId)}

        <g filter="url(#teclasSoftShadow)">
          <path className={styles.keyboardBack} d={keyboard.backingPath} />
          <g>
            {keyboard.whiteKeys.map((key) => (
              <path key={key.id} className={styles.whiteKey} d={key.path} />
            ))}
          </g>
          <g>
            {keyboard.blackKeys.map((key) => (
              <path key={key.id} className={styles.blackKey} d={key.path} />
            ))}
          </g>
          {pressedKey && (
            <path className={styles.pressedKey} d={pressedKey.path} />
          )}
          <g>
            {allKeys.map((key) => (
              <path
                key={`${key.id}-hit`}
                aria-label={`Tocar ${midiNumberToNote(
                  key.midi,
                  undefined,
                  true,
                )}`}
                className={styles.keyHitTarget}
                d={key.path}
                onKeyDown={(event) => handleKeyDown(event, key)}
                onKeyUp={handleKeyUp}
                onPointerCancel={handlePointerUp}
                onPointerDown={(event) => handlePointerDown(event, key)}
                onPointerUp={handlePointerUp}
                role="button"
                tabIndex={0}
              />
            ))}
          </g>
        </g>
      </svg>
    </div>
  );
}
