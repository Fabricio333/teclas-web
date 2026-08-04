'use client';

import Link from 'next/link';
import {
  getLevelById,
  isGrandStaff,
  type Level,
} from '@/lib/piano-player/songs';
import { difficultyLabel, getSongPage } from '@/lib/piano-player/songPages';
import { useCurrentSongId } from '@/hooks/use-current-song';
import styles from './SongIntro.module.scss';

/**
 * Heading and intro of a song's own page.
 *
 * The player renders its own `<h2>` ("Aprende Piano"), so on the hub there is
 * no `<h1>` at all. Here the song gets one, plus a couple of lines about the
 * piece — enough that the page stands on its own for someone arriving from a
 * shared link or from search, instead of being the hub with a different song
 * loaded.
 *
 * It follows the picker rather than staying on the song the page was built
 * for: switching songs rewrites the address bar and re-renders the score, and
 * a heading still naming the previous piece would contradict both. The server
 * still renders this page's own song, so the prerendered HTML — the thing a
 * crawler reads — is unchanged.
 *
 * The facts underneath come from the level itself, so they cannot describe a
 * piece the game does not play.
 */
export default function SongIntro({ level }: { level: Level }) {
  const currentId = useCurrentSongId(level.id);
  // The development-only debug level has no page and no copy; fall back to the
  // song this page is about rather than rendering an empty header.
  const shown = (currentId && getLevelById(currentId)) || level;
  const page = getSongPage(shown);

  return (
    <header className={`container ${styles.intro}`}>
      <h1 className={styles.title}>{page.heading}</h1>
      <p className={styles.tagline}>{page.tagline}</p>

      {page.body.map((paragraph) => (
        <p key={paragraph} className={styles.body}>
          {paragraph}
        </p>
      ))}

      <dl className={styles.facts}>
        <div className={styles.fact}>
          <dt>Nivel</dt>
          <dd>{difficultyLabel(shown)}</dd>
        </div>
        <div className={styles.fact}>
          <dt>Notas</dt>
          <dd>{shown.notes.length}</dd>
        </div>
        <div className={styles.fact}>
          <dt>Manos</dt>
          <dd>{isGrandStaff(shown) ? 'Derecha o izquierda' : 'Derecha'}</dd>
        </div>
      </dl>

      <p className={styles.links}>
        <Link href="/piano-player" className={styles.link}>
          Todas las canciones
        </Link>
        <Link href="/ear-training" className={styles.link}>
          Juegos de oído
        </Link>
      </p>
    </header>
  );
}
