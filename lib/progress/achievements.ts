import type { ProgressDoc } from './schema';

export type AchievementTier = 'bronce' | 'plata' | 'oro';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  tier: AchievementTier;
  xp: number;
  /** Pure predicate over the document *after* the event was folded in. */
  earned: (doc: ProgressDoc, ctx: AchievementContext) => boolean;
}

export interface AchievementContext {
  /** Local hour of the session that just finished, 0-23. */
  hour: number;
  /** Days since the previous session, or null if this is the first. */
  daysSinceLastSession: number | null;
  lastRunAccuracy: number | null;
  lastRunCompleted: boolean;
}

const XP_BY_TIER: Record<AchievementTier, number> = {
  bronce: 25,
  plata: 75,
  oro: 200,
};

function a(
  id: string,
  name: string,
  description: string,
  tier: AchievementTier,
  earned: Achievement['earned'],
): Achievement {
  return { id, name, description, tier, xp: XP_BY_TIER[tier], earned };
}

/**
 * Copy notes: every string is Argentine Spanish with voseo, and none of it is
 * loss-framed. `de-vuelta` deliberately rewards coming back rather than
 * shaming the absence.
 */
export const ACHIEVEMENTS: Achievement[] = [
  a('primera-nota', 'Primera nota', 'Tocaste tu primera nota', 'bronce', (d) =>
    d.stats.totalNotes > 0,
  ),
  a(
    'primera-cancion',
    'Tu primera canción',
    'Completaste una pieza entera',
    'bronce',
    (d) => Object.values(d.songs).some((s) => s.stars > 0),
  ),
  a('cien-notas', 'Cien notas', 'Tocaste 100 notas', 'bronce', (d) =>
    d.stats.totalNotes >= 100,
  ),
  a('mil-notas', 'Mil notas', 'Tocaste 1000 notas', 'plata', (d) =>
    d.stats.totalNotes >= 1000,
  ),
  a('racha-3', 'Tres días seguidos', 'Practicaste 3 días seguidos', 'bronce', (d) =>
    d.streak.current >= 3,
  ),
  a('racha-7', 'Una semana entera', 'Practicaste 7 días seguidos', 'plata', (d) =>
    d.streak.current >= 7,
  ),
  a('racha-30', 'Un mes sin faltar', 'Practicaste 30 días seguidos', 'oro', (d) =>
    d.streak.current >= 30,
  ),
  a('racha-100', 'Cien días', 'Practicaste 100 días seguidos', 'oro', (d) =>
    d.streak.current >= 100,
  ),
  a(
    'impecable',
    'Impecable',
    'Completaste una pieza sin ningún error',
    'plata',
    (_d, c) => c.lastRunCompleted && c.lastRunAccuracy === 1,
  ),
  a(
    'tres-estrellas',
    'Tres estrellas',
    'Conseguiste 3 estrellas en una pieza',
    'plata',
    (d) => Object.values(d.songs).some((s) => s.stars === 3),
  ),
  a(
    'perfeccionista',
    'Perfeccionista',
    'Conseguiste 3 estrellas en 10 piezas',
    'oro',
    (d) => Object.values(d.songs).filter((s) => s.stars === 3).length >= 10,
  ),
  a(
    'coleccionista',
    'Coleccionista',
    'Tocaste 20 piezas distintas',
    'plata',
    (d) => Object.keys(d.songs).length >= 20,
  ),
  a('madrugadora', 'Madrugador/a', 'Practicaste antes de las 8 de la mañana', 'bronce',
    (_d, c) => c.hour < 8,
  ),
  a('noctambula', 'Noctámbulo/a', 'Practicaste después de las 11 de la noche', 'bronce',
    (_d, c) => c.hour >= 23,
  ),
  a(
    'maraton',
    'Maratón',
    'Practicaste media hora en un solo día',
    'plata',
    (d) => d.stats.totalPracticeMs >= 30 * 60_000,
  ),
  a(
    'oido-fino',
    'Oído fino',
    'Encadenaste 20 respuestas correctas de oído',
    'plata',
    (d) => Object.values(d.exercises).some((e) => e.bestStreak >= 20),
  ),
  a(
    'de-vuelta',
    'De vuelta',
    'Volviste después de dos semanas',
    'bronce',
    (_d, c) => (c.daysSinceLastSession ?? 0) >= 14,
  ),
];

export const ACHIEVEMENTS_BY_ID: ReadonlyMap<string, Achievement> = new Map(
  ACHIEVEMENTS.map((x) => [x.id, x]),
);

/** Achievements newly satisfied by this document that aren't already recorded. */
export function newlyEarned(
  doc: ProgressDoc,
  ctx: AchievementContext,
): Achievement[] {
  return ACHIEVEMENTS.filter(
    (x) => !doc.rewards.achievements[x.id] && x.earned(doc, ctx),
  );
}
