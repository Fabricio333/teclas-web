export const earTrainingJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'Entrenamiento Auditivo - TECLAS Ciudad Jardín',
  url: 'https://teclasciudadjardin.com.ar/ear-training',
  image: 'https://teclasciudadjardin.com.ar/teclas.jpg',
  description:
    'Entrená tu oído musical identificando notas en el piano. Escuchá, reconocé y mejorá tu percepción auditiva con ejercicios interactivos.',
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
  teaches: 'Entrenamiento Auditivo',
  isPartOf: {
    '@type': 'WebSite',
    name: 'TECLAS Ciudad Jardín',
    url: 'https://teclasciudadjardin.com.ar',
  },
};
export default earTrainingJsonLd;
