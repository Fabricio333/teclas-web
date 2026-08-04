/**
 * Structured data for /ear-training/encontra-la-nota.
 *
 * New page — added alongside `earTraining.ts`, which keeps describing the hub
 * untouched. `isPartOf` points at the hub so the two read as a section, not as
 * two pages saying the same thing.
 */
export const earTrainingEncontraLaNotaJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'Encontrá la nota - TECLAS Ciudad Jardín',
  url: 'https://teclasciudadjardin.com.ar/ear-training/encontra-la-nota',
  image: 'https://teclasciudadjardin.com.ar/teclas.jpg',
  description:
    'Juego de oído para encontrar en el piano la nota que suena. Cinco niveles, de Do Re Mi a dos octavas, con teclado, MIDI o micrófono.',
  applicationCategory: 'EducationalApplication',
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
  educationalLevel: ['Principiante', 'Intermedio'],
  learningResourceType: 'Aplicación interactiva',
  teaches: 'Reconocimiento de notas de oído',
  isPartOf: {
    '@type': 'WebApplication',
    name: 'Entrenamiento Auditivo - TECLAS Ciudad Jardín',
    url: 'https://teclasciudadjardin.com.ar/ear-training',
  },
};

export default earTrainingEncontraLaNotaJsonLd;
