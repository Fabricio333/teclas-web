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

// The track renders three identical copies of the set and is moved with a CSS
// transform. `position` is an index over those copies; when it would leave a
// copy it is re-based one set without animation, which is seamless because the
// copies are pixel-identical. Native scroll/snap is never involved, so drags
// are the only thing that moves the track.
const COPIES = 3;
const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';
const DURATION_MS = 650;

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
  const posRef = useRef(0);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startPos: number;
    moved: boolean;
  } | null>(null);
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);

  const count = events.length;
  const high = count * (COPIES - 1) - 1; // last index inside a drawn copy
  const low = count; // first index of the middle copy

  const step = useCallback(() => {
    const track = trackRef.current;
    if (!track?.firstElementChild) return 0;
    const first = track.firstElementChild.getBoundingClientRect();
    const second = track.children[1];
    if (!second) return first.width || 0;
    const secondRect = second.getBoundingClientRect();
    return secondRect.left - first.left;
  }, []);

  const render = useCallback(
    (pos: number, animate: boolean) => {
      const track = trackRef.current;
      const s = step();
      if (!track || !s) return;
      track.style.transition = animate
        ? `transform ${DURATION_MS}ms ${EASE}`
        : 'none';
      track.style.transform = `translate3d(${-pos * s}px, 0, 0)`;
      posRef.current = pos;
    },
    [step],
  );

  const move = useCallback(
    (direction: -1 | 1) => {
      const s = step();
      if (!s) return;
      let target = posRef.current + direction;
      // Re-base into a drawn copy — identical cards, so no visible jump.
      if (target > high) target -= count;
      else if (target < low) target += count;
      render(target, true);
      setCurrent(normalize(target, count));
    },
    [count, high, low, render, step],
  );

  const goTo = useCallback(
    (logical: number) => {
      const s = step();
      if (!s) return;
      const logicalPos = normalize(logical, count);
      // Pick the nearest drawn copy so far jumps animate over the short way.
      let target = logicalPos + low;
      while (
        Math.abs(target + count - posRef.current) <
        Math.abs(target - posRef.current)
      ) {
        target += count;
      }
      while (
        Math.abs(target - count - posRef.current) <
        Math.abs(target - posRef.current)
      ) {
        target -= count;
      }
      render(target, true);
      setCurrent(logicalPos);
    },
    [count, low, render, step],
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
      move(1);
    }, AUTOPLAY_MS);
  }, [count, move, paused, stopAutoplay]);

  // ------------------------------- drag and wheel

  const onPointerDown = (e: React.PointerEvent<HTMLUListElement>) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startPos: posRef.current,
      moved: false,
    };
    stopAutoplay();
  };

  const onPointerMove = (e: React.PointerEvent<HTMLUListElement>) => {
    const drag = dragRef.current;
    const track = trackRef.current;
    const s = step();
    if (!drag || drag.pointerId !== e.pointerId || !track || !s) return;
    const diff = (e.clientX - drag.startX) / s;
    if (Math.abs(diff) > 0.05) drag.moved = true;
    // Direct transform during the drag: transitions off so it never lags the
    // pointer, and off-copy positions are allowed (the wrap is re-based at
    // release).
    track.style.transition = 'none';
    track.style.transform = `translate3d(${-(drag.startPos + diff) * s}px, 0, 0)`;
  };

  const endDrag = () => {
    const drag = dragRef.current;
    dragRef.current = null;
    const track = trackRef.current;
    const s = step();
    if (!drag || !drag.moved || !track || !s) return;
    // Snap to the nearest card and re-base the position into a drawn copy.
    const px = posRef.current * s - parseFloat(track.style.transform.slice(12));
    let target = Math.round(px / s);
    while (target > high) target -= count;
    while (target < low) target += count;
    render(target, true);
    setCurrent(normalize(target, count));
  };

  const onWheel = (e: React.WheelEvent<HTMLUListElement>) => {
    stopAutoplay();
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return; // page scrolls
    move(e.deltaX > 0 ? 1 : -1);
  };

  useEffect(() => {
    // Land on the middle copy without animating on first paint, once layout
    // has settled (fonts/images included).
    const raf = requestAnimationFrame(() => render(low, false));
    return () => cancelAnimationFrame(raf);
  }, [low, render]);

  useEffect(() => {
    startAutoplay();
    return stopAutoplay;
  }, [startAutoplay, stopAutoplay]);

  // Repaint whenever the track geometry could differ (resize, fonts, images
  // loading) so the virtual position never drifts from the rendered pixels.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const observer = new ResizeObserver(() => render(posRef.current, false));
    observer.observe(track);
    return () => observer.disconnect();
  }, [render]);

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
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onWheel={onWheel}
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
        </div>

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
    </section>
  );
}
