import Image from 'next/image';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faInstagram, faYoutube } from '@fortawesome/free-brands-svg-icons';
import AmbientNotes from '@/components/AmbientNotes';
import Reveal from '@/components/Reveal';
import styles from './AboutTeacher.module.scss';

export default function AboutTeacher() {
  return (
    <section className={styles.about} id="about-teacher">
      <AmbientNotes density="normal" tone="light" />
      <div className={`container ${styles.inner}`}>
        <div className={styles.instructorGrid}>
          <Reveal className={styles.imageWrapper} variant="left">
            <Image
              src="/roxana.webp"
              alt="Instructora de piano frente al piano"
              fill
              className={styles.instructorImage}
            />
          </Reveal>
          <Reveal className={styles.instructorText} delay={120} variant="right">
            <div className={styles.textCenter}>
              <h1 className={styles.sectionTitle}>Conocé tu instructora</h1>
              <div className="decorativeLine"></div>
            </div>
            <div className={styles.instructorBio}>
              <p>
                Roxana Arena comenzó sus estudios musicales en el Conservatorio
                Beethoven de Córdoba Capital a los 6 años, y posteriormente
                estudió Composición y Educación Musical en la Universidad
                Nacional de Córdoba. Desde los 14 años se dedicó a dar clases
                particulares, actividad que continuó luego de graduarse,
                fundando así la academia Teclas. Desarrolló un método propio
                para aprender música de manera interactiva, divertida y
                efectiva, obteniendo rápidos resultados.
              </p>
              <p>
                Ha ejercido como maestra de música en niveles preescolar,
                primaria y secundaria, especializándose en principiantes y niños
                a partir de los 4 años. Ha guiado a diversos estudiantes en su
                preparación para exámenes de conservatorio y presentaciones en
                conciertos, acompañándolos en su desarrollo musical y artístico.
              </p>
            </div>
            <div className={styles.socialLinks}>
              <Link
                aria-label="Instagram de Teclas Ciudad Jardín"
                href="https://www.instagram.com/teclas.ciudadjardin/"
                className={styles.socialLink}
              >
                <FontAwesomeIcon icon={faInstagram} size="2x" />
              </Link>
              <Link
                aria-label="Canal de YouTube de Roxana Arena"
                href="https://www.youtube.com/@roxanaarena618"
                className={styles.socialLink}
              >
                <FontAwesomeIcon icon={faYoutube} size="2x" />
              </Link>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
