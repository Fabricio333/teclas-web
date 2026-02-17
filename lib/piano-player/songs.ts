export interface Level {
  id: string;
  name: string;
  difficulty: 1 | 2 | 3;
  abc: string;
  notes: number[]; // MIDI numbers in order
}

// C4=60 D4=62 E4=64 F4=65 G4=67 A4=69 B4=71
export const LEVELS: Level[] = [
  {
    id: 'estrellita',
    name: 'Estrellita',
    difficulty: 1,
    abc: [
      'X:1',
      'T:Estrellita',
      'M:4/4',
      'L:1/4',
      'K:C',
      'C C G G | A A G2 | F F E E | D D C2 |',
    ].join('\n'),
    notes: [60, 60, 67, 67, 69, 69, 67, 65, 65, 64, 64, 62, 62, 60],
  },
  {
    id: 'maria-corderito',
    name: 'Maria tenia un corderito',
    difficulty: 1,
    abc: [
      'X:1',
      'T:Maria tenia un corderito',
      'M:4/4',
      'L:1/4',
      'K:C',
      'E D C D | E E E2 | D D D2 | E G G2 |',
      'E D C D | E E E E | D D E D | C4 |',
    ].join('\n'),
    notes: [
      64, 62, 60, 62, 64, 64, 64, 62, 62, 62, 64, 67, 67, 64, 62, 60, 62, 64,
      64, 64, 64, 62, 62, 64, 62, 60,
    ],
  },
  {
    id: 'martinillo',
    name: 'Martinillo',
    difficulty: 1,
    abc: [
      'X:1',
      'T:Martinillo',
      'M:4/4',
      'L:1/4',
      'K:C',
      'C D E C | C D E C | E F G2 | E F G2 |',
      'G A G F | E C z2 | G A G F | E C z2 | C G, C2 | C G, C2 |',
    ].join('\n'),
    notes: [
      60, 62, 64, 60, 60, 62, 64, 60, 64, 65, 67, 64, 65, 67, 67, 69, 67, 65,
      64, 60, 67, 69, 67, 65, 64, 60, 60, 67, 60,
    ],
  },
  {
    id: 'oda-alegria',
    name: 'Oda a la Alegria',
    difficulty: 2,
    abc: [
      'X:1',
      'T:Oda a la Alegria',
      'M:4/4',
      'L:1/4',
      'K:C',
      'E E F G | G F E D | C C D E | E D D2 |',
      'E E F G | G F E D | C C D E | D C C2 |',
    ].join('\n'),
    notes: [
      64, 64, 65, 67, 67, 65, 64, 62, 60, 60, 62, 64, 64, 62, 62, 64, 64, 65,
      67, 67, 65, 64, 62, 60, 60, 62, 64, 62, 60, 60,
    ],
  },
  {
    id: 'cumpleanos',
    name: 'Cumpleanos Feliz',
    difficulty: 2,
    abc: [
      'X:1',
      'T:Cumpleanos Feliz',
      'M:3/4',
      'L:1/4',
      'K:C',
      'C C D C | F E2 | C C D C | G F2 |',
      'C C A F | E D2 | B B A F | G F2 |',
    ].join('\n'),
    notes: [
      60, 60, 62, 60, 65, 64, 60, 60, 62, 60, 67, 65, 60, 60, 69, 65, 64, 62,
      71, 71, 69, 65, 67, 65,
    ],
  },
  {
    id: 'campanitas',
    name: 'Campanitas del Lugar',
    difficulty: 2,
    abc: [
      'X:1',
      'T:Campanitas del Lugar',
      'M:4/4',
      'L:1/4',
      'K:C',
      'E E E2 | E E E2 | E G C D | E4 |',
      'F F F F | F E E E | E D D E | D2 G2 |',
      'E E E2 | E E E2 | E G C D | E4 |',
    ].join('\n'),
    notes: [
      64, 64, 64, 64, 64, 64, 64, 67, 60, 62, 64, 65, 65, 65, 65, 65, 64, 64,
      64, 64, 62, 62, 64, 62, 67, 64, 64, 64, 64, 64, 64, 64, 67, 60, 62, 64,
    ],
  },
  {
    id: 'himno-alegria-completo',
    name: 'Himno a la Alegria (completo)',
    difficulty: 3,
    abc: [
      'X:1',
      'T:Himno a la Alegria (completo)',
      'M:4/4',
      'L:1/4',
      'K:C',
      'E E F G | G F E D | C C D E | E D D2 |',
      'E E F G | G F E D | C C D E | D C C2 |',
      'D D E C | D E/F/ E C | D E/F/ E D | C D G,2 |',
      'E E F G | G F E D | C C D E | D C C2 |',
    ].join('\n'),
    notes: [
      64, 64, 65, 67, 67, 65, 64, 62, 60, 60, 62, 64, 64, 62, 62, 64, 64, 65,
      67, 67, 65, 64, 62, 60, 60, 62, 64, 62, 60, 60, 62, 62, 64, 60, 62, 64,
      65, 64, 60, 62, 64, 65, 64, 62, 60, 62, 67, 64, 64, 65, 67, 67, 65, 64,
      62, 60, 60, 62, 64, 62, 60, 60,
    ],
  },
];

export const KEY_TO_MIDI: Record<string, number> = {
  a: 60, // C4
  w: 61, // C#4
  s: 62, // D4
  e: 63, // D#4
  d: 64, // E4
  f: 65, // F4
  t: 66, // F#4
  g: 67, // G4
  y: 68, // G#4
  h: 69, // A4
  u: 70, // A#4
  j: 71, // B4
};

export const MIDI_TO_KEY: Record<number, string> = {};
Object.entries(KEY_TO_MIDI).forEach(([key, midi]) => {
  MIDI_TO_KEY[midi] = key.toUpperCase();
});

export const WHITE_KEYS = [
  { midi: 60, label: 'A', note: 'C4' },
  { midi: 62, label: 'S', note: 'D4' },
  { midi: 64, label: 'D', note: 'E4' },
  { midi: 65, label: 'F', note: 'F4' },
  { midi: 67, label: 'G', note: 'G4' },
  { midi: 69, label: 'H', note: 'A4' },
  { midi: 71, label: 'J', note: 'B4' },
];

export const BLACK_KEYS = [
  { midi: 61, label: 'W', note: 'C#4', afterWhiteIndex: 0 },
  { midi: 63, label: 'E', note: 'D#4', afterWhiteIndex: 1 },
  { midi: 66, label: 'T', note: 'F#4', afterWhiteIndex: 3 },
  { midi: 68, label: 'Y', note: 'G#4', afterWhiteIndex: 4 },
  { midi: 70, label: 'U', note: 'A#4', afterWhiteIndex: 5 },
];
