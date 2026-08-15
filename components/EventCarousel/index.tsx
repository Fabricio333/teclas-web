'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChevronLeft,
  faChevronRight,
} from '@fortawesome/free-solid-svg-icons';
import AmbientNotes from '@/components/AmbientNotes';
import { events } from '@/lib/events';
import styles from './EventCarousel.module.scss';

const AUTOPLAY_MS = 6000;

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export default function EventCarousel() {
  const trackRef = useRef<HTMLUListElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const rafRef = useRef<number | null>(null);
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);

  const slideWidth = useCallback(
    () =>
      (trackRef.current?.firstElementChild as HTMLElement | null)
        ?.offsetWidth ??
      trackRef.current?.clientWidth ??
      0,
    [],
  );

  const syncFromScroll = useCallback(() => {
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const el = trackRef.current;
      const width = slideWidth();
      if (!el || !width) return;
      setCurrent(Math.round(el.scrollLeft / width));
    });
  }, [slideWidth]);

  const goTo = useCallback(
    (index: number) => {
      const el = trackRef.current;
      const width = slideWidth();
      if (!el || !width) return;
      const next = (index + events.length) % events.length;
      el.scrollTo({ left: next * width, behavior: 'smooth' });
      setCurrent(next);
    },
    [slideWidth],
  );

  const move = useCallback(
    (direction: -1 | 1) => {
      const el = trackRef.current;
      const width = slideWidth();
      if (!el || !width) return;
      const currentIndex = Math.round(el.scrollLeft / width);
      goTo(currentIndex + direction);
    },
    [goTo, slideWidth],
  );

  const stopAutoplay = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startAutoplay = useCallback(() => {
    stopAutoplay();
    if (paused || prefersReducedMotion() || events.length < 2) return;

    timerRef.current = setInterval(() => {
      if (document.hidden) return;
      const el = trackRef.current;
      const width = slideWidth();
      if (!el || !width) return;
      const currentIndex = Math.round(el.scrollLeft / width);
      const next = (currentIndex + 1) % events.length;
      el.scrollTo({ left: next * width, behavior: 'smooth' });
      setCurrent(next);
    }, AUTOPLAY_MS);
  }, [paused, slideWidth, stopAutoplay]);

  useEffect(() => {
    startAutoplay();
    return stopAutoplay;
  }, [startAutoplay, stopAutoplay]);

  return (
    <section
      id="events"
      className={styles.section}
      aria-labelledby="events-title"
    >
      <AmbientNotes density="normal" tone="plum" />
      <div className={`container ${styles.inner}`}>
        <div className={styles.heading}>
          <div>
            <p className={styles.eyebrow}>Encuentros para tocar y compartir</p>
            <h2 id="events-title">Eventos en TECLAS</h2>
          </div>
          <Link href="/events" className="btnPlum">
            Ver todos los eventos
          </Link>
        </div>

        <div
          className={styles.carousel}
          aria-roledescription="carrusel"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocus={() => setPaused(true)}
          onBlur={() => setPaused(false)}
        >
          <button
            type="button"
            className={`${styles.control} ${styles.previous}`}
            aria-label="Evento anterior"
            onClick={() => move(-1)}
          >
            <FontAwesomeIcon icon={faChevronLeft} />
          </button>

          <ul
            ref={trackRef}
            className={styles.track}
            onScroll={syncFromScroll}
            onTouchStart={() => stopAutoplay()}
            onWheel={() => stopAutoplay()}
          >
            {events.map((event, index) => (
              <li
                key={event.slug}
                className={styles.slide}
                aria-label={`${index + 1} de ${events.length}`}
                aria-roledescription="diapositiva"
              >
                <article className={styles.card}>
                  <Link
                    href={`/events/${event.slug}`}
                    className={styles.cardOverlay}
                    aria-hidden="true"
                    tabIndex={-1}
                  />
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

          <nav className={styles.dots} aria-label="Ir a un evento">
            {events.map((event, index) => (
              <button
                key={event.slug}
                type="button"
                className={`${styles.dot} ${
                  index === current ? styles.dotActive : ''
                }`}
                aria-label={`Ir al evento ${index + 1}`}
                aria-current={index === current}
                onClick={() => goTo(index)}
              />
            ))}
          </nav>
        </div>
      </div>
    </section>
  );
}
