import { differenceInCalendarDays, parseISO } from 'date-fns';
import type { DayKey, StreakState } from './schema';
import { MAX_PRACTICE_DAYS } from './schema';

/**
 * Practising at 01:30 should count for the previous day — a student finishing
 * a late session has not broken their streak.
 */
const DAY_BOUNDARY_HOUR = 4;

const FREEZES_PER_MONTH = 2;

/**
 * The student's civil day, shifted by the 4am boundary.
 *
 * `en-CA` is the reliable way to get a `YYYY-MM-DD` string out of `Intl`
 * without hand-rolling padding, and it respects the supplied time zone.
 */
export function dayKey(at: Date, timeZone: string): DayKey {
  const shifted = new Date(at.getTime() - DAY_BOUNDARY_HOUR * 3_600_000);
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(shifted);
  } catch {
    // Invalid/unknown zone (a hand-edited import, say) — fall back to UTC
    // rather than throwing and losing the session.
    return shifted.toISOString().slice(0, 10);
  }
}

export function monthKey(day: DayKey): string {
  return day.slice(0, 7);
}

function daysBetween(a: DayKey, b: DayKey): number {
  return differenceInCalendarDays(parseISO(b), parseISO(a));
}

/**
 * Fold a practice session into the streak.
 *
 * Freezes are consumed **silently**: the student discovers they were
 * protected, never that they nearly lost something. Loss-framed mechanics are
 * deliberately absent.
 */
export function registerPractice(
  streak: StreakState,
  today: DayKey,
): StreakState {
  const next: StreakState = {
    ...streak,
    practiceDays: [...streak.practiceDays],
  };

  // Refill freezes on the first session of a new month.
  const month = monthKey(today);
  if (next.freezeRefilledMonth !== month) {
    next.freezeRefilledMonth = month;
    next.freezesRemaining = FREEZES_PER_MONTH;
  }

  if (streak.lastPracticeDay === today) {
    return recordDay(next, today);
  }

  if (streak.lastPracticeDay === null) {
    next.current = 1;
  } else {
    const gap = daysBetween(streak.lastPracticeDay, today);
    if (gap === 1) {
      next.current = streak.current + 1;
    } else if (gap === 2 && next.freezesRemaining > 0) {
      // Exactly one missed day, and a freeze is available.
      next.freezesRemaining -= 1;
      next.current = streak.current + 1;
    } else if (gap <= 0) {
      // Clock moved backwards (timezone edit, manual date change). Don't
      // corrupt the streak; treat it as same-day.
      return recordDay(next, today);
    } else {
      next.current = 1;
    }
  }

  next.lastPracticeDay = today;
  next.longest = Math.max(next.longest, next.current);
  return recordDay(next, today);
}

function recordDay(streak: StreakState, today: DayKey): StreakState {
  if (streak.practiceDays.includes(today)) return streak;
  const practiceDays = [...streak.practiceDays, today]
    .sort()
    .slice(-MAX_PRACTICE_DAYS);
  return { ...streak, practiceDays, lastPracticeDay: today };
}

/**
 * Whether the streak is still live as of `today` — used for display only, so a
 * student who hasn't practised yet today still sees their count rather than a
 * zero that snaps back up the moment they play a note.
 */
export function isStreakActive(streak: StreakState, today: DayKey): boolean {
  if (!streak.lastPracticeDay) return false;
  return daysBetween(streak.lastPracticeDay, today) <= 1;
}
