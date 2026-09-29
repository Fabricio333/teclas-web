'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChevronLeft,
  faChevronRight,
} from '@fortawesome/free-solid-svg-icons';
import styles from './EventGallery.module.scss';

export type GalleryPicture = {
  src: string;
  alt: string;
  width: number;
  height: number;
};

type EventGalleryProps = { pictures: GalleryPicture[] };

/**
 * Photos of an event under its article. The track is native horizontal scroll
 * with snapping, so touch swipes and trackpads work as they do everywhere else;
 * the arrows and dots only scroll it. Pictures keep their own proportions — a
 * landscape photo and a portrait flyer share one row height.
 */
export default function EventGallery({ pictures }: EventGalleryProps) {
  const trackRef = useRef<HTMLUListElement>(null);
  const [current, setCurrent] = useState(0);

  // The slide nearest the track's centre is the current one.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const onScroll = () => {
      const middle = track.scrollLeft + track.clientWidth / 2;
      let nearest = 0;
      let best = Infinity;
      Array.from(track.children).forEach((child, index) => {
        const slide = child as HTMLElement;
        const distance = Math.abs(
          slide.offsetLeft + slide.offsetWidth / 2 - middle,
        );
        if (distance < best) {
          best = distance;
          nearest = index;
        }
      });
      setCurrent(nearest);
    };

    track.addEventListener('scroll', onScroll, { passive: true });
    return () => track.removeEventListener('scroll', onScroll);
  }, []);

  const goTo = (index: number) => {
    const track = trackRef.current;
    const slide = track?.children[index] as HTMLElement | undefined;
    if (!track || !slide) return;
    const reduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    track.scrollTo({
      left: slide.offsetLeft - (track.clientWidth - slide.offsetWidth) / 2,
      behavior: reduced ? 'auto' : 'smooth',
    });
  };

  return (
    <section className={styles.gallery} aria-label="Fotos del evento">
      <div className={styles.viewport}>
        <button
          type="button"
          className={`${styles.arrow} ${styles.arrowPrev}`}
          onClick={() => goTo(Math.max(0, current - 1))}
          disabled={current === 0}
          aria-label="Foto anterior"
        >
          <FontAwesomeIcon icon={faChevronLeft} />
        </button>

        <ul className={styles.track} ref={trackRef}>
          {pictures.map((picture, index) => (
            <li
              key={picture.src}
              className={styles.slide}
              aria-label={`${index + 1} de ${pictures.length}`}
            >
              <a href={picture.src} target="_blank" rel="noopener noreferrer">
                <Image
                  src={picture.src}
                  alt={picture.alt}
                  width={picture.width}
                  height={picture.height}
                  sizes="(min-width: 1024px) 640px, 90vw"
                  className={styles.image}
                />
              </a>
            </li>
          ))}
        </ul>

        <button
          type="button"
          className={`${styles.arrow} ${styles.arrowNext}`}
          onClick={() => goTo(Math.min(pictures.length - 1, current + 1))}
          disabled={current === pictures.length - 1}
          aria-label="Foto siguiente"
        >
          <FontAwesomeIcon icon={faChevronRight} />
        </button>
      </div>

      <div className={styles.dots}>
        {pictures.map((picture, index) => (
          <button
            key={picture.src}
            type="button"
            className={`${styles.dot} ${index === current ? styles.dotActive : ''}`}
            onClick={() => goTo(index)}
            aria-label={`Ver foto ${index + 1}`}
            aria-current={index === current}
          />
        ))}
      </div>
    </section>
  );
}
