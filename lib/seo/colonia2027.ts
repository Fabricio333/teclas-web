/**
 * Structured data for the upcoming 2027 "Colonia de Verano".
 *
 * Same shape as `event.ts`; the address mirrors `localBusiness.ts`. The dates
 * are still to be confirmed by the school, so `startDate` carries the season
 * (which edits this month) and the page's own `facts` say the exact dates are
 * pending.
 */
export const colonia2027JsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Event',
  name: 'Colonia de Verano 2027',
  url: 'https://teclasciudadjardin.com.ar/events/colonia-verano-2027',
  startDate: '2027-01-04T09:00:00-03:00',
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
  image: 'https://teclasciudadjardin.com.ar/events/colonia-verano-2026.jpg',
  description:
    'Colonia de verano en TECLAS Ciudad Jardín: música, juegos y tiempo al aire libre para chicos y jóvenes. Fechas a confirmar.',
  offers: {
    '@type': 'Offer',
    url: 'https://teclasciudadjardin.com.ar/events/colonia-verano-2027',
    price: '0',
    priceCurrency: 'ARS',
    availability: 'https://schema.org/InStock',
  },
};

export default colonia2027JsonLd;
