import Link from 'next/link';
import AnimatedTeclasHero from '@/components/AnimatedTeclasHero';
import styles from './Hero.module.scss';

export default function HeroSection() {
  return (
    <section className="sectionPadding">
      <div className="container">
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
            <p className={styles.heroSubtitle}>
              Domina el arte del piano con clases presenciales diseñadas para
              sacar al pianista que llevas dentro.
            </p>
            <Link
              href="https://docs.google.com/forms/d/e/1FAIpQLSenT_EzJoCuNDeRN6dQN38OdeJ8RBybZvxOkESqKQBYAObf8w/viewform?usp=dialog"
              className="btnPrimary"
            >
              Comienza hoy mismo
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
