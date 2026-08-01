'use client';

import { useEffect, useMemo, useRef } from 'react';
import { midiToSolfege } from '@/lib/piano-player/noteNames';
import styles from './CalibrationKeyboard.module.scss';

type CalibrationKeyboardProps = {
  /** The note the student is being asked to play. */
  targetMidi: number;
  /** What the microphone is hearing right now, if anything. */
  detectedMidi?: number | null;
  /** Every note in the plan, used to size the keyboard and mark what's done. */
  targets: readonly number[];
  /** How many of `targets` have already been captured. */
  completedCount: number;
};

const WHITE_SEMITONES = [0, 2, 4, 5, 7, 9, 11];
const BLACK_SEMITONES = [1, 3, 6, 8, 10];

/**
 * Offset of each black key from the left edge of the white key it follows,
 * as a fraction of a white key's width. Black keys are not evenly spaced —
 * they cluster toward the note they sharpen — so these are hand-set rather
 * than derived.
 */
const BLACK_OFFSET: Record<number, number> = {
  1: 0.68, // Do#
  3: 1.78, // Re#
  6: 3.62, // Fa#
  8: 4.75, // Sol#
  10: 5.85, // La#
};

interface WhiteKey {
  midi: number;
  index: number;
}

interface BlackKey {
  midi: number;
  left: number;
}

function isWhite(midi: number): boolean {
  return WHITE_SEMITONES.includes(((midi % 12) + 12) % 12);
}

/** Widen the range to whole octaves so the keyboard starts and ends on a Do. */
function octaveBounds(targets: readonly number[]): [number, number] {
  const low = Math.min(...targets);
  const high = Math.max(...targets);
  return [Math.floor(low / 12) * 12, Math.ceil((high + 1) / 12) * 12 - 1];
}

/**
 * A real keyboard showing which key to press.
 *
 * The wizard used to name the note and nothing else, which assumes the student
 * can already find "Do4" on the instrument — precisely the assumption a
 * beginner-focused school should not make. The whole point of calibrating is
 * that the app then hears *them*, so failing at step one because they played
 * the wrong octave is the worst outcome.
 */
export default function CalibrationKeyboard({
  targetMidi,
  detectedMidi,
  targets,
  completedCount,
}: CalibrationKeyboardProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef<HTMLDivElement>(null);

  const { whites, blacks, whiteCount } = useMemo(() => {
    const [low, high] = octaveBounds(targets.length > 0 ? targets : [60]);
    const whiteKeys: WhiteKey[] = [];
    const blackKeys: BlackKey[] = [];

    let whiteIndex = 0;
    for (let midi = low; midi <= high; midi++) {
      const semitone = ((midi % 12) + 12) % 12;
      if (isWhite(midi)) {
        whiteKeys.push({ midi, index: whiteIndex });
        whiteIndex += 1;
        continue;
      }
      if (BLACK_SEMITONES.includes(semitone)) {
        // Whites elapsed before this octave, plus the in-octave offset.
        const octaveStart = Math.floor((midi - low) / 12) * 7;
        blackKeys.push({ midi, left: octaveStart + BLACK_OFFSET[semitone] });
      }
    }

    return {
      whites: whiteKeys,
      blacks: blackKeys,
      whiteCount: whiteKeys.length,
    };
  }, [targets]);

  // A four-octave keyboard does not fit a phone, so it scrolls — and the target
  // is brought into view on every step, otherwise the highlight can sit off
  // screen and the component teaches nothing.
  useEffect(() => {
    const scroller = scrollerRef.current;
    const key = targetRef.current;
    if (!scroller || !key) return;

    const wanted =
      key.offsetLeft - scroller.clientWidth / 2 + key.offsetWidth / 2;
    scroller.scrollTo({
      left: Math.max(0, wanted),
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'auto'
        : 'smooth',
    });
  }, [targetMidi]);

  const done = new Set(targets.slice(0, completedCount));
  // Only worth flagging a wrong note if it is not the one we asked for.
  const wrongNote =
    detectedMidi !== null && detectedMidi !== undefined
      ? detectedMidi !== targetMidi
      : false;

  const keyClass = (midi: number, base: string) => {
    const classes = [base];
    if (midi === targetMidi) classes.push(styles.target);
    else if (midi === detectedMidi)
      classes.push(wrongNote ? styles.wrong : styles.heard);
    else if (done.has(midi)) classes.push(styles.done);
    return classes.join(' ');
  };

  return (
    <div className={styles.root}>
      <div className={styles.scroller} ref={scrollerRef}>
        <div
          className={styles.keyboard}
          // Width is driven by the white-key count so the black keys, which are
          // positioned in white-key units, always land correctly.
          style={{ ['--white-count' as string]: whiteCount }}
        >
          {whites.map((key) => (
            <div
              className={keyClass(key.midi, styles.whiteKey)}
              key={key.midi}
              ref={key.midi === targetMidi ? targetRef : undefined}
            >
              <span className={styles.keyLabel}>
                {midiToSolfege(key.midi, {
                  // Only the Dos carry an octave, so the row of labels stays
                  // readable while still anchoring the student.
                  octave: key.midi % 12 === 0,
                })}
              </span>
            </div>
          ))}

          {blacks.map((key) => (
            <div
              className={keyClass(key.midi, styles.blackKey)}
              key={key.midi}
              ref={key.midi === targetMidi ? targetRef : undefined}
              style={{ ['--slot' as string]: key.left }}
            />
          ))}
        </div>
      </div>

      <p className={styles.legend}>
        {wrongNote ? (
          <>
            Estás tocando{' '}
            <strong className={styles.legendWrong}>
              {midiToSolfege(detectedMidi as number, { octave: true })}
            </strong>{' '}
            — buscá{' '}
            <strong className={styles.legendTarget}>
              {midiToSolfege(targetMidi, { octave: true })}
            </strong>
          </>
        ) : (
          <>
            Tocá la tecla marcada en verde:{' '}
            <strong className={styles.legendTarget}>
              {midiToSolfege(targetMidi, { octave: true })}
            </strong>
          </>
        )}
      </p>
    </div>
  );
}
