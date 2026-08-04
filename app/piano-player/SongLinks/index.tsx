'use client';

import Link from 'next/link';
import { LEVELS, songPath, type Level } from '@/lib/piano-player/songs';
import { useCurrentSongId } from '@/hooks/use-current-song';
import styles from './SongLinks.module.scss';

/**
 * Every song, as links.
 *
 * The player picks songs with a `<select>`, so before this existed no song
 * page was reachable by anything that only reads the prerendered HTML — the
 * same gap the listening games had before they got their permalinks. It is
 * also the first place in the app where a student can simply see what there is
 * to play without opening a dropdown one option at a time.
 *
 * Rendered on the hub and at the foot of every song page, so the crawl path
 * runs in both directions.
 */
const GROUPS: { difficulty: Level['difficulty']; title: string }[] = [
  { difficulty: 1, title: 'Para empezar' },
  { difficulty: 2, title: 'Intermedias' },
  { difficulty: 3, title: 'Avanzadas' },
];

export default function SongLinks({ currentId }: { currentId?: string }) {
  // Marks whichever song the player has loaded, not just the one this page was
  // built for — on the hub that is how the list says what you are playing.
  const activeId = useCurrentSongId(currentId);

  return (
    <nav className={`container ${styles.songLinks}`} aria-label="Canciones">
      <h2 className={styles.title}>Todas las canciones</h2>
      <p className={styles.lead}>
        Cada canción tiene su propia página: abrila para practicar solo esa, o
        copiá el link para mandársela a alguien.
      </p>

      <div className={styles.groups}>
        {GROUPS.map((group) => (
          <section key={group.difficulty}>
            <h3 className={styles.groupTitle}>
              <span aria-hidden="true">{'⭐'.repeat(group.difficulty)}</span>{' '}
              {group.title}
            </h3>
            <ul className={styles.list}>
              {LEVELS.filter(
                (level) => level.difficulty === group.difficulty,
              ).map((level) => (
                <li key={level.id}>
                  {level.id === activeId ? (
                    <span className={styles.current} aria-current="page">
                      {level.name}
                    </span>
                  ) : (
                    <Link href={songPath(level.id)} className={styles.link}>
                      {level.name}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </nav>
  );
}
