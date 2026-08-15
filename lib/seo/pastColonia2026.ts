/**
 * Structured data for the past 2026 "Colonia de Verano".
 *
 * Same shape as `pastEvent.ts`; the address mirrors `localBusiness.ts`.
 */
export const pastColonia2026JsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Event',
  name: 'Colonia de Verano 2026',
  url: 'https://teclasciudadjardin.com.ar/events/colonia-verano-2026',
  startDate: '2026-01-05T09:00:00-03:00',
  endDate: '2026-02-27T13:00:00-03:00',
  eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
  eventStatus: 'https://schema.org/EventScheduled',
  location: {
    '@type': 'Place',
    name: 'TECLAS',
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Blvd. F.i.n.c.a 6142 Local 12',
      addressLocality: 'Ciudad Jardín Lomas del Palomar',
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
  performer: {
    '@type': 'Organization',
    name: 'TECLAS',
  },
  image: 'https://teclasciudadjardin.com.ar/events/colonia-verano-2026.jpg',
  description:
    'Colonia de verano en TECLAS Ciudad Jardín: música, juegos y tiempo al aire libre para chicos y jóvenes.',
  offers: {
    '@type': 'Offer',
    url: 'https://teclasciudadjardin.com.ar/events/colonia-verano-2026',
    price: '0',
    priceCurrency: 'ARS',
    availability: 'https://schema.org/SoldOut',
    // When the offer went public: the day this page shipped.
    validFrom: '2026-08-15T00:00:00-03:00',
    validThrough: '2026-02-27T13:00:00-03:00',
  },
};

export default pastColonia2026JsonLd;
