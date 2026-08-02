'use client';

import { useEffect, useMemo, useRef } from 'react';
import { WHITE_KEYS, BLACK_KEYS } from '@/lib/piano-player/songs';
import { midiToSolfege } from '@/lib/piano-player/noteNames';
import styles from './PianoKeyboard.module.scss';

type PianoKeyboardProps = {
  /**
   * Fired on pointer-down, i.e. as soon as the key is struck. Omit it for a
   * read-only keyboard — one that shows a note rather than accepting one. In
   * that mode the keys are plain elements and the whole keyboard is hidden
   * from screen readers, since sixty unusable buttons help nobody; caption it
   * with text instead.
   */
  onPress?: (midi: number) => void;
  /**
   * Range to draw, widened outward to whole octaves so the keyboard always
   * starts on a Do and ends on a Si. Defaults to the one-octave house
   * keyboard, which is what every game uses.
   */
  fromMidi?: number;
  toMidi?: number;
  /** The key the app is sounding right now. */
  litMidi?: number | null;
  /** Keys the student is holding. */
  pressedMidi?: ReadonlySet<number>;
  /** Outlined as "play this one next". */
  hintMidi?: number | null;
  /** "Play *this* one" — louder than `hintMidi`, for a guided exercise. */
  targetMidi?: number | null;
  /** Heard, but not the note that was asked for. */
  wrongMidi?: number | null;
  /**
   * Keys this screen is about, tinted quietly — the notes an exercise will
   * ask for, or the ones it has already dealt with. A tint rather than a
   * highlight, so it never competes with `targetMidi`.
   */
  markedMidi?: ReadonlySet<number>;
  /** Scrolled into view whenever it changes, for ranges wider than the screen. */
  scrollToMidi?: number | null;
  /** Black keys become inert — for games that only use the naturals. */
  naturalsOnly?: boolean;
  disabled?: boolean;
  /** `letter` is the QWERTY key, `solfege` the note name. */
  labels?: 'letter' | 'solfege' | 'both' | 'none';
  className?: string;
};

const WHITE_SEMITONES = new Set([0, 2, 4, 5, 7, 9, 11]);

/** QWERTY letters exist only for the octave the games play in. */
const LETTERS = new Map(
  [...WHITE_KEYS, ...BLACK_KEYS].map((k) => [k.midi, k.label]),
);

const isWhite = (midi: number) => WHITE_SEMITONES.has(((midi % 12) + 12) % 12);

interface Key {
  midi: number;
  letter?: string;
  /**
   * Black keys only: how many white keys lie to their left. The stylesheet
   * turns that into an offset, so the layout holds at any width or range
   * instead of depending on hand-set pixel positions for one fixed octave.
   */
  slot?: number;
}

/**
 * The house piano.
 *
 * Same proportions and same ivory everywhere — the point of this component is
 * that a student sees the *same* instrument whichever exercise they open, so
 * the piano player, the games and the calibration wizard all render through
 * here rather than growing their own.
 */
export default function PianoKeyboard({
  onPress,
  fromMidi = 60,
  toMidi = 71,
  litMidi = null,
  pressedMidi,
  hintMidi = null,
  targetMidi = null,
  wrongMidi = null,
  markedMidi,
  scrollToMidi = null,
  naturalsOnly = false,
  disabled = false,
  labels = 'both',
  className,
}: PianoKeyboardProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const scrollTargetRef = useRef<HTMLDivElement | HTMLButtonElement>(null);

  const { whites, blacks, octaves } = useMemo(() => {
    const low = Math.floor(Math.min(fromMidi, toMidi) / 12) * 12;
    const high = Math.ceil((Math.max(fromMidi, toMidi) + 1) / 12) * 12 - 1;

    const whiteKeys: Key[] = [];
    const blackKeys: Key[] = [];

    for (let midi = low; midi <= high; midi += 1) {
      const letter = LETTERS.get(midi);
      if (isWhite(midi)) whiteKeys.push({ midi, letter });
      // A black key always sits on the boundary after the white keys emitted
      // so far, which is exactly the count at this point in the walk.
      else blackKeys.push({ midi, letter, slot: whiteKeys.length });
    }

    return {
      whites: whiteKeys,
      blacks: blackKeys,
      octaves: (high + 1 - low) / 12,
    };
  }, [fromMidi, toMidi]);

  // A multi-octave keyboard does not fit a phone, so it scrolls — and the key
  // being asked for is brought into view, otherwise the highlight can sit off
  // screen and the keyboard teaches nothing.
  useEffect(() => {
    const scroller = scrollerRef.current;
    const key = scrollTargetRef.current;
    if (!scroller || !key || scrollToMidi === null) return;

    scroller.scrollTo({
      left: Math.max(
        0,
        key.offsetLeft - scroller.clientWidth / 2 + key.offsetWidth / 2,
      ),
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'auto'
        : 'smooth',
    });
  }, [scrollToMidi]);

  const interactive = typeof onPress === 'function';

  const keyClass = (midi: number, extra?: string) =>
    [
      styles.key,
      extra,
      midi === litMidi ? styles.lit : '',
      pressedMidi?.has(midi) ? styles.pressed : '',
      midi === hintMidi ? styles.hint : '',
      midi === targetMidi ? styles.target : '',
      midi === wrongMidi ? styles.wrong : '',
      // The target outranks a tick: a note being re-taken is still the one to
      // play, and showing it as finished would send the student to the wrong key.
      markedMidi?.has(midi) && midi !== targetMidi ? styles.marked : '',
    ]
      .filter(Boolean)
      .join(' ');

  const label = (midi: number, letter?: string) => {
    if (labels === 'none') return null;
    const wantsLetter = labels !== 'solfege' && letter !== undefined;
    const wantsNote = labels !== 'letter';
    if (!wantsLetter && !wantsNote) return null;

    return (
      <span className={styles.keyLabel}>
        {wantsNote && (
          <span className={styles.keyNote}>
            {/* Over a single octave every Do looks alike, so those carry the
                number and the rest stay uncluttered. */}
            {midiToSolfege(midi, { octave: octaves > 1 && midi % 12 === 0 })}
          </span>
        )}
        {wantsLetter && <span className={styles.keyLetter}>{letter}</span>}
      </span>
    );
  };

  const renderKey = (key: Key, black: boolean) => {
    const inert = black && naturalsOnly;
    const className = keyClass(key.midi, black ? styles.black : undefined);
    const ref = key.midi === scrollToMidi ? scrollTargetRef : undefined;
    const style = black
      ? ({ ['--slot' as string]: key.slot } as React.CSSProperties)
      : undefined;

    if (!interactive) {
      return (
        <div
          className={className}
          data-midi={key.midi}
          key={key.midi}
          ref={ref as React.Ref<HTMLDivElement>}
          style={style}
        >
          {label(key.midi, key.letter)}
        </div>
      );
    }

    return (
      <button
        aria-hidden={inert}
        aria-label={`Tocar ${midiToSolfege(key.midi, { octave: true })}`}
        className={className}
        data-midi={key.midi}
        disabled={disabled || inert}
        key={key.midi}
        // Pointer-down, not click: a piano sounds when the key goes down.
        onPointerDown={() => !inert && onPress(key.midi)}
        ref={ref as React.Ref<HTMLButtonElement>}
        style={style}
        tabIndex={inert ? -1 : undefined}
        type="button"
      >
        {label(key.midi, key.letter)}
      </button>
    );
  };

  return (
    <div
      // Read-only keyboards are decoration for a screen reader: the note to
      // play is in the caption next to them, in words.
      aria-hidden={!interactive}
      className={[
        styles.frame,
        // Only a range too wide for the screen becomes a scroll container —
        // the one-octave keyboard the games use keeps its exact old box.
        octaves > 1 ? styles.scroller : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      ref={scrollerRef}
    >
      <div
        className={styles.piano}
        style={{ ['--white-count' as string]: whites.length }}
      >
        {whites.map((key) => renderKey(key, false))}
        {blacks.map((key) => renderKey(key, true))}
      </div>
    </div>
  );
}
