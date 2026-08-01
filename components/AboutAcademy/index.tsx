import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMusic, faAward, faUsers } from '@fortawesome/free-solid-svg-icons';
import AmbientNotes from '@/components/AmbientNotes';
import Reveal from '@/components/Reveal';
import styles from './AboutAcademy.module.scss';

export default function AboutAcademy() {
  return (
    <section className={styles.featuresSection} id="about-academy">
      <AmbientNotes density="sparse" tone="brand" />
      <div className={`container ${styles.inner}`}>
        <Reveal className={styles.sectionHeader}>
          <h1 className={styles.sectionTitle}>
            ¿Por qué elegir nuestra academia?
          </h1>
          <div className="decorativeLine"></div>
        </Reveal>

        <div className={styles.featuresGrid}>
          {/*
            <Reveal> wraps the card rather than being it: both define their own
            `transition`, and whichever module's stylesheet loaded last would
            have won the whole shorthand. The accent colour moved from
            `:nth-child()` to an explicit class for the same reason — inside a
            wrapper every card is child #1.
          */}
          <Reveal delay={0}>
            <div className={`${styles.featureCard} ${styles.accentBlue}`}>
              <div className={styles.iconWrapper}>
                <FontAwesomeIcon icon={faMusic} className={styles.icon} />
              </div>
              <h3 className={styles.cardTitle}>Enfoque personalizado</h3>
              <p className={styles.cardDescription}>
                Clases adaptadas a tu nivel, objetivos y estilo de aprendizaje
                para un progreso óptimo.
              </p>
            </div>
          </Reveal>

          <Reveal delay={110}>
            <div className={`${styles.featureCard} ${styles.accentPurple}`}>
              <div className={styles.iconWrapper}>
                <FontAwesomeIcon icon={faAward} className={styles.icon} />
              </div>
              <h3 className={styles.cardTitle}>Instrucción experta</h3>
              <p className={styles.cardDescription}>
                Aprende de instructores experimentados con formación académica y
                experiencia escénica.
              </p>
            </div>
          </Reveal>

          <Reveal delay={220}>
            <div className={`${styles.featureCard} ${styles.accentOrange}`}>
              <div className={styles.iconWrapper}>
                <FontAwesomeIcon icon={faUsers} className={styles.icon} />
              </div>
              <h3 className={styles.cardTitle}>Comunidad de apoyo</h3>
              <p className={styles.cardDescription}>
                Únete a una comunidad de pianistas con recitales regulares y
                oportunidades de actuación.
              </p>
            </div>
          </Reveal>
        </div>

        <Reveal className={styles.mapWrapper} variant="scale">
          <iframe
            title="Ubicación de Teclas en Ciudad Jardín Lomas del Palomar"
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3284.1932270987486!2d-58.5877735!3d-34.59927509999999!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x95bcb92b272dead5%3A0xd423ce89aadcbad6!2sTECLAS!5e0!3m2!1sen!2sar!4v1751302593673!5m2!1sen!2sar"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          ></iframe>
        </Reveal>
      </div>
    </section>
  );
}
