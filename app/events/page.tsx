import Image from 'next/image';
import Link from 'next/link';
import {
  pastEvents,
  upcomingEvents,
  whatsappUrl,
  type TeclasEvent,
} from '@/lib/events';
import { eventsMetadata } from '@/lib/metadata';
import styles from './Events.module.scss';

export { eventsMetadata as metadata };

function EventCard({ event }: { event: TeclasEvent }) {
  const isPast = event.status === 'past';

  return (
    <article
      className={`${styles.eventCard} ${isPast ? styles.pastEventCard : ''}`}
    >
      {/*
        Whole-card click target. A real anchor rather than a `::after` overlay:
        Chromium paints the pseudo-element above the pills whatever z-index it
        is given, which swallowed the WhatsApp link. Hidden from assistive tech
        and from the tab order — the visible "Leer más" pill below is the same
        destination and is the one keyboard users reach.
      */}
      <Link
        href={`/events/${event.slug}`}
        className={styles.cardOverlay}
        aria-hidden="true"
        tabIndex={-1}
      />
      <div className={styles.eventThumb}>
        <Image
          src={event.image}
          alt={event.imageAlt}
          width={480}
          height={360}
          className={styles.eventThumbImage}
        />
      </div>
      <div className={styles.eventBody}>
        {isPast && <span className={styles.pastBadge}>Finalizado</span>}
        <h2 className={styles.eventTitle}>{event.title}</h2>
        {event.subtitle && (
          <p className={styles.eventSubtitle}>{event.subtitle}</p>
        )}
        <p className={styles.eventMeta}>{event.date}</p>
        <p className={styles.eventMeta}>{event.summary}</p>
        <div className={styles.eventActions}>
          <a
            href={whatsappUrl(event.whatsappMessage)}
            target="_blank"
            rel="noopener noreferrer"
            className={`${styles.pill} ${styles.pillPrimary}`}
          >
            {event.ctaLabel}
          </a>
          <Link
            href={`/events/${event.slug}`}
            className={`${styles.pill} ${styles.pillSecondary}`}
          >
            Leer más
          </Link>
        </div>
      </div>
    </article>
  );
}

export default function EventsPage() {
  return (
    <section className={styles.eventsSection}>
      {/*
        Previously this schema was returned from `export function Head()`, which
        the App Router ignores entirely — so the Event JSON-LD never reached the
        page. Rendering it inline matches how /faq, /piano-player and
        /ear-training already emit theirs. The schema content is unchanged.
      */}
      {[...upcomingEvents, ...pastEvents].map((event) => (
        <script
          key={event.slug}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(event.jsonLd) }}
        />
      ))}
      <div className="container">
        <h1 className={styles.title}>Próximos Eventos</h1>
        <div className={styles.eventList}>
          {upcomingEvents.map((event) => (
            <EventCard key={event.slug} event={event} />
          ))}
        </div>

        {pastEvents.length > 0 && (
          <>
            <h2 className={styles.pastTitle}>Eventos Anteriores</h2>
            <div className={styles.eventList}>
              {pastEvents.map((event) => (
                <EventCard key={event.slug} event={event} />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
