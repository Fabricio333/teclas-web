import styles from './ScrollCue.module.scss';

export type ScrollCueTone = 'brand' | 'light';

type ScrollCueProps = {
  // Anchor of the section this cue walks down to.
  href: string;
  // `brand` for the pale bands, `light` for the dark blue ones, where a blue
  // chevron on a blue surface would disappear.
  tone?: ScrollCueTone;
  className?: string;
};

// The chevron that walks a visitor down the landing page. Lifted out of the
// hero so every band carries the same affordance rather than only the first
// one; the hero still passes its own class for the on-load entrance.
export default function ScrollCue({
  href,
  tone = 'brand',
  className,
}: ScrollCueProps) {
  return (
    <a
      aria-label="Ir a la siguiente sección"
      className={`${styles.scrollCue} ${styles[tone]} ${className ?? ''}`}
      href={href}
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
        <path
          d="M5 9l7 7 7-7"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </a>
  );
}
