export const eventJsonLd = {
  "@context": "https://schema.org",
  "@type": "Event",
  "name": "Piano Workshop in Ciudad Jardín",
  "startDate": "2024-09-01T10:00:00-03:00",
  "endDate": "2024-09-01T12:00:00-03:00",
  "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
  "eventStatus": "https://schema.org/EventScheduled",
  "location": {
    "@type": "Place",
    "name": "TECLAS",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "Blvd. F.i.n.c.a 61 42 Local 12",
      "addressLocality": "Cdad. Jardin Lomas de Palomar",
      "addressRegion": "Buenos Aires",
      "postalCode": "B1684",
      "addressCountry": "AR"
    }
  },
  "image": "https://teclasciudadjardin.com.ar/teclas.jpg",
  "description": "Taller intensivo de piano para todos los niveles.",
  "offers": {
    "@type": "Offer",
    "url": "https://teclasciudadjardin.com.ar/events/workshop",
    "price": "0",
    "priceCurrency": "ARS",
    "availability": "https://schema.org/InStock"
  }
};
export default eventJsonLd;

