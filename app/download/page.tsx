import Image from 'next/image';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDownload } from '@fortawesome/free-solid-svg-icons';
import { upcomingEvents } from '@/lib/events';
import { FLYER_SIZES, flyerPath } from '@/lib/flyer';
import { downloadMetadata } from '@/lib/metadata';
import styles from './Download.module.scss';

export const metadata = downloadMetadata;

const SITE = 'https://teclasciudadjardin.com.ar';

/**
 * Unlisted page for grabbing the event flyers.
 *
 * Deliberately absent from the nav, the footer and the sitemap, and marked
 * `noindex` — it is a place to send someone the link to, not a section of the
 * site. The PNGs it points at are written by `npm run flyer`; both sides build
 * the filename with `flyerPath`, so this page cannot link at a file the
 * generator does not produce.
 */
export default function DownloadPage() {
  return (
    <section className={styles.section}>
      <div className={`container ${styles.inner}`}>
        <h1 className={styles.title}>Descargas</h1>
        <p className={styles.subtitle}>
          Flyers listos para publicar. Se regeneran con{' '}
          <code className={styles.code}>npm run flyer</code> a partir de los
          datos del evento, así que siempre dicen lo mismo que la web.
        </p>

        {upcomingEvents.map((event) => (
          <article className={styles.event} key={event.slug}>
            <h2 className={styles.eventTitle}>{event.title}</h2>
            <p className={styles.eventDate}>{event.date}</p>

            <div className={styles.grid}>
              {FLYER_SIZES.map((size) => {
                const href = flyerPath(event.slug, size.key);
                return (
                  <div className={styles.card} key={size.key}>
                    <a className={styles.preview} href={href} download>
                      <Image
                        src={href}
                        alt={`Flyer ${size.label} — ${event.title}`}
                        width={size.width}
                        height={size.height}
                        className={styles.previewImage}
                      />
                    </a>
                    <div className={styles.meta}>
                      <p className={styles.sizeLabel}>{size.label}</p>
                      <p className={styles.sizeUsage}>{size.usage}</p>
                      <p className={styles.sizeDims}>
                        {size.width} × {size.height} px · PNG
                      </p>
                    </div>
                    <a className={styles.button} href={href} download>
                      <FontAwesomeIcon icon={faDownload} />
                      Descargar
                    </a>
                    <p className={styles.url}>
                      {SITE}
                      {href}
                    </p>
                  </div>
                );
              })}
            </div>
          </article>
        ))}

        {upcomingEvents.length === 0 && (
          <p className={styles.empty}>
            No hay eventos próximos, así que no hay flyers para descargar.
          </p>
        )}
      </div>
    </section>
  );
}
