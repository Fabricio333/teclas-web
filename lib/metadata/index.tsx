import type { Metadata } from 'next';

export const homeMetadata: Metadata = {
  title: 'TECLAS - Clases de Piano en Ciudad Jardín, Buenos Aires',
  description:
    'Clases de piano personalizadas en Ciudad Jardín, Buenos Aires. Domina el arte del piano con clases presenciales adaptadas a vos.',
  alternates: {
    canonical: 'https://teclasciudadjardin.com.ar/',
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: 'website',
    url: 'https://teclasciudadjardin.com.ar/',
    title: 'TECLAS - Clases de Piano en Ciudad Jardín, Buenos Aires',
    description:
      'Clases de piano personalizadas en Ciudad Jardín, Buenos Aires. Domina el arte del piano con clases presenciales adaptadas a vos.',
    siteName: 'TECLAS',
    images: [
      {
        url: '/teclas.jpg',
      },
    ],
  },
};

export const eventsMetadata: Metadata = {
  title: 'Eventos | TECLAS Ciudad Jardín',
  description:
    'Próximos eventos y talleres de piano en Ciudad Jardín, Buenos Aires.',
  alternates: {
    canonical: 'https://teclasciudadjardin.com.ar/events',
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: 'website',
    url: 'https://teclasciudadjardin.com.ar/events',
    title: 'Eventos | TECLAS Ciudad Jardín',
    description:
      'Próximos eventos y talleres de piano en Ciudad Jardín, Buenos Aires.',
    siteName: 'TECLAS',
    images: [
      {
        url: '/teclas.jpg',
      },
    ],
  },
};

export const faqMetadata: Metadata = {
  title: 'Preguntas frecuentes | TECLAS Ciudad Jardín',
  description:
    'Respuestas a las dudas más comunes sobre nuestras clases de piano en Ciudad Jardín, Buenos Aires.',
  alternates: {
    canonical: 'https://teclasciudadjardin.com.ar/faq',
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: 'website',
    url: 'https://teclasciudadjardin.com.ar/faq',
    title: 'Preguntas frecuentes | TECLAS Ciudad Jardín',
    description:
      'Respuestas a las dudas más comunes sobre nuestras clases de piano en Ciudad Jardín, Buenos Aires.',
    siteName: 'TECLAS',
    images: [
      {
        url: '/teclas.jpg',
      },
    ],
  },
};

export const resourcesMetadata: Metadata = {
  title: 'Recursos de Aprendizaje | TECLAS Ciudad Jardín',
  description: 'Material de aprendizaje para mejorar tu práctica de piano.',
  alternates: {
    canonical: 'https://teclasciudadjardin.com.ar/resources',
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: 'website',
    url: 'https://teclasciudadjardin.com.ar/resources',
    title: 'Recursos de Aprendizaje | TECLAS Ciudad Jardín',
    description: 'Material de aprendizaje para mejorar tu práctica de piano.',
    siteName: 'TECLAS',
    images: [
      {
        url: '/teclas.jpg',
      },
    ],
  },
};

export const pianoPlayerMetadata: Metadata = {
  title: 'Aprende Piano Online | TECLAS Ciudad Jardín',
  description:
    'Aplicación interactiva para aprender piano online. Seguí las notas en la partitura y tocá canciones clásicas usando tu teclado o haciendo clic en las teclas del piano.',
  alternates: {
    canonical: 'https://teclasciudadjardin.com.ar/piano-player',
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: 'website',
    url: 'https://teclasciudadjardin.com.ar/piano-player',
    title: 'Aprende Piano Online | TECLAS Ciudad Jardín',
    description:
      'Aplicación interactiva para aprender piano online. Seguí las notas en la partitura y tocá canciones clásicas usando tu teclado o haciendo clic en las teclas del piano.',
    siteName: 'TECLAS',
    images: [
      {
        url: '/teclas.jpg',
      },
    ],
  },
};

export const earTrainingMetadata: Metadata = {
  title: 'Entrenamiento Auditivo | TECLAS Ciudad Jardín',
  description:
    'Entrená tu oído musical identificando notas en el piano. Escuchá, reconocé y mejorá tu percepción auditiva con ejercicios interactivos.',
  alternates: {
    canonical: 'https://teclasciudadjardin.com.ar/ear-training',
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: 'website',
    url: 'https://teclasciudadjardin.com.ar/ear-training',
    title: 'Entrenamiento Auditivo | TECLAS Ciudad Jardín',
    description:
      'Entrená tu oído musical identificando notas en el piano. Escuchá, reconocé y mejorá tu percepción auditiva con ejercicios interactivos.',
    siteName: 'TECLAS',
    images: [
      {
        url: '/teclas.jpg',
      },
    ],
  },
};

/**
 * Personal dashboard — noindex on purpose. It shows one student's own saved
 * progress and has no value in search results.
 */
export const progresoMetadata: Metadata = {
  title: 'Mi progreso | TECLAS Ciudad Jardín',
  description:
    'Seguí tu progreso en el piano: nivel, racha de práctica, estrellas y logros.',
  alternates: {
    canonical: 'https://teclasciudadjardin.com.ar/progreso',
  },
  robots: {
    index: false,
    follow: true,
  },
};

/**
 * Device-specific setup flow — nothing to index, and it only means anything
 * to the person sitting at that microphone.
 */
export const calibracionMetadata: Metadata = {
  title: 'Calibrar el micrófono | TECLAS Ciudad Jardín',
  description:
    'Calibrá el micrófono con tu piano para que Teclas reconozca mejor las notas que tocás.',
  alternates: {
    canonical: 'https://teclasciudadjardin.com.ar/calibracion',
  },
  robots: {
    index: false,
    follow: true,
  },
};

/**
 * New page — added, not altered, per the SEO rule in CLAUDE.md.
 *
 * Indexable on purpose: a media kit exists to be found by journalists and
 * partners searching for the school's assets.
 */
export const mediaKitMetadata: Metadata = {
  title: 'Media kit | TECLAS Ciudad Jardín',
  description:
    'Logo, colores, tipografías, fotos y textos de TECLAS Ciudad Jardín para prensa, notas y colaboraciones.',
  alternates: {
    canonical: 'https://teclasciudadjardin.com.ar/media-kit',
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: 'website',
    url: 'https://teclasciudadjardin.com.ar/media-kit',
    title: 'Media kit | TECLAS Ciudad Jardín',
    description:
      'Logo, colores, tipografías, fotos y textos de TECLAS Ciudad Jardín para prensa, notas y colaboraciones.',
    siteName: 'TECLAS',
    images: [{ url: '/teclas.jpg' }],
  },
};

/**
 * New page — added, not altered, per the SEO rule in CLAUDE.md.
 *
 * Unlisted on purpose: the flyers are meant to be reached from a link the
 * school sends, not found in search. It is in neither the nav, the footer nor
 * the sitemap, and `follow: false` keeps crawlers from walking into the PNGs
 * from here.
 */
export const downloadMetadata: Metadata = {
  title: 'Descargas | TECLAS Ciudad Jardín',
  description:
    'Flyers de los próximos eventos de TECLAS, listos para publicar.',
  alternates: {
    canonical: 'https://teclasciudadjardin.com.ar/download',
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default {
  homeMetadata,
  eventsMetadata,
  faqMetadata,
  resourcesMetadata,
  pianoPlayerMetadata,
  earTrainingMetadata,
  progresoMetadata,
  calibracionMetadata,
  mediaKitMetadata,
  downloadMetadata,
};
