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
// Five copies rather than three: a free scrub can overshoot the middle copy by
// a card or so before it settles, and the extra sets guarantee there are always
// full cards drawn either side of that overshoot instead of empty track.
const COPIES = 5;
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
    // Position the gesture started from, shifted by a whole set whenever the
    // scrub re-bases, so `startPos + offset` stays continuous across the wrap.
    startPos: number;
    moved: boolean;
  } | null>(null);
  // A wheel gesture scrubs the track freely, exactly like a drag: the position
  // is carried here across the burst of events and only snapped to a card once
  // the burst (including trackpad momentum) goes quiet.
  const wheelRef = useRef<{ pos: number } | null>(null);
  const wheelIdleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rebaseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressClickRef = useRef(false);
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);

  const count = events.length;
  const low = count * Math.floor(COPIES / 2); // first index of the middle copy

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

  // Fold any position — fractional included — back onto the middle copy. The
  // copies are pixel-identical, so this is invisible, and it is what lets a free
  // scrub run forever instead of sliding off the end of the strip.
  const rebase = useCallback(
    (pos: number) => low + normalize(pos - low, count),
    [count, low],
  );

  // Animate to `target` as given, then fold silently once it has landed.
  // Re-basing *before* an animated move is what made looping whoosh backwards
  // across the whole set; folding after the glide keeps the wrap invisible.
  const glideTo = useCallback(
    (target: number) => {
      render(target, true);
      setCurrent(normalize(target, count));
      if (rebaseTimerRef.current) clearTimeout(rebaseTimerRef.current);
      rebaseTimerRef.current = setTimeout(() => {
        if (dragRef.current || wheelRef.current) return; // a new gesture owns it
        render(rebase(posRef.current), false);
      }, DURATION_MS + 50);
    },
    [count, rebase, render],
  );

  const move = useCallback(
    (direction: -1 | 1) => {
      if (!step()) return;
      glideTo(Math.round(posRef.current) + direction);
    },
    [glideTo, step],
  );

  const goTo = useCallback(
    (logical: number) => {
      if (!step()) return;
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
      glideTo(target);
    },
    [count, glideTo, low, step],
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

  // ------------------------------- free scrubbing (drag and wheel)

  // Glide from wherever a free scrub left the track to the nearest card.
  const settle = useCallback(() => {
    glideTo(Math.round(posRef.current));
    startAutoplay();
  }, [glideTo, startAutoplay]);

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
      moved: false,
    };
    stopAutoplay();
  };

  const onPointerMove = (e: React.PointerEvent<HTMLUListElement>) => {
    const drag = dragRef.current;
    const s = step();
    if (!drag || drag.pointerId !== e.pointerId || !s) return;
    if (Math.abs(e.clientX - drag.startX) > 4) drag.moved = true;

    // Follow the pointer one-to-one, transition off so it never lags. Fractional
    // positions are the point: the track scrubs continuously and only lands on a
    // card at release.
    const offset = (e.clientX - drag.startX) / s;
    const wrapped = rebase(drag.startPos + offset);
    // Re-base mid-drag so the strip never runs out underneath a long swipe;
    // shifting startPos by the same amount keeps the pointer tracking exact.
    drag.startPos += wrapped - (drag.startPos + offset);
    render(wrapped, false);
    setCurrent(normalize(Math.round(wrapped), count));
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
    settle();
  };

  // Wheel is bound natively rather than through React so it can be non-passive:
  // without preventDefault the browser also pans the page sideways and fires the
  // back-navigation gesture mid-scrub.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const onWheel = (e: WheelEvent) => {
      // Vertical intent belongs to the page.
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      const s = step();
      if (!s) return;
      e.preventDefault();
      stopAutoplay();

      // First event of a burst: start scrubbing from what is on screen now.
      if (!wheelRef.current) {
        const matrix = new DOMMatrixReadOnly(getComputedStyle(track).transform);
        wheelRef.current = { pos: -matrix.m41 / s };
      }
      wheelRef.current.pos = rebase(wheelRef.current.pos + e.deltaX / s);
      render(wheelRef.current.pos, false);
      setCurrent(normalize(Math.round(wheelRef.current.pos), count));

      // Trackpad momentum keeps delivering events after the fingers lift; the
      // gesture is over once they stop, and only then does it snap.
      if (wheelIdleRef.current) clearTimeout(wheelIdleRef.current);
      wheelIdleRef.current = setTimeout(() => {
        wheelRef.current = null;
        settle();
      }, 140);
    };

    track.addEventListener('wheel', onWheel, { passive: false });
    return () => track.removeEventListener('wheel', onWheel);
  }, [count, rebase, render, settle, step, stopAutoplay]);

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
      if (rebaseTimerRef.current) clearTimeout(rebaseTimerRef.current);
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
