import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faMusic,
  faHeadphones,
  faChartLine,
  faArrowRight,
} from '@fortawesome/free-solid-svg-icons';
import { resourcesMetadata } from '@/lib/metadata';
import styles from './Resources.module.scss';

export const metadata = resourcesMetadata;

export default function ResourcesPage() {
  return (
    <section className={styles.resourcesSection}>
      <div className="container">
        <h1 className={styles.title}>Recursos</h1>
        <p className={styles.subtitle}>
          Explorá nuestras herramientas interactivas para mejorar tu práctica de
          piano.
        </p>

        <div className={styles.grid}>
          <Link href="/piano-player" className={styles.card}>
            <FontAwesomeIcon icon={faMusic} className={styles.cardIcon} />
            <h2 className={styles.cardTitle}>Aprende Piano</h2>
            <p className={styles.cardDescription}>
              Seguí las notas en la partitura y tocá canciones clásicas usando
              tu teclado o haciendo clic en las teclas del piano.
            </p>
            <span className={styles.arrow}>
              <FontAwesomeIcon icon={faArrowRight} />
            </span>
          </Link>

          <Link href="/ear-training" className={styles.card}>
            <FontAwesomeIcon icon={faHeadphones} className={styles.cardIcon} />
            <h2 className={styles.cardTitle}>Entrenamiento Auditivo</h2>
            <p className={styles.cardDescription}>
              Escuchá las notas y encontralas en el piano. Mejorá tu oído
              musical con ejercicios interactivos.
            </p>
            <span className={styles.arrow}>
              <FontAwesomeIcon icon={faArrowRight} />
            </span>
          </Link>

          <Link href="/progreso" className={styles.card}>
            <FontAwesomeIcon icon={faChartLine} className={styles.cardIcon} />
            <h2 className={styles.cardTitle}>Mi progreso</h2>
            <p className={styles.cardDescription}>
              Mirá tu nivel, tu racha de práctica y los logros que fuiste
              consiguiendo. Se guarda en este navegador.
            </p>
            <span className={styles.arrow}>
              <FontAwesomeIcon icon={faArrowRight} />
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}
