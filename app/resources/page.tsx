import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faMusic,
  faHeadphones,
  faChartLine,
  faArrowRight,
} from '@fortawesome/free-solid-svg-icons';
import AmbientNotes from '@/components/AmbientNotes';
import Reveal from '@/components/Reveal';
import { resourcesMetadata } from '@/lib/metadata';
import styles from './Resources.module.scss';

export const metadata = resourcesMetadata;

export default function ResourcesPage() {
  return (
    <section className={styles.resourcesSection}>
      <AmbientNotes density="sparse" tone="brand" />
      <div className={`container ${styles.inner}`}>
        <Reveal className={styles.header}>
          <h1 className={styles.title}>Recursos</h1>
          <div className="decorativeLine"></div>
          <p className={styles.subtitle}>
            Explorá nuestras herramientas interactivas para mejorar tu práctica
            de piano.
          </p>
        </Reveal>

        <div className={styles.grid}>
          {/*
            <Reveal> wraps each card rather than being it: both define their own
            `transition`, and whichever stylesheet loaded last would win the
            whole shorthand.
          */}
          <Reveal delay={0}>
            <Link
              href="/piano-player"
              className={`${styles.card} ${styles.cardBlue}`}
            >
              <span className={styles.cardIconWrapper}>
                <FontAwesomeIcon icon={faMusic} className={styles.cardIcon} />
              </span>
              <h2 className={styles.cardTitle}>Aprende Piano</h2>
              <p className={styles.cardDescription}>
                Seguí las notas en la partitura y tocá canciones clásicas usando
                tu teclado o haciendo clic en las teclas del piano.
              </p>
              <span className={styles.arrow}>
                <FontAwesomeIcon icon={faArrowRight} />
              </span>
            </Link>
          </Reveal>

          <Reveal delay={90}>
            <Link
              href="/ear-training"
              className={`${styles.card} ${styles.cardPurple}`}
            >
              <span className={styles.cardIconWrapper}>
                <FontAwesomeIcon
                  icon={faHeadphones}
                  className={styles.cardIcon}
                />
              </span>
              <h2 className={styles.cardTitle}>Entrenamiento Auditivo</h2>
              <p className={styles.cardDescription}>
                Escuchá las notas y encontralas en el piano. Mejorá tu oído
                musical con ejercicios interactivos.
              </p>
              <span className={styles.arrow}>
                <FontAwesomeIcon icon={faArrowRight} />
              </span>
            </Link>
          </Reveal>

          {/*
            The "Calibrar el micrófono" card used to sit here. Calibration is
            setup, not a thing you come here to practise — it now surfaces in
            the first-run prompt and in the practice apps' Ajustes panel, where
            it is actually needed. /calibracion still exists and both of those
            link to it.
          */}

          <Reveal delay={180}>
            <Link
              href="/progreso"
              className={`${styles.card} ${styles.cardPink}`}
            >
              <span className={styles.cardIconWrapper}>
                <FontAwesomeIcon
                  icon={faChartLine}
                  className={styles.cardIcon}
                />
              </span>
              <h2 className={styles.cardTitle}>Mi progreso</h2>
              <p className={styles.cardDescription}>
                Mirá tu nivel, tu racha de práctica y los logros que fuiste
                consiguiendo. Se guarda en este navegador.
              </p>
              <span className={styles.arrow}>
                <FontAwesomeIcon icon={faArrowRight} />
              </span>
            </Link>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
