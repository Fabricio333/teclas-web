import { calibracionMetadata } from '@/lib/metadata';
import CalibrationWizard from '@/components/CalibrationWizard';
import styles from './Calibracion.module.scss';

export const metadata = calibracionMetadata;

export default function CalibracionPage() {
  return (
    <section className={styles.calibracionSection}>
      <div className="container">
        <h1 className={styles.title}>Calibrar el micrófono</h1>
        <p className={styles.subtitle}>
          Para que Teclas reconozca mejor las notas de tu instrumento.
        </p>
        <CalibrationWizard />
      </div>
    </section>
  );
}
