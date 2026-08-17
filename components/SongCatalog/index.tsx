'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { LEVELS, songPath, type Level } from '@/lib/piano-player/songs';
import { useProgress, useHydrated } from '@/lib/progress';
import styles from './SongCatalog.module.scss';

/**
 * The song list, as a set of parts two screens share.
 *
 * The player's picker and the list at the foot of the page were describing the
 * same nineteen songs in two different vocabularies — a `<select>` of stars and
 * names, and three columns of underlined links. Neither let a student say "show
 * me the easy ones". Both now draw the same card and the same filter from here,
 * so learning one teaches the other.
 */

/** Difficulty headings. The wording is the one the song list has always used. */
export const GROUPS: { difficulty: Level['difficulty']; title: string }[] = [
  { difficulty: 1, title: 'Para empezar' },
  { difficulty: 2, title: 'Intermedias' },
  { difficulty: 3, title: 'Avanzadas' },
];

export const stars = (difficulty: number) => '⭐'.repeat(difficulty);

/** `null` is "Todas" — no filter rather than a fourth difficulty. */
export type DifficultyFilter = Level['difficulty'] | null;

export function useDifficultyFilter() {
  return useState<DifficultyFilter>(null);
}

export function filterSongs(
  difficulty: DifficultyFilter,
  query: string,
): Level[] {
  const q = query.trim().toLowerCase();
  return LEVELS.filter(
    (level) =>
      (difficulty === null || level.difficulty === difficulty) &&
      (q === '' || level.name.toLowerCase().includes(q)),
  );
}

/**
 * The Todas / ⭐ / ⭐⭐ / ⭐⭐⭐ row.
 *
 * Shaped like the segmented control in the player's Ajustes panel, because it
 * does the same job: a handful of options, one tap each, and the current one
 * readable without opening anything.
 */
export function DifficultyPills({
  value,
  onChange,
  counts,
}: {
  value: DifficultyFilter;
  onChange: (value: DifficultyFilter) => void;
  /** How many songs each pill would show, so an empty filter is visible up front. */
  counts?: Record<number, number>;
}) {
  const options: { value: DifficultyFilter; label: string; hint?: string }[] = [
    { value: null, label: 'Todas' },
    ...GROUPS.map((g) => ({
      value: g.difficulty as DifficultyFilter,
      label: stars(g.difficulty),
      hint: g.title,
    })),
  ];

  return (
    <div className={styles.pills} role="group" aria-label="Filtrar por nivel">
      {options.map((option) => {
        const count =
          option.value === null
            ? Object.values(counts ?? {}).reduce((a, b) => a + b, 0)
            : counts?.[option.value];
        return (
          <button
            aria-pressed={value === option.value}
            className={`${styles.pill} ${value === option.value ? styles.pillOn : ''}`}
            key={option.label}
            onClick={() => onChange(option.value)}
            title={option.hint}
            type="button"
          >
            <span aria-hidden={option.value !== null}>{option.label}</span>
            {option.hint && (
              <span className={styles.pillHint}>{option.hint}</span>
            )}
            {counts && <span className={styles.pillCount}>{count ?? 0}</span>}
          </button>
        );
      })}
    </div>
  );
}

/**
 * One song.
 *
 * Always a real anchor, even inside the player's dialog, so a crawler can find
 * every song page and a student can middle-click one open — the dialog only
 * intercepts the plain left click to switch in place.
 */
export function SongCard({
  level,
  current,
  onPick,
}: {
  level: Level;
  current?: boolean;
  /** Called instead of navigating, for surfaces that switch song in place. */
  onPick?: (level: Level) => void;
}) {
  // Stars earned, not difficulty — this is the one thing the old list could not
  // show, and it is what turns a list of names into somewhere to come back to.
  const hydrated = useHydrated();
  const earned = useProgress((doc) => doc.songs[level.id]?.stars ?? 0);

  return (
    <Link
      aria-current={current ? 'page' : undefined}
      className={`${styles.card} ${current ? styles.cardCurrent : ''}`}
      href={songPath(level.id)}
      onClick={(e) => {
        // Let the browser have modified clicks: they mean "open it over there".
        if (!onPick || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        onPick(level);
      }}
    >
      <span className={styles.cardName}>{level.name}</span>
      {/* All on one line under the name. "Sonando ahora" used to be pinned to
          the card's top-right corner, where on a narrow card it landed on top
          of the title. */}
      <span className={styles.cardMeta}>
        <span
          aria-label={`Nivel ${level.difficulty}`}
          className={styles.cardStars}
        >
          {stars(level.difficulty)}
        </span>
        <span>{level.notes.length} notas</span>
        {hydrated && earned > 0 && (
          <span
            className={styles.cardEarned}
            title={`${earned} de 3 estrellas`}
          >
            {'★'.repeat(earned)}
            <span className={styles.cardEarnedDim}>
              {'★'.repeat(3 - earned)}
            </span>
          </span>
        )}
        {current && (
          <span className={styles.cardCurrentTag}>Sonando ahora</span>
        )}
      </span>
    </Link>
  );
}

/** The cards, grouped under their difficulty heading. */
export function SongGrid({
  songs,
  currentId,
  onPick,
  headings = true,
}: {
  songs: Level[];
  currentId?: string;
  onPick?: (level: Level) => void;
  headings?: boolean;
}) {
  const grouped = useMemo(
    () =>
      GROUPS.map((group) => ({
        ...group,
        songs: songs.filter((level) => level.difficulty === group.difficulty),
      })).filter((group) => group.songs.length > 0),
    [songs],
  );

  if (grouped.length === 0) {
    return <p className={styles.empty}>No hay canciones con ese nombre.</p>;
  }

  return (
    <div className={styles.groups}>
      {grouped.map((group) => (
        <section key={group.difficulty}>
          {headings && (
            <h3 className={styles.groupTitle}>
              <span aria-hidden="true">{stars(group.difficulty)}</span>{' '}
              {group.title}
            </h3>
          )}
          <div className={styles.grid}>
            {group.songs.map((level) => (
              <SongCard
                current={level.id === currentId}
                key={level.id}
                level={level}
                onPick={onPick}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
