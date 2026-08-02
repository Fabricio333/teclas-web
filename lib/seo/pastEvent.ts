/**
 * Structured data for the past "Taller de Piano para Adultos Principiantes".
 *
 * Kept apart from `event.ts` so the upcoming-event schema stays untouched. The
 * address mirrors `localBusiness.ts` so the two never disagree — the flyer's
 * "Aviador Finca 6142" is the same street as "Blvd. F.i.n.c.a 6142".
 */
export const pastEventJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Event',
  name: 'Taller de Piano para Adultos Principiantes',
  alternateName: 'Clase abierta «El Piano: una mirada diferente»',
  url: 'https://teclasciudadjardin.com.ar/events/taller-piano-adultos-principiantes',
  startDate: '2026-06-20T16:00:00-03:00',
  endDate: '2026-06-20T18:00:00-03:00',
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
  image:
    'https://teclasciudadjardin.com.ar/events/taller-piano-adultos-principiantes.jpg',
  description:
    'Clase abierta de piano para jóvenes y adultos principiantes y para quienes aún no cuentan con experiencia. Cupos limitados.',
  offers: {
    '@type': 'Offer',
    url: 'https://teclasciudadjardin.com.ar/events/taller-piano-adultos-principiantes',
    price: '5000',
    priceCurrency: 'ARS',
    availability: 'https://schema.org/SoldOut',
    validThrough: '2026-06-20T16:00:00-03:00',
  },
};

export default pastEventJsonLd;
