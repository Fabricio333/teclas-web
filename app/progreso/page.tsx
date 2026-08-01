import { progresoMetadata } from '@/lib/metadata';
import ProgresoDashboard from './ProgresoDashboard';
import styles from './Progreso.module.scss';

export const metadata = progresoMetadata;

export default function ProgresoPage() {
  return (
    <section className={styles.progresoSection}>
      <div className="container">
        <h1 className={styles.title}>Mi progreso</h1>
        <p className={styles.subtitle}>
          Todo lo que practicaste, guardado en este navegador.
        </p>
        <ProgresoDashboard />
      </div>
    </section>
  );
}
