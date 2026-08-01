import {
  CORRUPT_KEY_PREFIX,
  MAX_PRACTICE_DAYS,
  MAX_SESSIONS,
  PROGRESS_SCHEMA_VERSION,
  STORAGE_KEY,
  type ProgressDoc,
} from './schema';
import { migrate } from './migrations';

export type WriteResult = 'ok' | 'quota' | 'unavailable';

/** Set when writes have failed permanently, so the UI can warn and offer export. */
let degraded = false;
export function isDegraded(): boolean {
  return degraded;
}

function storage(): Storage | null {
  try {
    if (typeof window === 'undefined') return null;
    const s = window.localStorage;
    // Safari private mode exposes localStorage but throws on setItem, so probe.
    const probe = '__teclas_probe__';
    s.setItem(probe, '1');
    s.removeItem(probe);
    return s;
  } catch {
    return null;
  }
}

function isQuotaError(e: unknown): boolean {
  return (
    e instanceof DOMException &&
    (e.name === 'QuotaExceededError' ||
      e.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      e.code === 22)
  );
}

/**
 * Shed the least valuable history to fit under quota. Applied in tiers, most
 * expendable first — a student's XP, stars and streak are never dropped.
 */
function shed(doc: ProgressDoc, tier: number): ProgressDoc {
  if (tier === 1) {
    return {
      ...doc,
      sessions: doc.sessions.slice(-20),
      streak: { ...doc.streak, practiceDays: doc.streak.practiceDays.slice(-120) },
    };
  }
  return {
    ...doc,
    sessions: [],
    streak: { ...doc.streak, practiceDays: doc.streak.practiceDays.slice(-60) },
  };
}

export function safeWrite(doc: ProgressDoc): WriteResult {
  const s = storage();
  if (!s) {
    degraded = true;
    return 'unavailable';
  }
  for (let tier = 0; tier <= 2; tier++) {
    try {
      s.setItem(STORAGE_KEY, JSON.stringify(tier === 0 ? doc : shed(doc, tier)));
      degraded = false;
      return 'ok';
    } catch (e) {
      if (!isQuotaError(e)) {
        degraded = true;
        return 'unavailable';
      }
    }
  }
  degraded = true;
  return 'quota';
}

/**
 * Read, migrate and validate. On any failure the raw string is preserved under
 * a timestamped key rather than deleted — a corrupt doc is still the only copy
 * of the student's history, and may be recoverable by hand.
 */
export function safeRead(): ProgressDoc | null {
  const s = storage();
  if (!s) return null;

  const raw = s.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed: unknown = JSON.parse(raw);
    return migrate(parsed);
  } catch (err) {
    console.warn('[teclas] progress unreadable, quarantining a copy', err);
    try {
      s.setItem(`${CORRUPT_KEY_PREFIX}${Date.now()}`, raw);
    } catch {
      /* best effort — if we're out of quota the backup is what has to go */
    }
    return null;
  }
}

export function clampDoc(doc: ProgressDoc): ProgressDoc {
  return {
    ...doc,
    schemaVersion: PROGRESS_SCHEMA_VERSION,
    sessions: doc.sessions.slice(-MAX_SESSIONS),
    streak: {
      ...doc.streak,
      practiceDays: doc.streak.practiceDays.slice(-MAX_PRACTICE_DAYS),
    },
  };
}
