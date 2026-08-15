import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMapPin, faPhone } from '@fortawesome/free-solid-svg-icons';
import BrandIcon from '@/components/BrandIcon';
import styles from './Footer.module.scss';

/**
 * Every page a visitor should be able to reach on their own.
 *
 * The header only carries five links and `/events` is commented out there, so
 * without this the events page and all three practice tools were reachable
 * only by typing the URL or by already being inside another tool.
 *
 * Labels are the site's own — the header's for sections, the cards on
 * `/resources` for the tools — so the same page is never called two things.
 *
 * Deliberately absent: `/calibracion`, a device setup step reached from the
 * tool that needs it rather than a destination.
 */
const SECTIONS = [
  { href: '/', label: 'Inicio' },
  { href: '/#about-academy', label: 'La Academia' },
  { href: '/#about-teacher', label: 'La Profesora' },
  { href: '/events', label: 'Eventos' },
  { href: '/resources', label: 'Recursos' },
  { href: '/faq', label: 'Preguntas Frecuentes' },
];

const TOOLS = [
  { href: '/piano-player', label: 'Aprende Piano' },
  { href: '/ear-training', label: 'Entrenamiento Auditivo' },
  { href: '/progreso', label: 'Mi progreso' },
];

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className="container">
        <div className={styles.footerWrapper}>
          <div className={styles.footerAbout}>
            <h3 className={styles.footerTitle}>Teclas Ciudad Jardín</h3>
            <p className={styles.footerText}>
              Clases de piano personalizadas, diseñadas para dejar salir el
              pianista que hay en vos.
            </p>
            <div className={styles.footerLocation}>
              <FontAwesomeIcon icon={faMapPin} className={styles.icon} />
              <p>
                Blvd. F.i.n.c.a 6142 Local 12, Ciudad Jardín Lomas del Palomar,
                Provincia de Buenos Aires
              </p>
            </div>
          </div>

          <nav className={styles.footerNav} aria-label="Secciones del sitio">
            <h3 className={styles.footerTitle}>Navegación</h3>
            <ul className={styles.navList}>
              {SECTIONS.map((item) => (
                <li key={item.href}>
                  <Link href={item.href}>{item.label}</Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav className={styles.footerNav} aria-label="Herramientas">
            <h3 className={styles.footerTitle}>Herramientas</h3>
            <ul className={styles.navList}>
              {TOOLS.map((item) => (
                <li key={item.href}>
                  <Link href={item.href}>{item.label}</Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className={styles.footerContact}>
            <h3 className={styles.footerTitle}>Contacto</h3>
            <div className={styles.contactContent}>
              <p>
                <FontAwesomeIcon icon={faPhone} className={styles.icon} />
                <a href="tel:+541134162288">(+54) 9 11 3416-2288</a>
              </p>
              <Link
                href="https://www.instagram.com/teclas.ciudadjardin/"
                className={styles.socialLink}
              >
                <BrandIcon
                  brand="instagram"
                  gradientId="teclas-instagram-footer"
                  className={styles.brandIcon}
                />
                <span>teclas.ciudadjardin</span>
              </Link>
            </div>
          </div>
        </div>

        <div className={styles.footerBottom}>
          <p>
            &copy; {new Date().getFullYear()} Teclas Ciudad Jardín. Todos los
            derechos reservados.
          </p>
          <a
            href="https://www.teclas.ar"
            target="_blank"
            rel="noopener"
            aria-label="teclas.ar, plataforma para profes de música"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- this badge is
                intentionally hotlinked from teclas.ar for the backlink embed. */}
            <img
              src="https://www.teclas.ar/teclas-ar-badge.svg"
              alt="teclas.ar, plataforma para profes de música"
              width="240"
              height="56"
            />
          </a>
        </div>
      </div>
    </footer>
  );
}
