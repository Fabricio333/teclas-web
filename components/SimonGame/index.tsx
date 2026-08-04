'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faEye,
  faEyeSlash,
  faPlay,
  faRotateRight,
} from '@fortawesome/free-solid-svg-icons';
import { midiNumberToNote } from '@/lib/piano-player/Midi';
import { WHITE_KEYS, BLACK_KEYS } from '@/lib/piano-player/songs';
import { letterNameToSolfege } from '@/lib/piano-player/noteNames';
import PianoKeyboard from '@/components/PianoKeyboard';
import styles from './SimonGame.module.scss';

/**
 * "Simon musical" — the app plays a sequence, the student plays it back.
 *
 * Deliberately small: one button, one piano, one line of text telling you what
 * to do. The design rule throughout is that a child should be able to start
 * playing without being taught anything and without setting anything up.
 */

type Phase = 'idle' | 'listening' | 'answering' | 'right' | 'lost';

/** Beats. Two values only — a child can hear "short" and "long". */
type Beat = 1 | 2;

interface Step {
  midi: number;
  beats: Beat;
}

/** White keys of one octave: Do Re Mi Fa Sol La Si. No accidentals — the game
 *  is about listening, and seven choices is already plenty. */
const POOL = WHITE_KEYS.map((k) => k.midi);

const BEAT_MS = 800;

/**
 * Share of the beat the note is actually held for.
 *
 * The sequence used to be legato — every note filled its whole beat, so one
 * ran straight into the next and a child heard a smear rather than a count of
 * notes. The rest is silence, and it is what makes each note land separately.
 */
const NOTE_HOLD = 0.78;
/** Round at which long notes start appearing. The first rounds are pure
 *  pitch, so the rhythm rule is met only once the ear part is comfortable. */
const RHYTHM_FROM_ROUND = 3;

const BEATS_PER_BAR = 4;

const PHASE_TEXT: Record<Phase, string> = {
  idle: 'Tocá Empezar y prestá atención',
  listening: 'Escuchá…',
  answering: 'Tu turno',
  right: '¡Muy bien!',
  lost: 'Se terminó',
};

/** Pause on "¡Muy bien!" before the next round starts on its own. Long enough
 *  to read the notation that just appeared, short enough not to drag. */
const ROUND_GAP_MS = 1500;

/** Points per note repeated correctly. */
const POINTS_PER_NOTE = 10;

/**
 * Next note of the sequence, chosen relative to the one before it.
 *
 * Picking uniformly from the seven keys sounds like nothing: one note in seven
 * repeats the previous one, and most of the rest are its neighbours, so the
 * melody crawls up and down the middle of the keyboard. Weighting by distance
 * makes it move — and a sequence that leaps has to be *heard*, where a sequence
 * that walks can be guessed by sliding a finger along the keys.
 *
 * The previous note is never repeated: two identical notes in a row are the one
 * case where a student cannot tell from listening whether they missed a step.
 */
function randomMidi(previous: number | null): number {
  if (previous === null) return POOL[Math.floor(Math.random() * POOL.length)];

  const previousDegree = POOL.indexOf(previous);
  const candidates = POOL.flatMap((midi, degree) => {
    const distance = Math.abs(degree - previousDegree);
    if (distance === 0) return [];
    // A fourth or wider is three times as likely as a neighbouring note.
    const weight = distance >= 3 ? 3 : distance === 2 ? 2 : 1;
    return Array<number>(weight).fill(midi);
  });

  return candidates[Math.floor(Math.random() * candidates.length)];
}

function randomStep(
  round: number,
  beatsSoFar: number,
  previous: number | null,
): Step {
  const midi = randomMidi(previous);
  // A long note starting on the last beat of a bar would have to be split
  // across the barline, which neither the notation nor the dots can express.
  const roomInBar = BEATS_PER_BAR - (beatsSoFar % BEATS_PER_BAR);
  const canBeLong = roomInBar >= 2;
  const beats: Beat =
    canBeLong && round >= RHYTHM_FROM_ROUND && Math.random() < 0.4 ? 2 : 1;
  return { midi, beats };
}

const ABC_LETTER: Record<number, string> = {
  60: 'C',
  62: 'D',
  64: 'E',
  65: 'F',
  67: 'G',
  69: 'A',
  71: 'B',
};

/**
 * ABC for the notation.
 *
 * Every note used to go into a single bar — `C D E F G A B |` and on — so from
 * about round five the score was one absurdly overfull measure stretched
 * across the page. Barred properly now, with the last bar padded with a rest
 * so it is a legal 4/4 measure rather than a truncated one.
 *
 * `nextRound` guarantees a long note never starts on the last beat of a bar,
 * so no note ever needs splitting across a barline.
 */
function sequenceToAbc(steps: Step[]): string {
  const bars: string[] = [];
  let bar: string[] = [];
  let beats = 0;

  for (const step of steps) {
    bar.push(`${ABC_LETTER[step.midi] ?? 'C'}${step.beats === 2 ? '2' : ''}`);
    beats += step.beats;
    if (beats >= BEATS_PER_BAR) {
      bars.push(bar.join(' '));
      bar = [];
      beats = 0;
    }
  }

  if (bar.length > 0) {
    const rest = BEATS_PER_BAR - beats;
    if (rest > 0) bar.push(`z${rest > 1 ? rest : ''}`);
    bars.push(bar.join(' '));
  }

  return ['X:1', 'M:4/4', 'L:1/4', 'K:C', `${bars.join(' | ')} |`].join('\n');
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
  const [score, setScore] = useState(0);
  const [showSheet, setShowSheet] = useState(true);
  /** Which mistake ended the run, so the game-over card can say. */
  const [lostOn, setLostOn] = useState<'note' | 'rhythm'>('note');
  /** The sequence to draw. Held separately from `steps` so the notation stays
   *  on screen through the gap between rounds instead of flashing. */
  const [sheetSteps, setSheetSteps] = useState<Step[]>([]);

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
        (beats * BEAT_MS * NOTE_HOLD) / 1000,
      );
    },
    [getSampler],
  );

  const playSequence = useCallback(
    async (list: Step[]) => {
      clearTimers();
      setPhase('listening');
      await getSampler();

      // Lead-in. Long enough to read "Escuchá…" and look up at the keyboard
      // before the first note, which at 250ms had already gone by.
      let at = 500;
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

  // `press` schedules the next round but is declared first, so it goes through
  // a ref rather than forcing the two callbacks into a circular dependency.
  const nextRoundRef = useRef<(() => void) | null>(null);

  const nextRound = useCallback(() => {
    const played = stepsRef.current;
    const beatsSoFar = played.reduce((sum, s) => sum + s.beats, 0);
    const previous = played.length ? played[played.length - 1].midi : null;
    const list = [
      ...played,
      randomStep(played.length + 1, beatsSoFar, previous),
    ];
    setSteps(list);
    void playSequence(list);
  }, [playSequence]);

  nextRoundRef.current = nextRound;

  const restart = useCallback(() => {
    clearTimers();
    setSteps([]);
    setPhase('idle');
    setPlayingIndex(null);
    setAnswered(0);
    setScore(0);
    setSheetSteps([]);
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
        setLostOn('note');
        setSheetSteps(list);
        setPhase('lost');
        return;
      }

      answerRef.current = index + 1;
      setAnswered(index + 1);
      setScore((s) => s + POINTS_PER_NOTE);
      if (answerRef.current < list.length) return;

      // Whole sequence played back. The notes were right; the shape of the
      // rhythm is the last thing to check.
      if (!rhythmMatches(list, onsetsRef.current)) {
        clearTimers();
        setLostOn('rhythm');
        setSheetSteps(list);
        setPhase('lost');
        return;
      }

      setPhase('right');
      setBest((b) => Math.max(b, list.length));
      setSheetSteps(list);
      // The run continues on its own from here — no button to press between
      // rounds, which is what makes it feel like a game rather than a drill.
      timersRef.current.push(
        setTimeout(() => nextRoundRef.current?.(), ROUND_GAP_MS),
      );
    },
    // `playSequence` is no longer called here — a mistake now ends the run
    // rather than replaying the sequence.
    [clearTimers, sound],
  );

  // Notation of what has been played so far. Driven by `sheetSteps` rather
  // than by the phase, so it stays on screen through the gap between rounds
  // instead of flashing for a moment and vanishing.
  useEffect(() => {
    if (sheetSteps.length === 0 || !showSheet) return;
    const host = sheetRef.current;
    if (!host) return;

    let cancelled = false;
    void import('abcjs').then((mod) => {
      if (cancelled || !sheetRef.current) return;
      const abcjs = (mod as { default?: typeof mod }).default ?? mod;
      abcjs.renderAbc(sheetRef.current, sequenceToAbc(sheetSteps), {
        // Matches the piano player's options, and makes the rendered notes
        // addressable so the notation can actually be asserted on.
        add_classes: true,
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
  }, [sheetSteps, showSheet]);

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
    <section className={styles.gameSection}>
      {/* Same shell as the other two practice apps: header, controls panel,
          score cards, prompt area, piano, keyboard reference. */}
      <div className={styles.header}>
        <h2 className={styles.title}>Simon musical</h2>
        <p className={styles.subtitle}>
          Escuchá la melodía y repetila en el piano. Cada ronda suma una nota.
        </p>
      </div>

      <div className={styles.controlsPanel}>
        <div className={styles.controls}>
          <button
            className={styles.restartBtn}
            disabled={steps.length === 0}
            onClick={restart}
            type="button"
          >
            <FontAwesomeIcon icon={faRotateRight} /> Reiniciar
          </button>

          <button
            aria-pressed={showSheet}
            className={`${styles.restartBtn} ${showSheet ? styles.toggleOn : ''}`}
            onClick={() => setShowSheet((v) => !v)}
            type="button"
          >
            <FontAwesomeIcon icon={showSheet ? faEye : faEyeSlash} /> Partitura
          </button>
        </div>
      </div>

      <div className={styles.scoreCards}>
        <div className={`${styles.scoreCard} ${styles.scoreCardBlue}`}>
          <span className={styles.scoreCardLabel}>Puntos</span>
          <span className={styles.scoreCardValue}>{score}</span>
        </div>
        <div className={`${styles.scoreCard} ${styles.scoreCardAmber}`}>
          <span className={styles.scoreCardLabel}>Ronda</span>
          <span className={styles.scoreCardValue}>{steps.length || 1}</span>
        </div>
        <div className={`${styles.scoreCard} ${styles.scoreCardGreen}`}>
          <span className={styles.scoreCardLabel}>Mejor</span>
          <span className={styles.scoreCardValue}>{best}</span>
        </div>
      </div>

      <div className={styles.promptArea}>
        <p className={styles.noteCounter}>
          {steps.length === 0
            ? 'Ronda 1'
            : `Ronda ${steps.length} \u00B7 ${steps.length} ${
                steps.length === 1 ? 'nota' : 'notas'
              }`}
        </p>

        <button
          className={styles.playBtn}
          disabled={busy || phase === 'right'}
          onClick={() =>
            steps.length === 0 || phase === 'lost'
              ? (restart(), nextRound())
              : playSequence(steps)
          }
          type="button"
        >
          <FontAwesomeIcon icon={faPlay} />{' '}
          {steps.length === 0 || phase === 'lost'
            ? 'Empezar'
            : 'Escuchar de nuevo'}
        </button>

        <p className={styles.noteNameDisplay} role="status">
          {PHASE_TEXT[phase]}
        </p>

        {/* One dot per note — wide for a long one, so the rhythm is visible as
            well as audible. */}
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
      </div>

      {/* The house keyboard, the same one the piano player shows. */}
      <div className={styles.pianoWrapper}>
        <PianoKeyboard
          disabled={busy}
          labels="both"
          litMidi={
            playingIndex !== null ? (steps[playingIndex]?.midi ?? null) : null
          }
          naturalsOnly
          onPress={press}
        />
      </div>

      {/*
        The card appears as soon as the toggle is on, even with nothing to
        draw yet. Rendering nothing until the first round was completed made
        the toggle look broken: you press "Partitura" and the page does not
        change, because the notation only exists once you have played
        something back.
      */}
      {showSheet && (
        <div className={styles.sheetCard}>
          <p className={styles.sheetLabel}>
            {sheetSteps.length === 0
              ? 'Partitura'
              : phase === 'lost'
                ? 'La melodía era así'
                : 'Lo que llevás tocado'}
          </p>
          {sheetSteps.length === 0 ? (
            <p className={styles.sheetEmpty}>
              Acá vas a ver la melodía escrita cuando completes una ronda.
            </p>
          ) : (
            <div ref={sheetRef} />
          )}
        </div>
      )}

      {/* Game over. The run is continuous now, so this is the only place a
          final score can be shown. */}
      <div
        className={`${styles.done} ${phase === 'lost' ? styles.doneVisible : ''}`}
      >
        <div className={styles.doneCard}>
          <span className={styles.doneIcon}>{'\u266A'}</span>
          <span className={styles.doneText}>
            {lostOn === 'rhythm'
              ? 'Las notas estaban bien, falló el ritmo'
              : 'Esa no era la nota'}
          </span>
          <span className={styles.doneScore}>
            {score} puntos {'\u00B7'} ronda {steps.length}
            {best > steps.length ? ` \u00B7 mejor ${best}` : ''}
          </span>
          <div className={styles.doneActions}>
            <button
              className={`${styles.doneBtn} ${styles.doneBtnPrimary}`}
              onClick={() => {
                restart();
                nextRound();
              }}
              type="button"
            >
              Jugar de nuevo
            </button>
          </div>
        </div>
      </div>

      <div className={styles.keyboardRef}>
        <span className={styles.keyboardRefTitle}>Teclas:</span>
        {WHITE_KEYS.map((k) => (
          <span key={k.midi} className={styles.kbdGroup}>
            <kbd className={styles.kbd}>{k.label}</kbd>
            <span className={styles.kbdNote}>
              {letterNameToSolfege(k.note)}
            </span>
          </span>
        ))}
      </div>
    </section>
  );
}
