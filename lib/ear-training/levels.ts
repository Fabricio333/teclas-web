export {
  KEY_TO_MIDI,
  MIDI_TO_KEY,
  WHITE_KEYS,
  BLACK_KEYS,
} from '@/lib/piano-player/songs';

export interface EarTrainingLevel {
  id: string;
  name: string;
  difficulty: 1 | 2 | 3;
  notePool: number[];
  notesPerRound: number;
}

export const LEVELS: EarTrainingLevel[] = [
  {
    id: 'do-re-mi',
    name: 'Do Re Mi',
    difficulty: 1,
    notePool: [60, 62, 64],
    notesPerRound: 10,
  },
  {
    id: 'do-a-sol',
    name: 'Do a Sol',
    difficulty: 1,
    notePool: [60, 62, 64, 65, 67],
    notesPerRound: 10,
  },
  {
    id: 'octava-completa',
    name: 'Octava completa',
    difficulty: 2,
    notePool: [60, 62, 64, 65, 67, 69, 71],
    notesPerRound: 12,
  },
  {
    id: 'con-sostenidos',
    name: 'Con sostenidos',
    difficulty: 2,
    notePool: [60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71],
    notesPerRound: 12,
  },
  {
    id: 'dos-octavas',
    name: 'Dos octavas',
    difficulty: 3,
    notePool: [48, 50, 52, 53, 55, 57, 59, 60, 62, 64, 65, 67, 69, 71],
    notesPerRound: 15,
  },
];

export const MIDI_TO_SOLFEGE: Record<number, string> = {
  48: 'Do3',
  50: 'Re3',
  52: 'Mi3',
  53: 'Fa3',
  55: 'Sol3',
  57: 'La3',
  59: 'Si3',
  60: 'Do',
  61: 'Do#',
  62: 'Re',
  63: 'Re#',
  64: 'Mi',
  65: 'Fa',
  66: 'Fa#',
  67: 'Sol',
  68: 'Sol#',
  69: 'La',
  70: 'La#',
  71: 'Si',
};

export function generateRound(level: EarTrainingLevel): number[] {
  const sequence: number[] = [];
  for (let i = 0; i < level.notesPerRound; i++) {
    const idx = Math.floor(Math.random() * level.notePool.length);
    sequence.push(level.notePool[idx]);
  }
  return sequence;
}
