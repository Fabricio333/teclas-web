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

// How many full copies of the track are rendered. The middle "real" copy is
// what the user navigates; the copies on each side exist so there is always
// content to scroll into. Whenever the scroll position lands inside a side
// copy it is snapped back one full set — seamless, because the slides are
// identical — which is what makes the loop infinite.
const COPIES = 3;

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

function normalize(index: number, length: number): number {
  return ((index % length) + length) % length;
}

export default function EventCarousel() {
  const trackRef = useRef<HTMLUListElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const rafRef = useRef<number | null>(null);
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);

  const count = events.length;

  const slideWidth = useCallback(
    () =>
      (trackRef.current?.firstElementChild as HTMLElement | null)
        ?.offsetWidth ??
      trackRef.current?.clientWidth ??
      0,
    [],
  );

  /** Real scroll-tile index for a logical index: the middle copy starts at `count`. */
  const realIndexFor = useCallback(
    (logical: number) => normalize(logical, count) + count,
    [count],
  );

  // Keep the native scroll position inside the middle copy no matter how far
  // the user drags: step one full set as soon as the scroll enters a side copy.
  const syncFromScroll = useCallback(() => {
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const el = trackRef.current;
      const width = slideWidth();
      if (!el || !width) return;

      let real = Math.round(el.scrollLeft / width);
      if (real < count) real += count;
      else if (real >= count * (COPIES - 1)) real -= count;

      if (real * width !== el.scrollLeft) {
        el.scrollTo({ left: real * width, behavior: 'auto' });
      }
      setCurrent(normalize(real, count));
    });
  }, [count, slideWidth]);

  const goTo = useCallback(
    (logical: number) => {
      const el = trackRef.current;
      const width = slideWidth();
      const target = normalize(logical, count);
      if (!el || !width) return;
      el.scrollTo({ left: realIndexFor(target) * width, behavior: 'smooth' });
      setCurrent(target);
    },
    [count, realIndexFor, slideWidth],
  );

  const move = useCallback(
    (direction: -1 | 1) => {
      const el = trackRef.current;
      const width = slideWidth();
      if (!el || !width) return;
      let real = Math.round(el.scrollLeft / width) + direction;
      // Stay inside the middle copy with a single-step wrap.
      if (real >= count * (COPIES - 1)) real -= count;
      if (real < count) real += count;
      el.scrollTo({ left: real * width, behavior: 'smooth' });
      setCurrent(normalize(real, count));
    },
    [count, slideWidth],
  );

  const stopAutoplay = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startAutoplay = useCallback(() => {
    stopAutoplay();
    if (paused || prefersReducedMotion() || count < 2) return;

    timerRef.current = setInterval(() => {
      if (document.hidden) return;
      const el = trackRef.current;
      const width = slideWidth();
      if (!el || !width) return;
      let next = Math.round(el.scrollLeft / width) + 1;
      if (next >= count * (COPIES - 1)) next -= count;
      el.scrollTo({ left: next * width, behavior: 'smooth' });
      setCurrent(normalize(next, count));
    }, AUTOPLAY_MS);
  }, [count, paused, slideWidth, stopAutoplay]);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const width = slideWidth();
    if (!width) return;
    // Land on the real copy without animating on first paint.
    el.scrollTo({ left: realIndexFor(0) * width, behavior: 'auto' });
  }, [realIndexFor, slideWidth]);

  useEffect(() => {
    startAutoplay();
    return stopAutoplay;
  }, [startAutoplay, stopAutoplay]);

  const slides = Array.from(
    { length: count * COPIES },
    (_, index) => events[index % count],
  );

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
            {slides.map((event, index) => {
              const logical = index % count;
              return (
                <li
                  key={`${event.slug}-${index}`}
                  className={styles.slide}
                  aria-label={`${logical + 1} de ${count}`}
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
                      <Link
                        href={`/events/${event.slug}`}
                        className="btnPrimary"
                      >
                        Ver evento
                      </Link>
                    </div>
                  </article>
                </li>
              );
            })}
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
