/**
 * Structured data for /ear-training/simon.
 *
 * New page — added alongside `earTraining.ts`, which keeps describing the hub
 * untouched. `isPartOf` points at the hub so the two read as a section, not as
 * two pages saying the same thing.
 */
export const earTrainingSimonJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'Simon musical - TECLAS Ciudad Jardín',
  url: 'https://teclasciudadjardin.com.ar/ear-training/simon',
  image: 'https://teclasciudadjardin.com.ar/teclas.jpg',
  description:
    'Juego de oído y memoria: la app toca una secuencia de notas y el estudiante la repite en el piano, sumando una nota por ronda.',
  applicationCategory: 'GameApplication',
  operatingSystem: 'Web',
  browserRequirements: 'Requiere un navegador moderno con soporte de audio',
  inLanguage: 'es',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'ARS',
  },
  author: {
    '@type': 'Organization',
    name: 'TECLAS Ciudad Jardín',
    url: 'https://teclasciudadjardin.com.ar',
  },
  educationalLevel: ['Principiante'],
  learningResourceType: 'Juego interactivo',
  teaches: 'Memoria melódica y rítmica',
  isPartOf: {
    '@type': 'WebApplication',
    name: 'Entrenamiento Auditivo - TECLAS Ciudad Jardín',
    url: 'https://teclasciudadjardin.com.ar/ear-training',
  },
};

export default earTrainingSimonJsonLd;
