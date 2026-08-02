'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlay, faRotateRight } from '@fortawesome/free-solid-svg-icons';
import { midiNumberToNote } from '@/lib/piano-player/Midi';
import { midiToSolfege } from '@/lib/piano-player/noteNames';
import { WHITE_KEYS, BLACK_KEYS } from '@/lib/piano-player/songs';
import styles from './SimonGame.module.scss';

/**
 * "Simon musical" — the app plays a sequence, the student plays it back.
 *
 * Deliberately small: one button, one piano, one line of text telling you what
 * to do. The design rule throughout is that a child should be able to start
 * playing without being taught anything and without setting anything up.
 */

type Phase = 'idle' | 'listening' | 'answering' | 'right' | 'wrong';

/** Beats. Two values only — a child can hear "short" and "long". */
type Beat = 1 | 2;

interface Step {
  midi: number;
  beats: Beat;
}

/** White keys of one octave: Do Re Mi Fa Sol La Si. No accidentals — the game
 *  is about listening, and seven choices is already plenty. */
const POOL = WHITE_KEYS.map((k) => k.midi);

const BEAT_MS = 620;
/** Round at which long notes start appearing. The first rounds are pure
 *  pitch, so the rhythm rule is met only once the ear part is comfortable. */
const RHYTHM_FROM_ROUND = 3;

const PHASE_TEXT: Record<Phase, string> = {
  idle: 'Tocá Escuchar y prestá atención',
  listening: 'Escuchá…',
  answering: 'Tu turno',
  right: '¡Muy bien!',
  wrong: 'Casi. Escuchá de nuevo',
};

function randomStep(round: number): Step {
  const midi = POOL[Math.floor(Math.random() * POOL.length)];
  const beats: Beat = round >= RHYTHM_FROM_ROUND && Math.random() < 0.4 ? 2 : 1;
  return { midi, beats };
}

/** ABC for the notation shown after a correct round. */
function sequenceToAbc(steps: Step[]): string {
  const letters: Record<number, string> = {
    60: 'C',
    62: 'D',
    64: 'E',
    65: 'F',
    67: 'G',
    69: 'A',
    71: 'B',
  };
  const body = steps
    .map((s) => `${letters[s.midi] ?? 'C'}${s.beats === 2 ? '2' : ''}`)
    .join(' ');

  return ['X:1', 'M:4/4', 'L:1/4', 'K:C', `${body} |`].join('\n');
}

/**
 * Did the student's timing match the pattern of short and long notes?
 *
 * Judged on the *shape* only: each gap is compared with the student's own
 * shortest gap, so playing the whole thing slowly is fine. Nothing here
 * compares against the app's tempo, because being made to keep up is the
 * fastest way to make a beginner quit.
 */
function rhythmMatches(expected: Step[], onsets: number[]): boolean {
  if (expected.length < 2) return true;
  if (!expected.some((s) => s.beats === 2)) return true;

  const gaps: number[] = [];
  for (let i = 1; i < onsets.length; i++) gaps.push(onsets[i] - onsets[i - 1]);
  if (gaps.length === 0) return true;

  const shortest = Math.min(...gaps);
  // A gap counts as "long" once it is half again as long as the shortest one.
  // Generous on purpose: the ratio in the music is 2:1.
  return gaps.every((gap, i) => {
    const wasLong = gap >= shortest * 1.5;
    return wasLong === (expected[i].beats === 2);
  });
}

export default function SimonGame() {
  const [steps, setSteps] = useState<Step[]>([]);
  const [phase, setPhase] = useState<Phase>('idle');
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const [answered, setAnswered] = useState(0);
  const [best, setBest] = useState(0);
  const [showSheet, setShowSheet] = useState(true);

  const onsetsRef = useRef<number[]>([]);
  const answerRef = useRef(0);
  const stepsRef = useRef<Step[]>([]);
  const phaseRef = useRef<Phase>('idle');
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const samplerRef = useRef<{
    triggerAttackRelease: (n: string, d: number) => void;
  } | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  stepsRef.current = steps;
  phaseRef.current = phase;

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  // Audio is loaded on the first interaction, not on mount: browsers refuse to
  // start an AudioContext without a gesture, and loading ~90 samples for a
  // visitor who never presses play is pure waste.
  const getSampler = useCallback(async () => {
    if (samplerRef.current) return samplerRef.current;

    const Tone = await import('tone');
    await Tone.start();

    const urls: Record<string, string> = {};
    POOL.concat(BLACK_KEYS.map((k) => k.midi)).forEach((midi) => {
      const name = midiNumberToNote(midi, undefined, true);
      urls[name] = `${name}.mp3`;
    });

    const sampler = new Tone.Sampler({
      urls,
      baseUrl: '/samples/mp3/',
      release: 0.6,
    }).toDestination();

    await Tone.loaded();

    samplerRef.current = {
      triggerAttackRelease: (name, durationSeconds) =>
        sampler.triggerAttackRelease(name, durationSeconds),
    };
    return samplerRef.current;
  }, []);

  const sound = useCallback(
    async (midi: number, beats: number = 1) => {
      const sampler = await getSampler();
      sampler.triggerAttackRelease(
        midiNumberToNote(midi, undefined, true),
        (beats * BEAT_MS) / 1000,
      );
    },
    [getSampler],
  );

  const playSequence = useCallback(
    async (list: Step[]) => {
      clearTimers();
      setPhase('listening');
      await getSampler();

      let at = 250;
      list.forEach((step, index) => {
        timersRef.current.push(
          setTimeout(() => {
            setPlayingIndex(index);
            void sound(step.midi, step.beats);
          }, at),
        );
        at += step.beats * BEAT_MS;
      });

      timersRef.current.push(
        setTimeout(() => {
          setPlayingIndex(null);
          onsetsRef.current = [];
          answerRef.current = 0;
          setAnswered(0);
          setPhase('answering');
        }, at + 120),
      );
    },
    [clearTimers, getSampler, sound],
  );

  const nextRound = useCallback(() => {
    const list = [...stepsRef.current, randomStep(stepsRef.current.length + 1)];
    setSteps(list);
    void playSequence(list);
  }, [playSequence]);

  const restart = useCallback(() => {
    clearTimers();
    setSteps([]);
    setPhase('idle');
    setPlayingIndex(null);
    setAnswered(0);
  }, [clearTimers]);

  const press = useCallback(
    (midi: number) => {
      void sound(midi, 1);
      if (phaseRef.current !== 'answering') return;

      const list = stepsRef.current;
      const index = answerRef.current;
      onsetsRef.current.push(performance.now());

      if (list[index]?.midi !== midi) {
        clearTimers();
        setPhase('wrong');
        timersRef.current.push(setTimeout(() => playSequence(list), 1400));
        return;
      }

      answerRef.current = index + 1;
      setAnswered(index + 1);
      if (answerRef.current < list.length) return;

      // Whole sequence played back. Notes were right; check the shape of the
      // rhythm, and treat a rhythm slip as "try again", never as a loss.
      if (!rhythmMatches(list, onsetsRef.current)) {
        clearTimers();
        setPhase('wrong');
        timersRef.current.push(setTimeout(() => playSequence(list), 1600));
        return;
      }

      setPhase('right');
      setBest((b) => Math.max(b, list.length));
    },
    [clearTimers, playSequence, sound],
  );

  // Notation for the round just completed. Rendered only on success, so it
  // rewards the ear rather than replacing it.
  useEffect(() => {
    if (phase !== 'right' || !showSheet) return;
    const host = sheetRef.current;
    if (!host) return;

    let cancelled = false;
    void import('abcjs').then((mod) => {
      if (cancelled || !sheetRef.current) return;
      const abcjs = (mod as { default?: typeof mod }).default ?? mod;
      abcjs.renderAbc(sheetRef.current, sequenceToAbc(stepsRef.current), {
        responsive: 'resize',
        scale: 1.1,
        staffwidth: 480,
        paddingtop: 4,
        paddingbottom: 4,
      });
    });

    return () => {
      cancelled = true;
      if (host) host.innerHTML = '';
    };
  }, [phase, showSheet]);

  // The QWERTY row, so a student on a laptop never has to reach for the mouse.
  useEffect(() => {
    const byKey = new Map<string, number>();
    WHITE_KEYS.forEach((k) => byKey.set(k.label.toLowerCase(), k.midi));

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || event.metaKey || event.ctrlKey || event.altKey)
        return;
      const midi = byKey.get(event.key.toLowerCase());
      if (midi === undefined) return;
      event.preventDefault();
      press(midi);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [press]);

  const busy = phase === 'listening';

  return (
    <div className={styles.game}>
      <div className={styles.statusRow}>
        <span className={styles.round}>
          Ronda {steps.length || 1}
          {best > 0 && <small> · mejor {best}</small>}
        </span>
        <label className={styles.sheetToggle}>
          <input
            checked={showSheet}
            onChange={(e) => setShowSheet(e.target.checked)}
            type="checkbox"
          />
          <span>Ver la partitura</span>
        </label>
      </div>

      <p
        className={`${styles.status} ${styles[`status_${phase}`]}`}
        role="status"
      >
        {PHASE_TEXT[phase]}
      </p>

      {/* One dot per note, filled as the student gets them right. This is the
          only progress indicator — a bar or a score would be noise here. */}
      <div className={styles.dots} aria-hidden="true">
        {steps.map((step, i) => (
          <span
            className={[
              styles.dot,
              step.beats === 2 ? styles.dotLong : '',
              playingIndex === i ? styles.dotPlaying : '',
              phase === 'answering' && i < answered ? styles.dotDone : '',
            ]
              .filter(Boolean)
              .join(' ')}
            key={i}
          />
        ))}
      </div>

      <div className={styles.piano}>
        {WHITE_KEYS.map((key) => (
          <button
            className={`${styles.whiteKey} ${
              playingIndex !== null && steps[playingIndex]?.midi === key.midi
                ? styles.keyLit
                : ''
            }`}
            disabled={busy}
            key={key.midi}
            onPointerDown={() => press(key.midi)}
            type="button"
          >
            <span className={styles.keyName}>{midiToSolfege(key.midi)}</span>
            <span className={styles.keyHint}>{key.label}</span>
          </button>
        ))}
        {/* Decorative: the black keys are never part of a sequence, but a
            keyboard without them does not read as a piano. */}
        {BLACK_KEYS.map((key, i) => (
          <span
            aria-hidden="true"
            className={styles.blackKey}
            key={key.midi}
            style={{ ['--slot' as string]: [0.7, 1.7, 3.7, 4.7, 5.7][i] }}
          />
        ))}
      </div>

      <div className={styles.actions}>
        {phase === 'right' ? (
          <button
            className={`btnPrimary ${styles.cta}`}
            onClick={nextRound}
            type="button"
          >
            Seguir
          </button>
        ) : (
          <button
            className={`btnPrimary ${styles.cta}`}
            disabled={busy}
            onClick={() =>
              steps.length === 0 ? nextRound() : playSequence(steps)
            }
            type="button"
          >
            <FontAwesomeIcon icon={faPlay} />{' '}
            {steps.length === 0 ? 'Empezar' : 'Escuchar'}
          </button>
        )}

        {steps.length > 0 && (
          <button className={styles.secondary} onClick={restart} type="button">
            <FontAwesomeIcon icon={faRotateRight} /> De nuevo
          </button>
        )}
      </div>

      {showSheet && phase === 'right' && (
        <div className={styles.sheetCard}>
          <p className={styles.sheetLabel}>Esto fue lo que tocaste</p>
          <div ref={sheetRef} />
        </div>
      )}
    </div>
  );
}
