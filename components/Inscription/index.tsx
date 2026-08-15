import Link from 'next/link';
import AmbientNotes from '@/components/AmbientNotes';
import Reveal from '@/components/Reveal';
import styles from './Inscription.module.scss';

// `'use client'` was here but nothing in this component needed it — no state,
// no effects, no event handlers. The interactivity now lives inside <Reveal>,
// which is the only client boundary this section needs.
export default function Inscription() {
  return (
    <section id="inscription" className={styles.inscriptionSection}>
      <AmbientNotes density="dense" tone="plum" />
      <div className={`container ${styles.inner}`}>
        <Reveal>
          <h2 className={styles.sectionTitle}>
            ¿Listo para comenzar tu viaje en el piano?
          </h2>
          <p className={styles.sectionSubtitle}>
            Únete a nuestra academia hoy y descubre la alegría de tocar el piano
            con la guía de expertos.
          </p>
          <Link
            href="https://docs.google.com/forms/d/e/1FAIpQLSenT_EzJoCuNDeRN6dQN38OdeJ8RBybZvxOkESqKQBYAObf8w/viewform?usp=dialog"
            className={`btnPrimary ${styles.cta}`}
          >
            Inscribirme ahora
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
