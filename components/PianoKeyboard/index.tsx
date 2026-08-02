'use client';

import { WHITE_KEYS, BLACK_KEYS } from '@/lib/piano-player/songs';
import { midiToSolfege } from '@/lib/piano-player/noteNames';
import styles from './PianoKeyboard.module.scss';

type PianoKeyboardProps = {
  /** Fired on pointer-down, i.e. as soon as the key is struck. */
  onPress: (midi: number) => void;
  /** The key the app is sounding right now. */
  litMidi?: number | null;
  /** Keys the student is holding. */
  pressedMidi?: ReadonlySet<number>;
  /** Outlined as "play this one next". */
  hintMidi?: number | null;
  /** Black keys become inert — for games that only use the naturals. */
  naturalsOnly?: boolean;
  disabled?: boolean;
  /** `letter` is the QWERTY key, `solfege` the note name. */
  labels?: 'letter' | 'solfege' | 'both';
  className?: string;
};

/**
 * The house piano.
 *
 * One octave, same proportions and same ivory as the piano player's keyboard —
 * the point of this component is that a student sees the *same* instrument
 * whichever exercise they open.
 */
export default function PianoKeyboard({
  onPress,
  litMidi = null,
  pressedMidi,
  hintMidi = null,
  naturalsOnly = false,
  disabled = false,
  labels = 'both',
  className,
}: PianoKeyboardProps) {
  const keyClass = (midi: number, extra?: string) =>
    [
      styles.key,
      extra,
      midi === litMidi ? styles.lit : '',
      pressedMidi?.has(midi) ? styles.pressed : '',
      midi === hintMidi ? styles.hint : '',
    ]
      .filter(Boolean)
      .join(' ');

  const label = (midi: number, letter: string) => (
    <span className={styles.keyLabel}>
      {labels !== 'letter' && (
        <span className={styles.keyNote}>{midiToSolfege(midi)}</span>
      )}
      {labels !== 'solfege' && (
        <span className={styles.keyLetter}>{letter}</span>
      )}
    </span>
  );

  return (
    <div className={[styles.piano, className].filter(Boolean).join(' ')}>
      {WHITE_KEYS.map((key) => (
        <button
          aria-label={`Tocar ${midiToSolfege(key.midi, { octave: true })}`}
          className={keyClass(key.midi)}
          data-midi={key.midi}
          disabled={disabled}
          key={key.midi}
          // Pointer-down, not click: a piano sounds when the key goes down.
          onPointerDown={() => onPress(key.midi)}
          type="button"
        >
          {label(key.midi, key.label)}
        </button>
      ))}

      {BLACK_KEYS.map((key) => (
        <button
          aria-hidden={naturalsOnly}
          aria-label={`Tocar ${midiToSolfege(key.midi, { octave: true })}`}
          className={keyClass(key.midi, styles.black)}
          data-key-position={key.afterWhiteIndex}
          data-midi={key.midi}
          disabled={disabled || naturalsOnly}
          key={key.midi}
          onPointerDown={() => !naturalsOnly && onPress(key.midi)}
          tabIndex={naturalsOnly ? -1 : undefined}
          type="button"
        >
          {label(key.midi, key.label)}
        </button>
      ))}
    </div>
  );
}
