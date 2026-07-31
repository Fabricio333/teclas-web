import eventJsonLd from '@/lib/seo/event';
import { eventsMetadata } from '@/lib/metadata';
import styles from './Events.module.scss';

export { eventsMetadata as metadata };

export default function EventsPage() {
  return (
    <section className={styles.eventsSection}>
      {/*
        Previously this schema was returned from `export function Head()`, which
        the App Router ignores entirely — so the Event JSON-LD never reached the
        page. Rendering it inline matches how /faq, /piano-player and
        /ear-training already emit theirs. The schema content is unchanged.
      */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(eventJsonLd) }}
      />
      <div className="container">
        <h1 className={styles.title}>Próximos Eventos</h1>
        <div className={styles.eventCard}>
          <h2 className={styles.eventTitle}>Piano Workshop in Ciudad Jardín</h2>
          <p className={styles.eventMeta}>
            01 de Septiembre de 2024, 10:00 hs.
          </p>
          <p className={styles.eventMeta}>
            Taller intensivo de piano para todos los niveles.
          </p>
          <a href="tel:+541134162288" className={styles.eventLink}>
            Contactar para inscripción
          </a>
        </div>
      </div>
    </section>
  );
}
