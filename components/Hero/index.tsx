import Link from 'next/link';
import AmbientNotes from '@/components/AmbientNotes';
import AnimatedTeclasHero from '@/components/AnimatedTeclasHero';
import ScrollCue from '@/components/ScrollCue';
import styles from './Hero.module.scss';

export default function HeroSection() {
  return (
    <section className={`sectionPadding ${styles.hero}`}>
      {/*
        Brand-tinted rather than white: this section sits on a white surface,
        where white glyphs would be invisible. The coloured bands below use
        `tone="light"`.
      */}
      <AmbientNotes density="sparse" tone="brand" />
      <div className={`container ${styles.heroInner}`}>
        <div className={styles.heroGrid}>
          <div className={styles.heroImageWrapper}>
            <AnimatedTeclasHero />
          </div>
          <div className={styles.heroContent}>
            <h1 className={styles.heroTitle}>
              <span>Clases de Piano</span>
              <br />
              <span>Ciudad Jardín, Buenos Aires</span>
            </h1>
            <div className={`decorativeLine ${styles.heroRule}`} />
            <p className={styles.heroSubtitle}>
              Domina el arte del piano con clases presenciales diseñadas para
              sacar al pianista que llevas dentro.
            </p>
            <Link
              href="https://docs.google.com/forms/d/e/1FAIpQLSenT_EzJoCuNDeRN6dQN38OdeJ8RBybZvxOkESqKQBYAObf8w/viewform?usp=dialog"
              className={`btnPrimary ${styles.heroCta}`}
            >
              Comienza hoy mismo
            </Link>
          </div>
        </div>

        <ScrollCue href="#events" className={styles.scrollCue} />
      </div>
    </section>
  );
}
