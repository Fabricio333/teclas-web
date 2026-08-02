/**
 * MuseScore (.mscz) -> piano-player `Level`.
 *
 *   node scripts/mscz-to-level.mjs "Allegro Suzuki.mscz" --id=allegro --name=Allegro
 *
 * Prints a `Level` object ready to paste into `lib/piano-player/songs.ts`.
 *
 * A .mscz is a ZIP holding MuseScore's own XML, in which `<Note><pitch>` is
 * already the MIDI number the game wants. The work is therefore not reading
 * pitches, it is producing an `abc` string whose note elements line up
 * one-for-one with the `notes` array — see the comment on `Level.notes`.
 * Anything that would break that pairing (ties, tuplets, chords) is reported
 * rather than silently flattened, because each one is a musical decision.
 *
 * Zero dependencies: zlib reads the archive, the XML here is small enough to
 * walk with a hand-rolled reader, and abcjs (already a project dependency)
 * verifies the result.
 */

import { inflateRawSync } from 'node:zlib';
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';

// ---------------------------------------------------------------- zip

/** Entries of a ZIP, by name. Handles the only two methods .mscz uses. */
function readZip(buf) {
  // Walk back from the end for the End Of Central Directory record; the
  // comment field is variable length, so its offset is not fixed.
  let eocd = buf.length - 22;
  while (eocd >= 0 && buf.readUInt32LE(eocd) !== 0x06054b50) eocd -= 1;
  if (eocd < 0) throw new Error('not a zip file (no EOCD record)');

  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const entries = new Map();

  for (let i = 0; i < count; i += 1) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error('bad central dir');
    const method = buf.readUInt16LE(p + 10);
    const compressedSize = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const localOffset = buf.readUInt32LE(p + 42);
    const name = buf.toString('utf8', p + 46, p + 46 + nameLen);

    // The local header repeats the name/extra lengths, and its extra field
    // may differ in length from the central one, so re-read them there.
    const lNameLen = buf.readUInt16LE(localOffset + 26);
    const lExtraLen = buf.readUInt16LE(localOffset + 28);
    const start = localOffset + 30 + lNameLen + lExtraLen;
    const raw = buf.subarray(start, start + compressedSize);

    entries.set(name, method === 0 ? raw : inflateRawSync(raw));
    p += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

// ---------------------------------------------------------------- xml

/**
 * Minimal XML -> {tag, attrs, children, text} tree.
 *
 * Enough for .mscx: elements, attributes, text and self-closing tags. No
 * namespaces, entities beyond the five predefined ones, or CDATA — none of
 * which MuseScore emits in the elements this reads.
 */
function parseXml(src) {
  const root = { tag: '#root', attrs: {}, children: [], text: '' };
  const stack = [root];
  const tagRe =
    /<(\/)?([A-Za-z_][\w.-]*)((?:\s+[\w.:-]+\s*=\s*"[^"]*")*)\s*(\/)?>/g;
  let match;
  let last = 0;

  while ((match = tagRe.exec(src)) !== null) {
    const [full, closing, tag, attrSrc, selfClosing] = match;
    const node = stack[stack.length - 1];
    node.text += decode(src.slice(last, match.index));
    last = match.index + full.length;

    if (closing) {
      stack.pop();
      continue;
    }
    const child = { tag, attrs: {}, children: [], text: '' };
    for (const a of attrSrc.matchAll(/([\w.:-]+)\s*=\s*"([^"]*)"/g)) {
      child.attrs[a[1]] = decode(a[2]);
    }
    node.children.push(child);
    if (!selfClosing) stack.push(child);
  }
  return root;
}

const decode = (s) =>
  s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');

const kids = (node, tag) => node.children.filter((c) => c.tag === tag);
const kid = (node, tag) => node.children.find((c) => c.tag === tag);
const textOf = (node, tag) => kid(node, tag)?.text.trim();
const descendants = (node, tag) => {
  const out = [];
  const walk = (n) => {
    if (n.tag === tag) out.push(n);
    n.children.forEach(walk);
  };
  walk(node);
  return out;
};

// ---------------------------------------------------------------- music

/** Duration in quarter notes, as an exact fraction. */
const DURATIONS = {
  breve: [8, 1],
  whole: [4, 1],
  half: [2, 1],
  quarter: [1, 1],
  eighth: [1, 2],
  '16th': [1, 4],
  '32nd': [1, 8],
  '64th': [1, 16],
  '128th': [1, 32],
};

const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const SEMITONES = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const KEY_NAMES = {
  '-7': 'Cb',
  '-6': 'Gb',
  '-5': 'Db',
  '-4': 'Ab',
  '-3': 'Eb',
  '-2': 'Bb',
  '-1': 'F',
  0: 'C',
  1: 'G',
  2: 'D',
  3: 'A',
  4: 'E',
  5: 'B',
  6: 'F#',
  7: 'C#',
};

/**
 * Note letter and alteration from MuseScore's tonal pitch class, so an F# is
 * spelled F# and a Gb is spelled Gb rather than both collapsing to one
 * enharmonic guess. tpc 14 is a natural C; each step is a fifth.
 */
function spell(tpc) {
  const fifths = tpc - 14;
  return {
    letter: LETTERS[(((fifths * 4) % 7) + 7) % 7],
    alter: Math.floor((fifths + 1) / 7),
  };
}

/** ABC pitch token, e.g. 60 -> 'C', 72 -> 'c', 48 -> 'C,'. */
function abcPitch(letter, alter, midi) {
  const octave = (midi - alter - SEMITONES[letter]) / 12 - 1;
  if (!Number.isInteger(octave)) {
    throw new Error(`cannot place ${letter} (alter ${alter}) at midi ${midi}`);
  }
  if (octave >= 5) return letter.toLowerCase() + "'".repeat(octave - 5);
  return letter + ','.repeat(Math.max(0, 4 - octave));
}

/** ABC length suffix for a duration expressed in quarters, given `L:1/4`. */
function abcLength([num, den]) {
  if (den === 1) return num === 1 ? '' : String(num);
  return num === 1 ? `/${den}` : `${num}/${den}`;
}

function durationOf(el) {
  const type = textOf(el, 'durationType');
  const base = DURATIONS[type];
  if (!base) throw new Error(`unsupported duration "${type}"`);
  let [num, den] = base;
  // Each dot adds half of what came before: n dots multiply by (2^(n+1)-1)/2^n.
  const dots = Number(textOf(el, 'dots') ?? 0);
  if (dots) {
    num *= 2 ** (dots + 1) - 1;
    den *= 2 ** dots;
  }
  const g = gcd(num, den);
  return [num / g, den / g];
}

const gcd = (a, b) => (b ? gcd(b, a % b) : a);

/**
 * One staff -> ABC body plus the MIDI sequence that must pair with it.
 *
 * Accidentals are tracked per bar against the key signature, the way a reader
 * does: an accidental is printed only when it changes what is already in
 * force for that letter in that octave.
 */
function convertStaff(staff, { fifths, staccato, warn }) {
  const bars = [];
  const midi = [];

  kids(staff, 'Measure').forEach((measure, measureIndex) => {
    const voices = kids(measure, 'voice');
    if (voices.length > 1) {
      warn(
        `bar ${measureIndex + 1}: ${voices.length} voices, only the first is used`,
      );
    }

    const inBar = new Map();
    const seedAlter = (letter) => {
      const order = fifths >= 0 ? 'FCGDAEB' : 'BEADGCF';
      const index = order.indexOf(letter);
      return index > -1 && index < Math.abs(fifths) ? Math.sign(fifths) : 0;
    };

    const tokens = [];
    for (const el of voices[0]?.children ?? []) {
      if (el.tag !== 'Chord' && el.tag !== 'Rest') continue;

      if (kid(el, 'Tuplet')) {
        throw new Error(
          `bar ${measureIndex + 1}: tuplets are not supported — ` +
            'their durations would be emitted wrong',
        );
      }

      const length = abcLength(durationOf(el));

      if (el.tag === 'Rest') {
        // A rest is not a note element, so it takes no slot in `midi`.
        tokens.push(`z${length}`);
        continue;
      }

      const notes = kids(el, 'Note');
      if (notes.length === 0) continue;
      if (notes.length > 1) {
        warn(
          `bar ${measureIndex + 1}: ${notes.length}-note chord flattened to ` +
            'its top note (the engine follows one note at a time)',
        );
      }
      const note = notes.reduce((hi, n) =>
        Number(textOf(n, 'pitch')) > Number(textOf(hi, 'pitch')) ? n : hi,
      );

      if (descendants(note, 'Tie').length > 0) {
        throw new Error(
          `bar ${measureIndex + 1}: tied notes are not supported — abcjs ` +
            'renders two noteheads, so the game would ask for the note twice',
        );
      }

      const pitch = Number(textOf(note, 'pitch'));
      const { letter, alter } = spell(Number(textOf(note, 'tpc')));
      const token = abcPitch(letter, alter, pitch);

      const inForce = inBar.has(token) ? inBar.get(token) : seedAlter(letter);
      let accidental = '';
      if (alter !== inForce) {
        accidental = ['__', '_', '=', '^', '^^'][alter + 2] ?? '';
        inBar.set(token, alter);
      }

      const decoration =
        staccato &&
        descendants(el, 'subtype').some((s) => /Staccato/.test(s.text))
          ? '.'
          : '';

      tokens.push(`${decoration}${accidental}${token}${length}`);
      midi.push(pitch);
    }
    bars.push(tokens.join(' '));
  });

  return { bars, midi };
}

// ---------------------------------------------------------------- main

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith('--'));
if (!file) {
  console.error(
    'usage: node scripts/mscz-to-level.mjs <file.mscz> [--id=] [--name=] [--difficulty=] [--no-staccato]',
  );
  process.exit(1);
}
const flag = (name, fallback) =>
  args.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3) ??
  fallback;

const entries = readZip(readFileSync(file));
const mscxName = [...entries.keys()].find((n) => n.endsWith('.mscx'));
if (!mscxName) throw new Error('no .mscx inside the archive');

const score = kid(
  parseXml(entries.get(mscxName).toString('utf8')),
  'museScore',
);
const body = kid(score, 'Score');
const staves = kids(body, 'Staff');

const warnings = [];
const warn = (message) => warnings.push(message);

const fifths = Number(descendants(body, 'concertKey')[0]?.text ?? 0);
const timeSig = descendants(body, 'TimeSig')[0];
const meter = timeSig
  ? `${textOf(timeSig, 'sigN')}/${textOf(timeSig, 'sigD')}`
  : '4/4';
if (!timeSig) warn('no time signature in the score, assuming 4/4');

const staccato = !args.includes('--no-staccato');
if (staves.length > 2) {
  warn(`${staves.length} staves, only the first two are used`);
}

const hands = staves
  .slice(0, 2)
  .map((staff) => convertStaff(staff, { fifths, staccato, warn }));

const title = flag(
  'name',
  descendants(body, 'metaTag')
    .find((m) => m.attrs.name === 'workTitle' && m.text.trim())
    ?.text.trim() ?? basename(file).replace(/\.mscz$/i, ''),
);
const id = flag(
  'id',
  title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, ''),
);

/** Four bars to a line, matching how the existing levels are written. */
const barLines = (bars) => {
  const lines = [];
  for (let i = 0; i < bars.length; i += 4) {
    lines.push(`${bars.slice(i, i + 4).join(' | ')} |`);
  }
  return lines;
};

const grand = hands.length === 2;
const header = [
  'X:1',
  `T:${title}`,
  `M:${meter}`,
  'L:1/4',
  `K:${KEY_NAMES[fifths]}`,
];
const abcLines = grand
  ? [
      ...header,
      '%%score { V1 | V2 }',
      'V:V1 clef=treble',
      'V:V2 clef=bass',
      ...barLines(hands[0].bars).map((l) => `[V:V1] ${l}`),
      ...barLines(hands[1].bars).map((l) => `[V:V2] ${l}`),
    ]
  : [...header, ...barLines(hands[0].bars)];

const abc = abcLines.join('\n');

// ------------------------------------------------ verify against abcjs

const { default: abcjs } = await import('abcjs');
const tune = abcjs.parseOnly(abc)[0];
const rendered = [[], []];
for (const line of tune?.lines ?? []) {
  for (const staff of line.staff ?? []) {
    (staff.voices ?? []).forEach((voice, voiceIndex) => {
      for (const item of voice) {
        if (item.el_type !== 'note' || item.rest) continue;
        // abcjs counts pitch diatonically from middle C; recover the MIDI
        // number so this checks the actual notes, not just how many there are.
        const p = item.pitches[0];
        const octave = Math.floor(p.pitch / 7);
        const step = ((p.pitch % 7) + 7) % 7;
        rendered[voiceIndex]?.push(
          60 +
            octave * 12 +
            SEMITONES[LETTERS[step]] +
            (p.accidental
              ? ({ dblflat: -2, flat: -1, natural: 0, sharp: 1, dblsharp: 2 }[
                  p.accidental
                ] ?? 0)
              : keyAlter(LETTERS[step], fifths)),
        );
      }
    });
  }
}

function keyAlter(letter, f) {
  const order = f >= 0 ? 'FCGDAEB' : 'BEADGCF';
  const index = order.indexOf(letter);
  return index > -1 && index < Math.abs(f) ? Math.sign(f) : 0;
}

const problems = [];
hands.forEach((hand, i) => {
  const label = grand ? (i === 0 ? 'right hand' : 'left hand') : 'melody';
  const got = rendered[i] ?? [];
  if (got.length !== hand.midi.length) {
    problems.push(
      `${label}: abc renders ${got.length} note elements but the array has ` +
        `${hand.midi.length} — the positional pairing would be broken`,
    );
    return;
  }
  const bad = hand.midi.findIndex((n, j) => n !== got[j]);
  if (bad > -1) {
    problems.push(
      `${label}: note ${bad + 1} is ${hand.midi[bad]} in the array but ` +
        `renders as ${got[bad]}`,
    );
  }
});

// ------------------------------------------------ output

const fmt = (nums) => {
  const lines = [];
  for (let i = 0; i < nums.length; i += 12) {
    lines.push(`      ${nums.slice(i, i + 12).join(', ')},`);
  }
  return lines.join('\n');
};

const level = [
  '  {',
  `    id: '${id}',`,
  `    name: '${title.replace(/'/g, "\\'")}',`,
  `    difficulty: ${flag('difficulty', 2)},`,
  '    abc: [',
  ...abcLines.map((l) => `      '${l.replace(/'/g, "\\'")}',`),
  "    ].join('\\n'),",
  '    notes: [',
  fmt(hands[0].midi),
  '    ],',
  ...(grand ? ['    leftNotes: [', fmt(hands[1].midi), '    ],'] : []),
  '  },',
].join('\n');

console.log(level);

const range = (nums) => `${Math.min(...nums)}-${Math.max(...nums)}`;
console.error(
  `\n${hands[0].bars.length} bars, ${hands[0].midi.length} notes, ` +
    `range ${range(hands[0].midi)}, key ${KEY_NAMES[fifths]}, meter ${meter}`,
);
warnings.forEach((w) => console.error(`warning: ${w}`));
if (problems.length) {
  problems.forEach((p) => console.error(`FAILED: ${p}`));
  process.exit(1);
}
console.error('verified: abcjs renders exactly the notes in the array');
