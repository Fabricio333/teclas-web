/**
 * Note names for display.
 *
 * Argentine music education is fixed-do: students read and say DO RE MI, not
 * C D E. Everything a student reads should use it.
 *
 * Deliberately separate from `midiNumberToNote` in `./Midi`, which stays
 * English because its output doubles as a *filename* — `/samples/mp3/C4.mp3` —
 * and as the note string handed to Tone.js. Mixing the two would break audio,
 * so the rule is: `midiNumberToNote` for machines, this module for humans.
 */

const SOLFEGE_SHARP = [
  'Do',
  'Do#',
  'Re',
  'Re#',
  'Mi',
  'Fa',
  'Fa#',
  'Sol',
  'Sol#',
  'La',
  'La#',
  'Si',
];

const SOLFEGE_FLAT = [
  'Do',
  'Reb',
  'Re',
  'Mib',
  'Mi',
  'Fa',
  'Solb',
  'Sol',
  'Lab',
  'La',
  'Sib',
  'Si',
];

export interface SolfegeOptions {
  /** Append the scientific octave number, e.g. `Do4`. */
  octave?: boolean;
  /** Name the black keys as flats (Reb) instead of sharps (Do#). */
  flats?: boolean;
}

/**
 * MIDI number to a fixed-do name.
 *
 * The octave number is the scientific one, so middle C (60) is `Do4` — the
 * same number the English name carried, which keeps the two directly
 * comparable when debugging.
 */
export function midiToSolfege(
  midi: number,
  { octave = false, flats = false }: SolfegeOptions = {},
): string {
  if (!Number.isFinite(midi) || midi < 0 || midi > 127) return '';

  const names = flats ? SOLFEGE_FLAT : SOLFEGE_SHARP;
  const name = names[((midi % 12) + 12) % 12];

  return octave ? `${name}${Math.floor(midi / 12) - 1}` : name;
}

/**
 * Rewrites an English note name (`C4`, `F#3`, `Bb2`) as fixed-do.
 *
 * For the handful of places that already hold a letter name as data — the
 * QWERTY key map's `note` fields, for instance — rather than a MIDI number.
 * Returns the input unchanged if it doesn't parse, so a bad value degrades to
 * the old label instead of to an empty string.
 */
export function letterNameToSolfege(name: string): string {
  const match = /^([A-G])([#b]?)(-?\d+)?$/.exec(name.trim());
  if (!match) return name;

  const [, letter, accidental, octave] = match;
  const semitone: Record<string, number> = {
    C: 0,
    D: 2,
    E: 4,
    F: 5,
    G: 7,
    A: 9,
    B: 11,
  };

  let index = semitone[letter];
  if (accidental === '#') index += 1;
  if (accidental === 'b') index -= 1;

  const names = accidental === 'b' ? SOLFEGE_FLAT : SOLFEGE_SHARP;
  const solfege = names[((index % 12) + 12) % 12];

  return octave === undefined ? solfege : `${solfege}${octave}`;
}
