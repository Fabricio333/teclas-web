'use client';

import type {
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
} from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  buildParticles,
  PARTICLE_COLOR,
  TAU,
} from '@/lib/hero-artwork/particles';
import {
  DECORATIONS,
  NOTE_SHAPES,
  starPoints,
  STARS,
  type FloatSpeed,
  type NoteGlyph,
} from '@/lib/hero-artwork/decorations';
import {
  buildKeyboard,
  VIEWBOX_HEIGHT,
  VIEWBOX_WIDTH,
  type HeroKey,
} from '@/lib/hero-artwork/keyboard';
import { midiNumberToNote } from '@/lib/piano-player/Midi';
import { midiToSolfege } from '@/lib/piano-player/noteNames';
import styles from './AnimatedTeclasHero.module.scss';

type AnimatedTeclasHeroProps = {
  className?: string;
  enableSound?: boolean;
  reducedMotion?: boolean;
};

type Ripple = {
  x: number;
  y: number;
  startedAt: number;
};

type ToneModule = typeof import('tone');
type ToneSampler = import('tone').Sampler;

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

/** One glyph, drawn from the shared shape list. */
function Glyph({ glyph }: { glyph: NoteGlyph }) {
  if (glyph === 'treble') {
    return (
      <text className={styles.trebleClef} x="0" y="148">
        𝄞
      </text>
    );
  }

  return (
    <g fill="currentColor">
      {NOTE_SHAPES[glyph].map((shape, index) =>
        shape.kind === 'ellipse' ? (
          <ellipse
            key={index}
            cx={shape.cx}
            cy={shape.cy}
            rx={shape.rx}
            ry={shape.ry}
            transform={shape.transform}
          />
        ) : (
          <path
            key={index}
            d={shape.d}
            fill={shape.strokeWidth ? 'none' : undefined}
            stroke={shape.strokeWidth ? 'currentColor' : undefined}
            strokeLinecap={shape.round ? 'round' : undefined}
            strokeWidth={shape.strokeWidth}
          />
        ),
      )}
    </g>
  );
}

const FLOAT_CLASS: Record<FloatSpeed, string> = {
  slow: styles.floatSlow,
  medium: styles.floatMedium,
  tiny: styles.floatTiny,
};

function renderDecorations(motionIsReduced: boolean, sceneBurstId: number) {
  return (
    <g
      key={sceneBurstId}
      aria-hidden="true"
      className={classNames(
        motionIsReduced ? styles.reducedMotion : styles.sceneBurst,
      )}
    >
      {DECORATIONS.map((decoration, index) => (
        <g key={`note-${index}`} transform={decoration.transform}>
          <g
            className={FLOAT_CLASS[decoration.float]}
            style={{ color: decoration.color }}
          >
            <Glyph glyph={decoration.glyph} />
          </g>
        </g>
      ))}

      {STARS.map((star, index) => (
        <g key={`star-${index}`} className={FLOAT_CLASS[star.float]}>
          <polygon
            fill={star.fill}
            points={starPoints(star.cx, star.cy, star.outer, star.inner)}
            transform={`rotate(${star.rotate} ${star.cx} ${star.cy})`}
          />
        </g>
      ))}
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
      context.fillStyle = PARTICLE_COLOR;

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
          <filter
            id="teclasSoftShadow"
            x="-20%"
            y="-20%"
            width="140%"
            height="150%"
          >
            <feDropShadow
              dx="0"
              dy="7"
              floodColor="#1b1b1b"
              floodOpacity="0.18"
              stdDeviation="4"
            />
          </filter>
        </defs>

        <g filter="url(#teclasSoftShadow)">
          <g>
            {keyboard.whiteKeys.map((key) => (
              <path key={key.id} className={styles.whiteKey} d={key.path} />
            ))}
          </g>
          <g>
            {keyboard.whiteKeys.map((key) =>
              key.frontPath ? (
                <path
                  key={`${key.id}-front`}
                  className={styles.whiteKeyFront}
                  d={key.frontPath}
                />
              ) : null,
            )}
          </g>
          <g>
            {keyboard.whiteKeyDividers.map((path, index) => (
              <path
                key={`white-divider-${index}`}
                className={styles.whiteKeyDivider}
                d={path}
              />
            ))}
          </g>
          <path className={styles.keyboardEdge} d={keyboard.keyboardEdgePath} />
          <g>
            {keyboard.blackKeys.map((key) => (
              <path key={key.id} className={styles.blackKey} d={key.path} />
            ))}
          </g>
          <g>
            {keyboard.blackKeys.map((key) =>
              key.capPath ? (
                <path
                  key={`${key.id}-cap`}
                  className={styles.blackKeyCap}
                  d={key.capPath}
                />
              ) : null,
            )}
          </g>
          {pressedKey && (
            <path className={styles.pressedKey} d={pressedKey.path} />
          )}
        </g>

        {renderDecorations(motionIsReduced, sceneBurstId)}

        <g>
          {allKeys.map((key) => (
            <path
              key={`${key.id}-hit`}
              aria-label={`Tocar ${midiToSolfege(key.midi, { octave: true })}`}
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
      </svg>
    </div>
  );
}
