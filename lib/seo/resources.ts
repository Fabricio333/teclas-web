/**
 * Structured data for /resources.
 *
 * The page had none, which is a waste: it is the hub that links the practice
 * tools together, and a CollectionPage carrying an ItemList is exactly how a
 * crawler is told "these three URLs belong together, in this order".
 *
 * Text is taken verbatim from the page and from the existing per-tool schemas,
 * so nothing new is asserted here.
 */
export const resourcesJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  name: 'Recursos de Aprendizaje | TECLAS Ciudad Jardín',
  url: 'https://teclasciudadjardin.com.ar/resources',
  description: 'Material de aprendizaje para mejorar tu práctica de piano.',
  inLanguage: 'es',
  isPartOf: {
    '@type': 'WebSite',
    name: 'TECLAS Ciudad Jardín',
    url: 'https://teclasciudadjardin.com.ar',
  },
  publisher: {
    '@type': 'Organization',
    name: 'TECLAS Ciudad Jardín',
    url: 'https://teclasciudadjardin.com.ar',
  },
  mainEntity: {
    '@type': 'ItemList',
    itemListOrder: 'https://schema.org/ItemListOrderAscending',
    numberOfItems: 3,
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        item: {
          '@type': 'WebApplication',
          name: 'Aprende Piano',
          url: 'https://teclasciudadjardin.com.ar/piano-player',
          applicationCategory: 'EducationalApplication',
          operatingSystem: 'Web',
          description:
            'Seguí las notas en la partitura y tocá canciones clásicas usando tu teclado o haciendo clic en las teclas del piano.',
        },
      },
      {
        '@type': 'ListItem',
        position: 2,
        item: {
          '@type': 'WebApplication',
          name: 'Entrenamiento Auditivo',
          url: 'https://teclasciudadjardin.com.ar/ear-training',
          applicationCategory: 'EducationalApplication',
          operatingSystem: 'Web',
          description:
            'Escuchá las notas y encontralas en el piano. Mejorá tu oído musical con ejercicios interactivos.',
        },
      },
      {
        '@type': 'ListItem',
        position: 3,
        item: {
          '@type': 'WebApplication',
          name: 'Mi progreso',
          url: 'https://teclasciudadjardin.com.ar/progreso',
          applicationCategory: 'EducationalApplication',
          operatingSystem: 'Web',
          description:
            'Mirá tu nivel, tu racha de práctica y los logros que fuiste consiguiendo. Se guarda en este navegador.',
        },
      },
    ],
  },
};

export default resourcesJsonLd;
