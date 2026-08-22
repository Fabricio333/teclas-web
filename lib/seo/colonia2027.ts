/**
 * Structured data for the upcoming 2027 "Colonia Musical".
 *
 * Same shape as `event.ts`; the address mirrors `localBusiness.ts`. The school
 * confirmed six weeks of Monday-to-Friday activity across January and February,
 * in two shifts (10–12 and 17–19 hs.); the exact opening day is still pending,
 * so the range starts on the first Monday of January and runs the six weeks
 * from there.
 */
export const colonia2027JsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Event',
  name: 'Colonia Musical 2027',
  url: 'https://teclasciudadjardin.com.ar/events/colonia-verano-2027',
  startDate: '2027-01-04T10:00:00-03:00',
  // Recommended by Google and previously absent. Six weeks from the first
  // Monday of January close on Friday 12 February, at the end of the
  // afternoon shift.
  endDate: '2027-02-12T19:00:00-03:00',
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
  // A camp run by the school itself, so the school is what performs.
  performer: {
    '@type': 'Organization',
    name: 'TECLAS',
  },
  image: 'https://teclasciudadjardin.com.ar/events/colonia-verano-2026.jpg',
  description:
    'Colonia Musical en TECLAS Ciudad Jardín: seis semanas de juegos musicales, canto, percusión, coreografías y piano para chicos y jóvenes, de lunes a viernes en enero y febrero.',
  offers: {
    '@type': 'Offer',
    url: 'https://teclasciudadjardin.com.ar/events/colonia-verano-2027',
    price: '0',
    priceCurrency: 'ARS',
    availability: 'https://schema.org/InStock',
    // When the offer went public: the day this page shipped.
    validFrom: '2026-08-15T00:00:00-03:00',
  },
};

export default colonia2027JsonLd;
