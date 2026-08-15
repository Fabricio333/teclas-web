'use client';

import { useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChevronLeft,
  faChevronRight,
} from '@fortawesome/free-solid-svg-icons';
import { events } from '@/lib/events';
import styles from './EventCarousel.module.scss';

export default function EventCarousel() {
  const trackRef = useRef<HTMLUListElement>(null);

  const move = (direction: -1 | 1) => {
    const track = trackRef.current;
    if (!track) return;

    const current = Math.round(track.scrollLeft / track.clientWidth);
    const next = (current + direction + events.length) % events.length;
    track.scrollTo({ left: next * track.clientWidth, behavior: 'smooth' });
  };

  return (
    <section
      id="events"
      className={styles.section}
      aria-labelledby="events-title"
    >
      <div className={`container ${styles.inner}`}>
        <div className={styles.heading}>
          <div>
            <p className={styles.eyebrow}>Encuentros para tocar y compartir</p>
            <h2 id="events-title">Eventos en TECLAS</h2>
          </div>
          <Link href="/events" className={styles.allEvents}>
            Ver todos los eventos
          </Link>
        </div>

        <div className={styles.carousel} aria-roledescription="carrusel">
          <button
            type="button"
            className={`${styles.control} ${styles.previous}`}
            aria-label="Evento anterior"
            onClick={() => move(-1)}
          >
            <FontAwesomeIcon icon={faChevronLeft} />
          </button>

          <ul ref={trackRef} className={styles.track}>
            {events.map((event, index) => (
              <li
                key={event.slug}
                className={styles.slide}
                aria-label={`${index + 1} de ${events.length}`}
                aria-roledescription="diapositiva"
              >
                <article className={styles.card}>
                  <div className={styles.imageWrapper}>
                    <Image
                      src={event.image}
                      alt={event.imageAlt}
                      width={720}
                      height={540}
                      className={styles.image}
                    />
                  </div>
                  <div className={styles.content}>
                    <span className={styles.badge}>
                      {event.status === 'upcoming'
                        ? 'Pr\u00f3ximo evento'
                        : 'Finalizado'}
                    </span>
                    <h3>{event.title}</h3>
                    <p className={styles.date}>{event.date}</p>
                    <p>{event.summary}</p>
                    <Link href={`/events/${event.slug}`} className="btnPrimary">
                      Ver evento
                    </Link>
                  </div>
                </article>
              </li>
            ))}
          </ul>

          <button
            type="button"
            className={`${styles.control} ${styles.next}`}
            aria-label="Evento siguiente"
            onClick={() => move(1)}
          >
            <FontAwesomeIcon icon={faChevronRight} />
          </button>
        </div>
      </div>
    </section>
  );
}
