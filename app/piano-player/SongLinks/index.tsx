'use client';

import { useMemo, useState } from 'react';
import { LEVELS } from '@/lib/piano-player/songs';
import { useCurrentSongId } from '@/hooks/use-current-song';
import {
  DifficultyPills,
  SongGrid,
  filterSongs,
  type DifficultyFilter,
} from '@/components/SongCatalog';
import styles from './SongLinks.module.scss';

/**
 * Every song, as links.
 *
 * The player picks songs with its own browser, so before this existed no song
 * page was reachable by anything that only reads the prerendered HTML — the
 * same gap the listening games had before they got their permalinks. It is
 * also the first place in the app where a student can simply see what there is
 * to play without opening a dropdown one option at a time.
 *
 * Rendered on the hub and at the foot of every song page, so the crawl path
 * runs in both directions. Every song is a real anchor in the initial HTML: the
 * difficulty filter only hides cards a visitor asked to hide, and starts off.
 */
export default function SongLinks({ currentId }: { currentId?: string }) {
  // Marks whichever song the player has loaded, not just the one this page was
  // built for — on the hub that is how the list says what you are playing.
  const activeId = useCurrentSongId(currentId);
  const [difficulty, setDifficulty] = useState<DifficultyFilter>(null);

  const counts = useMemo(() => {
    const byDifficulty: Record<number, number> = {};
    for (const level of LEVELS) {
      byDifficulty[level.difficulty] =
        (byDifficulty[level.difficulty] ?? 0) + 1;
    }
    return byDifficulty;
  }, []);

  const songs = useMemo(() => filterSongs(difficulty, ''), [difficulty]);

  return (
    <nav className={`container ${styles.songLinks}`} aria-label="Canciones">
      <h2 className={styles.title}>Todas las canciones</h2>
      <p className={styles.lead}>
        Cada canción tiene su propia página: abrila para practicar solo esa, o
        copiá el link para mandársela a alguien.
      </p>

      <div className={styles.filters}>
        <DifficultyPills
          counts={counts}
          onChange={setDifficulty}
          value={difficulty}
        />
      </div>

      <SongGrid currentId={activeId} songs={songs} />
    </nav>
  );
}
