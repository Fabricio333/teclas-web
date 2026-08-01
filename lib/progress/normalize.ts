import {
  PROGRESS_SCHEMA_VERSION,
  createEmptyProgress,
  resolveTimeZone,
  type ExerciseProgress,
  type ProgressDoc,
  type SessionRecord,
  type SongProgress,
  type StarCount,
} from './schema';

/**
 * Coerce an untrusted value into a valid `ProgressDoc`.
 *
 * This deliberately does NOT use a schema library. `ProgressProvider` lives in
 * the root layout, so whatever validates here is downloaded on every page
 * including the landing page — zod cost 55 kB there for logic that is a
 * couple of hundred lines of defaulting.
 *
 * The policy throughout is *repair, don't reject*: a field that can't be read
 * falls back to its zero value rather than throwing away the whole document.
 * A student's history is the only copy there is. `migrate()` still throws for
 * structural problems it genuinely cannot interpret, and the caller
 * quarantines those.
 */

function num(
  v: unknown,
  fallback: number,
  min = -Infinity,
  max = Infinity,
): number {
  return typeof v === 'number' && Number.isFinite(v)
    ? Math.min(max, Math.max(min, v))
    : fallback;
}

function int(v: unknown, fallback: number, min = 0): number {
  return Math.round(num(v, fallback, min));
}

function bool(v: unknown, fallback: boolean): boolean {
  return typeof v === 'boolean' ? v : fallback;
}

function str(v: unknown, fallback: string): string {
  return typeof v === 'string' ? v : fallback;
}

function nullableStr(v: unknown): string | null {
  return typeof v === 'string' ? v : null;
}

function optionalStr(v: unknown): string | undefined {
  return typeof v === 'string' ? v : undefined;
}

function oneOf<T extends string>(
  v: unknown,
  allowed: readonly T[],
  fallback: T,
): T {
  return typeof v === 'string' && (allowed as readonly string[]).includes(v)
    ? (v as T)
    : fallback;
}

function obj(v: unknown): Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {};
}

function arr(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

const INPUT_SOURCES = [
  'qwerty',
  'pointer',
  'midi',
  'microphone',
  'system',
] as const;
const HANDS = ['right', 'left', 'both'] as const;

function normalizeSong(raw: unknown): SongProgress {
  const o = obj(raw);
  const bestRaw = obj(o.best);
  const best: SongProgress['best'] = {};
  for (const hand of HANDS) {
    const b = bestRaw[hand];
    if (!b) continue;
    const bo = obj(b);
    best[hand] = {
      score: num(bo.score, 0, 0),
      accuracy: num(bo.accuracy, 0, 0, 1),
      at: str(bo.at, new Date(0).toISOString()),
      inputSource: oneOf(bo.inputSource, INPUT_SOURCES, 'pointer'),
    };
  }
  return {
    totalPlays: int(o.totalPlays, 0),
    totalNotes: int(o.totalNotes, 0),
    stars: Math.min(3, Math.max(0, int(o.stars, 0))) as StarCount,
    firstPlayedAt: optionalStr(o.firstPlayedAt),
    lastPlayedAt: optionalStr(o.lastPlayedAt),
    best,
  };
}

function normalizeExercise(raw: unknown): ExerciseProgress {
  const o = obj(raw);
  return {
    attempts: int(o.attempts, 0),
    itemsSeen: int(o.itemsSeen, 0),
    itemsCorrect: int(o.itemsCorrect, 0),
    bestAccuracy: num(o.bestAccuracy, 0, 0, 1),
    bestStreak: int(o.bestStreak, 0),
    lastPlayedAt: optionalStr(o.lastPlayedAt),
    mastery: num(o.mastery, 0, 0, 1),
  };
}

function normalizeSession(raw: unknown): SessionRecord | null {
  const o = obj(raw);
  if (typeof o.id !== 'string' || typeof o.refId !== 'string') return null;
  return {
    id: o.id,
    startedAt: str(o.startedAt, new Date(0).toISOString()),
    durationMs: num(o.durationMs, 0, 0),
    day: str(o.day, '1970-01-01'),
    kind: oneOf(o.kind, ['song', 'exercise', 'lesson'] as const, 'song'),
    refId: o.refId,
    notesAttempted: int(o.notesAttempted, 0),
    notesCorrect: int(o.notesCorrect, 0),
    xpEarned: num(o.xpEarned, 0, 0),
  };
}

export function normalizeProgress(raw: unknown): ProgressDoc {
  const o = obj(raw);
  const empty = createEmptyProgress();

  const profile = obj(o.profile);
  const streak = obj(o.streak);
  const rewards = obj(o.rewards);
  const settings = obj(o.settings);
  const stats = obj(o.stats);

  const songs: ProgressDoc['songs'] = {};
  for (const [id, v] of Object.entries(obj(o.songs)))
    songs[id] = normalizeSong(v);

  const exercises: ProgressDoc['exercises'] = {};
  for (const [id, v] of Object.entries(obj(o.exercises))) {
    exercises[id] = normalizeExercise(v);
  }

  const achievements: ProgressDoc['rewards']['achievements'] = {};
  for (const [id, v] of Object.entries(obj(rewards.achievements))) {
    const a = obj(v);
    if (typeof a.unlockedAt !== 'string') continue;
    achievements[id] = { unlockedAt: a.unlockedAt, seen: bool(a.seen, false) };
  }

  return {
    schemaVersion: PROGRESS_SCHEMA_VERSION,
    createdAt: str(o.createdAt, empty.createdAt),
    updatedAt: str(o.updatedAt, empty.updatedAt),
    profile: {
      displayName: nullableStr(profile.displayName),
      timeZone: str(profile.timeZone, resolveTimeZone()),
      lastExportAt: nullableStr(profile.lastExportAt),
    },
    songs,
    exercises,
    streak: {
      current: int(streak.current, 0),
      longest: int(streak.longest, 0),
      lastPracticeDay: nullableStr(streak.lastPracticeDay),
      freezesRemaining: int(streak.freezesRemaining, 2),
      freezeRefilledMonth: nullableStr(streak.freezeRefilledMonth),
      practiceDays: arr(streak.practiceDays).filter(
        (d): d is string => typeof d === 'string',
      ),
    },
    rewards: {
      xp: num(rewards.xp, 0, 0),
      level: Math.max(1, int(rewards.level, 1, 1)),
      achievements,
    },
    settings: {
      noteNaming: oneOf(
        settings.noteNaming,
        ['solfege', 'letters'] as const,
        'solfege',
      ),
      showKeyLabels: bool(settings.showKeyLabels, true),
      metronome: bool(settings.metronome, false),
      volume: num(settings.volume, 0.8, 0, 1),
      showPiano: bool(settings.showPiano, true),
      sheetLines: Math.min(4, Math.max(1, int(settings.sheetLines, 2, 1))) as
        1 | 2 | 3 | 4,
      // A document saved before these fields existed normalizes to the
      // defaults, so an existing student just sees the first-run prompt once.
      // That is why no schemaVersion bump or migration is needed.
      inputMode: oneOf(
        settings.inputMode,
        ['unset', 'acoustic', 'midi', 'keyboard'] as const,
        'unset',
      ),
      practiceHand: oneOf(
        settings.practiceHand,
        ['right', 'left'] as const,
        'right',
      ),
      gamificationLevel: oneOf(
        settings.gamificationLevel,
        ['full', 'minimal', 'off'] as const,
        'full',
      ),
    },
    sessions: arr(o.sessions)
      .map(normalizeSession)
      .filter((s): s is SessionRecord => s !== null),
    stats: {
      totalPracticeMs: num(stats.totalPracticeMs, 0, 0),
      totalNotes: int(stats.totalNotes, 0),
      totalCorrect: int(stats.totalCorrect, 0),
      songsPlayed: int(stats.songsPlayed, 0),
      exerciseSessions: int(stats.exerciseSessions, 0),
    },
  };
}
