/**
 * XP and levels.
 *
 * Rule that shapes everything here: **XP never decreases.** An in-session
 * score can drop — that's useful feedback — but XP is a permanent record of
 * work done, and taking it away is the fastest way to make practice feel
 * punitive.
 */

const LEVEL_CAP = 40;

/** Total XP required to *reach* level n. `round25(90 * n^1.32)`. */
export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  const raw = 90 * Math.pow(level - 1, 1.32);
  return Math.round(raw / 25) * 25;
}

export function levelForXp(xp: number): number {
  let level = 1;
  while (level < LEVEL_CAP && xp >= xpForLevel(level + 1)) level++;
  return level;
}

export interface LevelInfo {
  level: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
  /** 0..1 progress through the current level; 1 when capped. */
  ratio: number;
  isMaxLevel: boolean;
}

export function levelInfo(xp: number): LevelInfo {
  const level = levelForXp(xp);
  const isMaxLevel = level >= LEVEL_CAP;
  const floor = xpForLevel(level);
  const ceil = isMaxLevel ? floor : xpForLevel(level + 1);
  const span = Math.max(1, ceil - floor);
  return {
    level,
    xpIntoLevel: xp - floor,
    xpForNextLevel: isMaxLevel ? 0 : ceil - xp,
    ratio: isMaxLevel ? 1 : Math.min(1, (xp - floor) / span),
    isMaxLevel,
  };
}

/** Spanish rank names, so the ladder means something beyond a number. */
export function levelTitle(level: number): string {
  if (level <= 4) return 'Principiante';
  if (level <= 9) return 'Aprendiz';
  if (level <= 17) return 'Estudiante';
  if (level <= 26) return 'Intermedio';
  if (level <= 34) return 'Avanzado';
  return 'Maestro';
}

export const XP_FIRST_SESSION_OF_DAY = 25;

/** XP for one practice run. Capped so grinding a trivial song isn't optimal. */
export function xpForRun(opts: {
  notesCorrect: number;
  accuracy: number;
  isFirstEverCompletion: boolean;
}): number {
  const base = 5 + Math.min(55, opts.notesCorrect);
  const accuracyBonus =
    opts.accuracy >= 0.98 ? 20 : opts.accuracy >= 0.9 ? 10 : 0;
  const total = base + accuracyBonus;
  return opts.isFirstEverCompletion ? total * 2 : total;
}

/** 0..3 stars for a run. Stars are per hand; a song shows the min across hands. */
export function starsForRun(
  accuracy: number,
  completed: boolean,
): 0 | 1 | 2 | 3 {
  if (!completed) return 0;
  if (accuracy >= 0.98) return 3;
  if (accuracy >= 0.9) return 2;
  return 1;
}
