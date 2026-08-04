import Link from 'next/link';
import { isGrandStaff, type Level } from '@/lib/piano-player/songs';
import { difficultyLabel, getSongPage } from '@/lib/piano-player/songPages';
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
 * The facts underneath come from the level itself, so they cannot describe a
 * piece the game does not play.
 */
export default function SongIntro({ level }: { level: Level }) {
  const page = getSongPage(level);

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
          <dd>{difficultyLabel(level)}</dd>
        </div>
        <div className={styles.fact}>
          <dt>Notas</dt>
          <dd>{level.notes.length}</dd>
        </div>
        <div className={styles.fact}>
          <dt>Manos</dt>
          <dd>{isGrandStaff(level) ? 'Derecha o izquierda' : 'Derecha'}</dd>
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
