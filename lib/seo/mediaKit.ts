/**
 * Structured data for /media-kit.
 *
 * `AboutPage` rather than `WebPage`: this describes the organisation itself,
 * which is what a crawler should understand it to be. The organisation details
 * mirror `localBusiness.ts` so the two never disagree.
 */
export const mediaKitJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'AboutPage',
  name: 'Media kit | TECLAS Ciudad Jardín',
  url: 'https://teclasciudadjardin.com.ar/media-kit',
  description:
    'Logo, colores, tipografías, fotos y textos de TECLAS Ciudad Jardín para prensa, notas y colaboraciones.',
  inLanguage: 'es',
  isPartOf: {
    '@type': 'WebSite',
    name: 'TECLAS Ciudad Jardín',
    url: 'https://teclasciudadjardin.com.ar',
  },
  mainEntity: {
    '@type': 'Organization',
    name: 'TECLAS Ciudad Jardín',
    alternateName: 'TECLAS — Escuela de Piano',
    url: 'https://teclasciudadjardin.com.ar',
    logo: 'https://teclasciudadjardin.com.ar/icon.png',
    image: 'https://teclasciudadjardin.com.ar/teclas.jpg',
    telephone: '+54 9 11 3416-2288',
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Blvd. F.i.n.c.a 6142 Local 12',
      addressLocality: 'Ciudad Jardín Lomas del Palomar',
      addressRegion: 'Provincia de Buenos Aires',
      addressCountry: 'AR',
    },
    sameAs: [
      'https://www.instagram.com/teclas.ciudadjardin/',
      'https://www.youtube.com/@roxanaarena618',
    ],
  },
};

export default mediaKitJsonLd;
