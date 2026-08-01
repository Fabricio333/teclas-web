import { migrate } from './migrations';
import { normalizeProgress } from './normalize';
import {
  PROGRESS_SCHEMA_VERSION,
  type ProgressDoc,
  type StreakState,
} from './schema';
import { replaceDoc } from './store';

export const BACKUP_FORMAT = 'teclas-progress';
export const PRE_REPLACE_KEY = 'teclas.progress.prereplace';

export interface TeclasBackup {
  format: typeof BACKUP_FORMAT;
  version: number;
  exportedAt: string;
  doc: ProgressDoc;
}

/**
 * There is no backend. A cleared browser is a total loss, so this is not a
 * power-user nicety — it's the only backup a student has.
 */
export function exportToFile(doc: ProgressDoc): void {
  const backup: TeclasBackup = {
    format: BACKUP_FORMAT,
    version: PROGRESS_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    doc,
  };
  const blob = new Blob([JSON.stringify(backup, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `teclas-progreso-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoke on the next tick; revoking synchronously can cancel the download
  // in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export type ImportFailure =
  | 'not-json'
  | 'not-teclas'
  | 'future-version'
  | 'invalid';

export type ImportResult =
  | { ok: true; doc: ProgressDoc }
  | { ok: false; reason: ImportFailure; detail: string };

export function parseBackup(text: string): ImportResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (e) {
    return { ok: false, reason: 'not-json', detail: String(e) };
  }

  if (typeof raw !== 'object' || raw === null) {
    return { ok: false, reason: 'not-teclas', detail: 'no es un objeto' };
  }
  const candidate = raw as Partial<TeclasBackup>;
  if (candidate.format !== BACKUP_FORMAT) {
    return {
      ok: false,
      reason: 'not-teclas',
      detail: 'el archivo no es una copia de Teclas',
    };
  }
  if ((candidate.version ?? 0) > PROGRESS_SCHEMA_VERSION) {
    return {
      ok: false,
      reason: 'future-version',
      detail: 'la copia viene de una versión más nueva de la app',
    };
  }

  try {
    return { ok: true, doc: migrate(candidate.doc) };
  } catch (e) {
    return { ok: false, reason: 'invalid', detail: String(e) };
  }
}

/**
 * Merge two documents, keeping the better of each value.
 *
 * Deliberately generous: this runs when a student restores onto a device that
 * already has some history, and silently discarding either side would be
 * worse than over-counting a few notes.
 */
export function mergeDocs(a: ProgressDoc, b: ProgressDoc): ProgressDoc {
  const songIds = new Set([...Object.keys(a.songs), ...Object.keys(b.songs)]);
  const songs: ProgressDoc['songs'] = {};
  for (const id of songIds) {
    const x = a.songs[id];
    const y = b.songs[id];
    if (!x) { songs[id] = y!; continue; }
    if (!y) { songs[id] = x; continue; }
    songs[id] = {
      totalPlays: x.totalPlays + y.totalPlays,
      totalNotes: x.totalNotes + y.totalNotes,
      stars: Math.max(x.stars, y.stars) as 0 | 1 | 2 | 3,
      firstPlayedAt: [x.firstPlayedAt, y.firstPlayedAt].filter(Boolean).sort()[0],
      lastPlayedAt: [x.lastPlayedAt, y.lastPlayedAt].filter(Boolean).sort().pop(),
      best: { ...x.best, ...y.best },
    };
  }

  const exIds = new Set([
    ...Object.keys(a.exercises),
    ...Object.keys(b.exercises),
  ]);
  const exercises: ProgressDoc['exercises'] = {};
  for (const id of exIds) {
    const x = a.exercises[id];
    const y = b.exercises[id];
    if (!x) { exercises[id] = y!; continue; }
    if (!y) { exercises[id] = x; continue; }
    exercises[id] = {
      attempts: x.attempts + y.attempts,
      itemsSeen: x.itemsSeen + y.itemsSeen,
      itemsCorrect: x.itemsCorrect + y.itemsCorrect,
      bestAccuracy: Math.max(x.bestAccuracy, y.bestAccuracy),
      bestStreak: Math.max(x.bestStreak, y.bestStreak),
      lastPlayedAt: [x.lastPlayedAt, y.lastPlayedAt].filter(Boolean).sort().pop(),
      mastery: Math.max(x.mastery, y.mastery),
    };
  }

  const practiceDays = Array.from(
    new Set([...a.streak.practiceDays, ...b.streak.practiceDays]),
  ).sort();
  const streak: StreakState = {
    current: Math.max(a.streak.current, b.streak.current),
    longest: Math.max(a.streak.longest, b.streak.longest),
    lastPracticeDay:
      [a.streak.lastPracticeDay, b.streak.lastPracticeDay]
        .filter(Boolean)
        .sort()
        .pop() ?? null,
    freezesRemaining: Math.max(a.streak.freezesRemaining, b.streak.freezesRemaining),
    freezeRefilledMonth:
      [a.streak.freezeRefilledMonth, b.streak.freezeRefilledMonth]
        .filter(Boolean)
        .sort()
        .pop() ?? null,
    practiceDays,
  };

  const newer = a.updatedAt >= b.updatedAt ? a : b;

  return {
    ...newer,
    songs,
    exercises,
    streak,
    rewards: {
      xp: Math.max(a.rewards.xp, b.rewards.xp),
      level: Math.max(a.rewards.level, b.rewards.level),
      achievements: { ...a.rewards.achievements, ...b.rewards.achievements },
    },
    sessions: [...a.sessions, ...b.sessions]
      .sort((p, q) => p.startedAt.localeCompare(q.startedAt))
      .slice(-60),
    stats: {
      totalPracticeMs: a.stats.totalPracticeMs + b.stats.totalPracticeMs,
      totalNotes: a.stats.totalNotes + b.stats.totalNotes,
      totalCorrect: a.stats.totalCorrect + b.stats.totalCorrect,
      songsPlayed: Math.max(a.stats.songsPlayed, b.stats.songsPlayed),
      exerciseSessions: Math.max(a.stats.exerciseSessions, b.stats.exerciseSessions),
    },
  };
}

/** Snapshot the current doc before a destructive replace, so it's recoverable. */
export function applyImport(
  incoming: ProgressDoc,
  currentDoc: ProgressDoc,
  mode: 'replace' | 'merge',
): void {
  try {
    localStorage.setItem(
      PRE_REPLACE_KEY,
      JSON.stringify({
        format: BACKUP_FORMAT,
        version: PROGRESS_SCHEMA_VERSION,
        exportedAt: new Date().toISOString(),
        doc: currentDoc,
      }),
    );
  } catch {
    /* best effort */
  }
  const next = mode === 'merge' ? mergeDocs(currentDoc, incoming) : incoming;
  replaceDoc(normalizeProgress(next));
}
