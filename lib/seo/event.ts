/**
 * Structured data for the upcoming event on /events.
 *
 * Replaces the placeholder "Piano Workshop in Ciudad Jardín" entry (a mock-up
 * with a 2024 date) at the site owner's explicit request. The address mirrors
 * `localBusiness.ts` so the two never disagree.
 *
 * `startDate` carries the hour now that the school confirmed it (17:00), and
 * `offers.price` the contribution. Both mirror the `facts` list in
 * `lib/events/index.ts`: structured data that disagrees with the page is worse
 * than none at all.
 */
export const eventJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Event',
  name: 'Clase abierta de piano: series, pelis y juegos',
  url: 'https://teclasciudadjardin.com.ar/events/clase-abierta-piano-series-pelis-juegos',
  startDate: '2026-08-29T17:00',
  eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
  eventStatus: 'https://schema.org/EventScheduled',
  location: {
    '@type': 'Place',
    name: 'TECLAS',
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Blvd. F.i.n.c.a 6142 Local 12',
      addressLocality: 'Ciudad. Jardín Lomas del Palomar',
      addressRegion: 'Buenos Aires',
      postalCode: 'B1684',
      addressCountry: 'AR',
    },
  },
  organizer: {
    '@type': 'Organization',
    name: 'TECLAS',
    url: 'https://teclasciudadjardin.com.ar',
  },
  image:
    'https://teclasciudadjardin.com.ar/events/clase-abierta-piano-series-pelis-juegos.jpg',
  description:
    'Clase abierta de piano en TECLAS Ciudad Jardín: niños y jóvenes interpretarán música de series, películas y videojuegos.',
  offers: {
    '@type': 'Offer',
    url: 'https://teclasciudadjardin.com.ar/events/clase-abierta-piano-series-pelis-juegos',
    price: '5000',
    priceCurrency: 'ARS',
    availability: 'https://schema.org/InStock',
  },
};
export default eventJsonLd;
