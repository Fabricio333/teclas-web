import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import AmbientNotes from '@/components/AmbientNotes';
import {
  events,
  getEventBySlug,
  whatsappUrl,
  type TeclasEvent,
} from '@/lib/events';
import { FLYER_SIZES, flyerPath } from '@/lib/flyer';
import EventGallery, { type GalleryPicture } from './EventGallery';
import styles from './EventDetail.module.scss';

type EventPageProps = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return events.map((event) => ({ slug: event.slug }));
}

/**
 * New pages — metadata added, never altering existing entries (see CLAUDE.md).
 */
export async function generateMetadata({
  params,
}: EventPageProps): Promise<Metadata> {
  const { slug } = await params;
  const event = getEventBySlug(slug);

  if (!event) return {};

  const url = `https://teclasciudadjardin.com.ar/events/${event.slug}`;
  const title = `${event.title} | TECLAS Ciudad Jardín`;

  return {
    title,
    description: event.metaDescription,
    alternates: { canonical: url },
    robots: { index: true, follow: true },
    openGraph: {
      type: 'article',
      url,
      title,
      description: event.metaDescription,
      siteName: 'TECLAS',
      images: [{ url: event.image }],
    },
  };
}

/**
 * The event's photo plus its generated feed flyer, when `npm run flyer` has
 * written one — past events have none, so they get no gallery.
 */
function galleryPictures(event: TeclasEvent): GalleryPicture[] {
  const pictures: GalleryPicture[] = [
    { src: event.image, alt: event.imageAlt, width: 1600, height: 1136 },
  ];

  const post = FLYER_SIZES.find((size) => size.key === 'post');
  const flyer = post && flyerPath(event.slug, post.key);
  if (post && flyer && existsSync(join(process.cwd(), 'public', flyer))) {
    pictures.push({
      src: flyer,
      alt: `Flyer de ${event.title}, ${event.date}`,
      width: post.width,
      height: post.height,
    });
  }

  return pictures;
}

export default async function EventDetailPage({ params }: EventPageProps) {
  const { slug } = await params;
  const event = getEventBySlug(slug);

  if (!event) notFound();

  const isPast = event.status === 'past';
  const pictures = galleryPictures(event);

  return (
    <article className={styles.eventDetail}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(event.jsonLd) }}
      />
      <AmbientNotes density="normal" tone="brand" />

      {/* The photo is shown whole, never cropped to the strip: a blurred copy
          of itself fills the width behind it. */}
      <div className={styles.banner}>
        <Image
          src={event.image}
          alt=""
          aria-hidden
          fill
          sizes="100vw"
          className={styles.bannerBackdrop}
        />
        <Image
          src={event.image}
          alt={event.imageAlt}
          width={1600}
          height={1136}
          priority
          className={styles.bannerImage}
        />
      </div>

      <div className={['container', styles.inner].join(' ')}>
        <header className={styles.header}>
          <span
            className={`${styles.badge} ${isPast ? styles.badgePast : styles.badgeUpcoming}`}
          >
            {isPast ? 'Finalizado' : 'Próximo evento'}
          </span>
          <h1 className={styles.title}>{event.title}</h1>
          {event.altName && <h2 className={styles.altName}>{event.altName}</h2>}
          {event.subtitle && (
            <p className={styles.subtitle}>{event.subtitle}</p>
          )}
        </header>

        <div className={styles.content}>
          <div className={styles.body}>
            {event.body.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}

            <div className={styles.actions}>
              <a
                href={whatsappUrl(event.whatsappMessage)}
                target="_blank"
                rel="noopener noreferrer"
                className={`${styles.pill} ${styles.pillPrimary}`}
              >
                {event.ctaLabel}
              </a>
              <Link
                href="/events"
                className={`${styles.pill} ${styles.pillSecondary}`}
              >
                Volver a eventos
              </Link>
            </div>
          </div>

          <aside className={styles.facts}>
            <h2 className={styles.factsTitle}>Detalles</h2>
            <dl>
              {event.facts.map((fact) => (
                <div key={fact.label} className={styles.fact}>
                  <dt>{fact.label}</dt>
                  <dd>{fact.value}</dd>
                </div>
              ))}
            </dl>
          </aside>
        </div>

        {pictures.length > 1 && <EventGallery pictures={pictures} />}
      </div>
    </article>
  );
}
