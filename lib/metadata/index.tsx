import type { Metadata } from 'next';

/**
 * The shared link-preview image.
 *
 * Every page used to point at /teclas.jpg, which is 5768x4094 and 3.4 MB.
 * WhatsApp drops any og:image over roughly 300 KB, so links to this site
 * shared there rendered with no picture at all. /og-teclas.jpg is the same
 * artwork at the 1200x630 the platforms actually crop to, and 116 KB.
 *
 * The dimensions and type are declared because scrapers that will not download
 * the file — WhatsApp among them — use them to decide whether to lay the card
 * out large or as a thumbnail. No title, description or URL changed.
 */
const OG_IMAGE = {
  url: '/og-teclas.jpg',
  width: 1200,
  height: 630,
  type: 'image/jpeg',
  alt: 'TECLAS - Clases de Piano en Ciudad Jardín, Buenos Aires',
};

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
    images: [OG_IMAGE],
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
    images: [OG_IMAGE],
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
    images: [OG_IMAGE],
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
    images: [OG_IMAGE],
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
    images: [OG_IMAGE],
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
    images: [OG_IMAGE],
  },
};

/**
 * New pages — added, never altering the entries above (see CLAUDE.md).
 *
 * Each listening game now has a page of its own. The hub at /ear-training is
 * untouched and stays indexable; these two are what a search for "juego para
 * reconocer notas" or "simon musical piano" can actually land on, and they are
 * self-canonical because each one is the game's own page, not a variant of the
 * hub.
 */
export const earTrainingEncontraLaNotaMetadata: Metadata = {
  title: 'Encontrá la Nota - Juego de Oído Online | TECLAS Ciudad Jardín',
  description:
    'Escuchá una nota y encontrala en el piano. Cinco niveles, de Do Re Mi a dos octavas, para jugar con el mouse, el teclado, un MIDI o tu propio piano.',
  alternates: {
    canonical:
      'https://teclasciudadjardin.com.ar/ear-training/encontra-la-nota',
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: 'website',
    url: 'https://teclasciudadjardin.com.ar/ear-training/encontra-la-nota',
    title: 'Encontrá la Nota - Juego de Oído Online | TECLAS Ciudad Jardín',
    description:
      'Escuchá una nota y encontrala en el piano. Cinco niveles, de Do Re Mi a dos octavas, para jugar con el mouse, el teclado, un MIDI o tu propio piano.',
    siteName: 'TECLAS',
    images: [OG_IMAGE],
  },
};

export const earTrainingSimonMetadata: Metadata = {
  title: 'Simon Musical - Juego de Oído y Memoria | TECLAS Ciudad Jardín',
  description:
    'La app toca una secuencia de notas y vos la repetís en el piano. Un juego de oído y memoria con las siete notas de la octava, sin saber música.',
  alternates: {
    canonical: 'https://teclasciudadjardin.com.ar/ear-training/simon',
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: 'website',
    url: 'https://teclasciudadjardin.com.ar/ear-training/simon',
    title: 'Simon Musical - Juego de Oído y Memoria | TECLAS Ciudad Jardín',
    description:
      'La app toca una secuencia de notas y vos la repetís en el piano. Un juego de oído y memoria con las siete notas de la octava, sin saber música.',
    siteName: 'TECLAS',
    images: [OG_IMAGE],
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
    images: [OG_IMAGE],
  },
};

export default {
  homeMetadata,
  eventsMetadata,
  faqMetadata,
  resourcesMetadata,
  pianoPlayerMetadata,
  earTrainingMetadata,
  earTrainingEncontraLaNotaMetadata,
  earTrainingSimonMetadata,
  progresoMetadata,
  calibracionMetadata,
  mediaKitMetadata,
};
