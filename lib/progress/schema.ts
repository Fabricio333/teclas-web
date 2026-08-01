/**
 * Shape of everything Teclas remembers about a student.
 *
 * This site is a static export (`output: 'export'`), so there is no server and
 * no database — localStorage is the only durable store. That has two
 * consequences the rest of this module is built around:
 *
 *   1. Clearing browser data destroys months of work, so export/import is a
 *      first-class feature, not a nicety (see `transfer.ts`).
 *   2. Nothing here may be read at module scope, because every page is
 *      prerendered at build time where `window` is undefined (see `store.ts`).
 */

export const PROGRESS_SCHEMA_VERSION = 1;
export const STORAGE_KEY = 'teclas.progress';
export const CORRUPT_KEY_PREFIX = 'teclas.progress.corrupt.';

/** `YYYY-MM-DD` in the student's local civil calendar. See `streak.ts`. */
export type DayKey = string;

export type SongId = string;
export type ExerciseId = string;
export type AchievementId = string;
export type HandMode = 'right' | 'left' | 'both';
export type StarCount = 0 | 1 | 2 | 3;

/** Mirrors the InputSource union in the practice engines. */
export type InputSource =
  'qwerty' | 'pointer' | 'midi' | 'microphone' | 'system';

export interface BestRun {
  score: number;
  /** 0..1 */
  accuracy: number;
  at: string;
  inputSource: InputSource;
}

export interface SongProgress {
  totalPlays: number;
  totalNotes: number;
  stars: StarCount;
  firstPlayedAt?: string;
  lastPlayedAt?: string;
  /** Best run per hand. A song's displayed stars is the min across hands. */
  best: Partial<Record<HandMode, BestRun>>;
}

export interface ExerciseProgress {
  attempts: number;
  itemsSeen: number;
  itemsCorrect: number;
  bestAccuracy: number;
  bestStreak: number;
  lastPlayedAt?: string;
  /** 0..1, exponentially-weighted moving average of recent accuracies. */
  mastery: number;
}

export interface StreakState {
  current: number;
  longest: number;
  lastPracticeDay: DayKey | null;
  /** Refilled to 2 on the 1st of each month. Consumed silently. */
  freezesRemaining: number;
  freezeRefilledMonth: string | null;
  /** Last 400 days, powers the calendar heatmap. */
  practiceDays: DayKey[];
}

export interface RewardState {
  xp: number;
  level: number;
  achievements: Record<AchievementId, { unlockedAt: string; seen: boolean }>;
}

export type GamificationLevel = 'full' | 'minimal' | 'off';

export interface SettingsState {
  /** Argentine students read fixed-do; default to solfège. */
  noteNaming: 'solfege' | 'letters';
  showKeyLabels: boolean;
  metronome: boolean;
  volume: number;
  /**
   * Hide the on-screen keyboard. Students playing a real piano (MIDI or
   * microphone) don't need it, and reclaiming that vertical space is what
   * makes the sheet usable on a laptop.
   */
  showPiano: boolean;
  /** How many staff systems the sheet viewport shows at once. */
  sheetLines: 1 | 2 | 3 | 4;
  /**
   * How the student plays. Captured once by the first-run prompt so the app
   * stops asking, and so the mic is only offered to people who actually have an
   * acoustic piano in front of them. `unset` is what triggers that prompt.
   */
  inputMode: 'unset' | 'acoustic' | 'midi' | 'keyboard';
  /**
   * Which voice of a grand-staff score the game follows. Ignored by
   * single-staff songs, which are all of them today.
   */
  practiceHand: 'right' | 'left';
  /**
   * Adult beginners frequently find XP and badges patronising, and this is a
   * music school's site — the whole layer must be switchable off.
   */
  gamificationLevel: GamificationLevel;
}

export interface SessionRecord {
  id: string;
  startedAt: string;
  durationMs: number;
  day: DayKey;
  kind: 'song' | 'exercise' | 'lesson';
  refId: string;
  notesAttempted: number;
  notesCorrect: number;
  xpEarned: number;
}

export interface LifetimeStats {
  totalPracticeMs: number;
  totalNotes: number;
  totalCorrect: number;
  songsPlayed: number;
  exerciseSessions: number;
}

export interface ProfileState {
  displayName: string | null;
  /** Captured once at first run; never applied retroactively. */
  timeZone: string;
  lastExportAt: string | null;
}

export interface ProgressDoc {
  schemaVersion: number;
  createdAt: string;
  updatedAt: string;
  profile: ProfileState;
  songs: Record<SongId, SongProgress>;
  exercises: Record<ExerciseId, ExerciseProgress>;
  streak: StreakState;
  rewards: RewardState;
  settings: SettingsState;
  /** Ring buffer, newest last. */
  sessions: SessionRecord[];
  stats: LifetimeStats;
}

export const MAX_SESSIONS = 60;
export const MAX_PRACTICE_DAYS = 400;

/**
 * The frozen zero state. Doubles as `getServerSnapshot()` for
 * `useSyncExternalStore`, which is why it must be a stable singleton — a fresh
 * object each call makes React throw "The result of getSnapshot should be
 * cached".
 */
/** Freezes deeply without widening the value's type to `Readonly<...>`. */
function deepFreeze<T>(value: T): T {
  Object.getOwnPropertyNames(value as object).forEach((key) => {
    const inner = (value as Record<string, unknown>)[key];
    if (
      inner !== null &&
      typeof inner === 'object' &&
      !Object.isFrozen(inner)
    ) {
      deepFreeze(inner);
    }
  });
  return Object.freeze(value);
}

export const EMPTY_PROGRESS: ProgressDoc = deepFreeze<ProgressDoc>({
  schemaVersion: PROGRESS_SCHEMA_VERSION,
  createdAt: '1970-01-01T00:00:00.000Z',
  updatedAt: '1970-01-01T00:00:00.000Z',
  profile: {
    displayName: null,
    timeZone: 'America/Argentina/Buenos_Aires',
    lastExportAt: null,
  },
  songs: {},
  exercises: {},
  streak: {
    current: 0,
    longest: 0,
    lastPracticeDay: null,
    freezesRemaining: 2,
    freezeRefilledMonth: null,
    practiceDays: [],
  },
  rewards: {
    xp: 0,
    level: 1,
    achievements: {},
  },
  settings: {
    noteNaming: 'solfege',
    showKeyLabels: true,
    metronome: false,
    volume: 0.8,
    showPiano: true,
    sheetLines: 2,
    inputMode: 'unset',
    practiceHand: 'right',
    gamificationLevel: 'full',
  },
  sessions: [],
  stats: {
    totalPracticeMs: 0,
    totalNotes: 0,
    totalCorrect: 0,
    songsPlayed: 0,
    exerciseSessions: 0,
  },
});

/** A mutable deep copy of the zero state, safe to write into. */
export function createEmptyProgress(now = new Date()): ProgressDoc {
  const iso = now.toISOString();
  return {
    ...structuredClone(EMPTY_PROGRESS),
    createdAt: iso,
    updatedAt: iso,
    profile: {
      displayName: null,
      timeZone: resolveTimeZone(),
      lastExportAt: null,
    },
  };
}

export function resolveTimeZone(): string {
  try {
    return (
      Intl.DateTimeFormat().resolvedOptions().timeZone ??
      'America/Argentina/Buenos_Aires'
    );
  } catch {
    return 'America/Argentina/Buenos_Aires';
  }
}
