import Link from 'next/link';
import {
  EAR_TRAINING_MODES,
  earTrainingModePath,
  type EarTrainingMode,
} from '@/lib/ear-training/modes';
import styles from './ModeIntro.module.scss';

/**
 * Heading and intro of a game's own page.
 *
 * The games render their own `<h2>` card title, so on the hub the page has no
 * `<h1>` at all. Here the mode's page gets one, plus a couple of lines saying
 * what the exercise is — enough that the page stands on its own for a reader
 * arriving from search instead of being a bare copy of the hub.
 *
 * The trailing links are the crawl path in both directions: back up to the hub
 * and across to the other game.
 */
export default function ModeIntro({ mode }: { mode: EarTrainingMode }) {
  const others = EAR_TRAINING_MODES.filter((m) => m.slug !== mode.slug);

  return (
    <header className={`container ${styles.intro}`}>
      <h1 className={styles.title}>{mode.heading}</h1>
      <p className={styles.tagline}>{mode.tagline}</p>
      {mode.body.map((paragraph) => (
        <p key={paragraph} className={styles.body}>
          {paragraph}
        </p>
      ))}
      <p className={styles.links}>
        <Link href="/ear-training" className={styles.link}>
          Todos los juegos de oído
        </Link>
        {others.map((other) => (
          <Link
            key={other.slug}
            href={earTrainingModePath(other.slug)}
            className={styles.link}
          >
            {other.name}
          </Link>
        ))}
      </p>
    </header>
  );
}
