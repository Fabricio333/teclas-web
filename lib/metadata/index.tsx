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

export default {
  homeMetadata,
  eventsMetadata,
  faqMetadata,
  resourcesMetadata,
  pianoPlayerMetadata,
  earTrainingMetadata,
};
