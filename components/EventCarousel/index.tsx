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
    // Offset in cards from `startPos`, kept here instead of read back out of
    // the style string so the snap can never disagree with what is on screen.
    offset: number;
    moved: boolean;
  } | null>(null);
  // Wheel gestures arrive as a burst of events; they are accumulated and only
  // turned into a move once they add up to a card, then locked out until the
  // slide transition ends. Otherwise a single trackpad swipe restarts the
  // animation every frame and the track shakes in place.
  const wheelRef = useRef({ delta: 0, lockedUntilMove: false });
  const wheelIdleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressClickRef = useRef(false);
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
    const track = trackRef.current;
    const s = step();
    if (!track || !s) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    suppressClickRef.current = false;

    // Grab the position that is on screen right now, not the target of a
    // transition still in flight, and freeze it there — otherwise the first
    // pointermove teleports the track to that pending target.
    const matrix = new DOMMatrixReadOnly(getComputedStyle(track).transform);
    const startPos = -matrix.m41 / s;
    track.style.transition = 'none';
    track.style.transform = `translate3d(${matrix.m41}px, 0, 0)`;

    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startPos,
      offset: 0,
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
    drag.offset = diff;
    if (Math.abs(e.clientX - drag.startX) > 4) drag.moved = true;
    // Direct transform during the drag: transitions off so it never lags the
    // pointer, and off-copy positions are allowed (the wrap is re-based at
    // release).
    track.style.transition = 'none';
    track.style.transform = `translate3d(${-(drag.startPos + diff) * s}px, 0, 0)`;
  };

  const endDrag = () => {
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag) return;
    if (!drag.moved) {
      // A tap froze an in-flight transition; let it finish to its target.
      render(posRef.current, true);
      startAutoplay();
      return;
    }
    // A drag that ends on a card must not also open it.
    suppressClickRef.current = true;
    // Snap to the nearest card from where the drag actually left the track,
    // then re-base into a drawn copy.
    let target = Math.round(drag.startPos + drag.offset);
    while (target > high) target -= count;
    while (target < low) target += count;
    render(target, true);
    setCurrent(normalize(target, count));
    startAutoplay();
  };

  const onWheel = (e: React.WheelEvent<HTMLUListElement>) => {
    // Vertical intent belongs to the page.
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
    stopAutoplay();

    const wheel = wheelRef.current;
    if (!wheel.lockedUntilMove) {
      wheel.delta += e.deltaX;
      const threshold = step() * 0.35 || 60;
      if (Math.abs(wheel.delta) >= threshold) {
        move(wheel.delta > 0 ? 1 : -1);
        wheel.delta = 0;
        wheel.lockedUntilMove = true;
      }
    }

    // The burst ends when the events stop arriving: release the lock, drop any
    // leftover delta so the tail of the gesture cannot kick a second slide, and
    // hand autoplay back.
    if (wheelIdleRef.current) clearTimeout(wheelIdleRef.current);
    wheelIdleRef.current = setTimeout(() => {
      wheelRef.current.delta = 0;
      wheelRef.current.lockedUntilMove = false;
      startAutoplay();
    }, 220);
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

  useEffect(
    () => () => {
      if (wheelIdleRef.current) clearTimeout(wheelIdleRef.current);
    },
    [],
  );

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
            onClickCapture={(e) => {
              if (!suppressClickRef.current) return;
              suppressClickRef.current = false;
              e.preventDefault();
              e.stopPropagation();
            }}
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
