import {
  MAX_SESSIONS,
  type HandMode,
  type InputSource,
  type ProgressDoc,
  type SessionRecord,
} from './schema';
import { dayKey, registerPractice } from './streak';
import {
  levelForXp,
  starsForRun,
  xpForRun,
  XP_FIRST_SESSION_OF_DAY,
} from './xp';
import {
  newlyEarned,
  type Achievement,
  type AchievementContext,
} from './achievements';
import { update } from './store';

export interface RunReport {
  kind: 'song' | 'exercise' | 'lesson';
  refId: string;
  hand?: HandMode;
  notesAttempted: number;
  notesCorrect: number;
  /** Whether the student reached the end, as opposed to abandoning. */
  completed: boolean;
  durationMs: number;
  inputSource: InputSource;
  score?: number;
  /** Longest correct streak within the run, for exercise achievements. */
  bestStreak?: number;
}

export interface RunOutcome {
  xpEarned: number;
  leveledUpTo: number | null;
  stars: 0 | 1 | 2 | 3;
  achievements: Achievement[];
}

let lastOutcome: RunOutcome | null = null;
/** The outcome of the most recent `recordRun`, for the UI to celebrate. */
export function consumeLastOutcome(): RunOutcome | null {
  const o = lastOutcome;
  lastOutcome = null;
  return o;
}

function uid(): string {
  return `s_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e6).toString(36)}`;
}

/**
 * Fold one finished practice run into the document: stats, streak, XP,
 * stars and achievements, in that order (achievements read the post-fold
 * state, so `racha-7` can fire on the same run that reaches 7).
 */
export function recordRun(report: RunReport, now = new Date()): void {
  update((doc) => {
    const accuracy =
      report.notesAttempted > 0
        ? report.notesCorrect / report.notesAttempted
        : 0;
    const today = dayKey(now, doc.profile.timeZone);

    const previousSession = doc.sessions[doc.sessions.length - 1];
    const daysSinceLastSession = previousSession
      ? Math.round(
          (now.getTime() - new Date(previousSession.startedAt).getTime()) /
            86_400_000,
        )
      : null;

    const isFirstSessionToday = doc.streak.lastPracticeDay !== today;

    // ---- streak ----
    const streak = registerPractice(doc.streak, today);

    // ---- per-song / per-exercise ----
    let songs = doc.songs;
    let exercises = doc.exercises;
    let stars: 0 | 1 | 2 | 3 = 0;
    let isFirstEverCompletion = false;

    if (report.kind === 'song') {
      const prev = doc.songs[report.refId];
      const hand: HandMode = report.hand ?? 'right';
      stars = starsForRun(accuracy, report.completed);
      isFirstEverCompletion = report.completed && (!prev || prev.stars === 0);

      const prevBest = prev?.best?.[hand];
      const isBetter = !prevBest || accuracy > prevBest.accuracy;

      songs = {
        ...doc.songs,
        [report.refId]: {
          totalPlays: (prev?.totalPlays ?? 0) + 1,
          totalNotes: (prev?.totalNotes ?? 0) + report.notesCorrect,
          stars: Math.max(prev?.stars ?? 0, stars) as 0 | 1 | 2 | 3,
          firstPlayedAt: prev?.firstPlayedAt ?? now.toISOString(),
          lastPlayedAt: now.toISOString(),
          best: {
            ...(prev?.best ?? {}),
            ...(isBetter
              ? {
                  [hand]: {
                    score: report.score ?? report.notesCorrect,
                    accuracy,
                    at: now.toISOString(),
                    inputSource: report.inputSource,
                  },
                }
              : {}),
          },
        },
      };
    } else if (report.kind === 'exercise') {
      const prev = doc.exercises[report.refId];
      const seen = (prev?.itemsSeen ?? 0) + report.notesAttempted;
      const correct = (prev?.itemsCorrect ?? 0) + report.notesCorrect;
      // EWMA so recent sessions dominate without erasing history.
      const mastery = prev ? prev.mastery * 0.7 + accuracy * 0.3 : accuracy;
      isFirstEverCompletion = report.completed && !prev;

      exercises = {
        ...doc.exercises,
        [report.refId]: {
          attempts: (prev?.attempts ?? 0) + 1,
          itemsSeen: seen,
          itemsCorrect: correct,
          bestAccuracy: Math.max(prev?.bestAccuracy ?? 0, accuracy),
          bestStreak: Math.max(prev?.bestStreak ?? 0, report.bestStreak ?? 0),
          lastPlayedAt: now.toISOString(),
          mastery,
        },
      };
    }

    // ---- xp ----
    let xpEarned = xpForRun({
      notesCorrect: report.notesCorrect,
      accuracy,
      isFirstEverCompletion,
    });
    if (isFirstSessionToday) xpEarned += XP_FIRST_SESSION_OF_DAY;

    const session: SessionRecord = {
      id: uid(),
      startedAt: new Date(now.getTime() - report.durationMs).toISOString(),
      durationMs: report.durationMs,
      day: today,
      kind: report.kind,
      refId: report.refId,
      notesAttempted: report.notesAttempted,
      notesCorrect: report.notesCorrect,
      xpEarned,
    };

    const xp = doc.rewards.xp + xpEarned;
    const previousLevel = doc.rewards.level;
    const level = levelForXp(xp);

    let next: ProgressDoc = {
      ...doc,
      songs,
      exercises,
      streak,
      rewards: { ...doc.rewards, xp, level },
      sessions: [...doc.sessions, session].slice(-MAX_SESSIONS),
      stats: {
        totalPracticeMs: doc.stats.totalPracticeMs + report.durationMs,
        totalNotes: doc.stats.totalNotes + report.notesAttempted,
        totalCorrect: doc.stats.totalCorrect + report.notesCorrect,
        songsPlayed:
          report.kind === 'song'
            ? doc.stats.songsPlayed + 1
            : doc.stats.songsPlayed,
        exerciseSessions:
          report.kind === 'exercise'
            ? doc.stats.exerciseSessions + 1
            : doc.stats.exerciseSessions,
      },
    };

    // ---- achievements (read post-fold state) ----
    const ctx: AchievementContext = {
      hour: now.getHours(),
      daysSinceLastSession,
      lastRunAccuracy: report.notesAttempted > 0 ? accuracy : null,
      lastRunCompleted: report.completed,
    };
    const earned = newlyEarned(next, ctx);
    if (earned.length > 0) {
      const bonus = earned.reduce((sum, x) => sum + x.xp, 0);
      const totalXp = next.rewards.xp + bonus;
      next = {
        ...next,
        rewards: {
          ...next.rewards,
          xp: totalXp,
          level: levelForXp(totalXp),
          achievements: {
            ...next.rewards.achievements,
            ...Object.fromEntries(
              earned.map((x) => [
                x.id,
                { unlockedAt: now.toISOString(), seen: false },
              ]),
            ),
          },
        },
      };
      xpEarned += bonus;
    }

    lastOutcome = {
      xpEarned,
      leveledUpTo:
        next.rewards.level > previousLevel ? next.rewards.level : null,
      stars,
      achievements: earned,
    };

    return next;
  });
}

export function markAchievementsSeen(): void {
  update((doc) => ({
    ...doc,
    rewards: {
      ...doc.rewards,
      achievements: Object.fromEntries(
        Object.entries(doc.rewards.achievements).map(([id, v]) => [
          id,
          { ...v, seen: true },
        ]),
      ),
    },
  }));
}

export function updateSettings(patch: Partial<ProgressDoc['settings']>): void {
  update((doc) => ({ ...doc, settings: { ...doc.settings, ...patch } }));
}
