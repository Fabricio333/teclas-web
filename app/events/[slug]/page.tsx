import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import AmbientNotes from '@/components/AmbientNotes';
import { events, getEventBySlug, whatsappUrl } from '@/lib/events';
import { flyerPath } from '@/lib/flyer';
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

export default async function EventDetailPage({ params }: EventPageProps) {
  const { slug } = await params;
  const event = getEventBySlug(slug);

  if (!event) notFound();

  const isPast = event.status === 'past';
  const bannerImage = isPast ? event.image : flyerPath(event.slug, 'post');

  return (
    <article className={styles.eventDetail}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(event.jsonLd) }}
      />
      <AmbientNotes density="normal" tone="brand" />

      <div className={styles.banner}>
        <Image
          src={bannerImage}
          alt={isPast ? event.imageAlt : `Flyer de ${event.title}`}
          width={isPast ? 1600 : 1080}
          height={isPast ? 900 : 1350}
          priority
          className={`${styles.bannerImage} ${
            isPast ? '' : styles.flyerBannerImage
          }`}
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
      </div>
    </article>
  );
}
