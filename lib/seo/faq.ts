export interface FaqItem {
  title: string;
  description: string;
}

export const faqItems: FaqItem[] = [
  {
    title: '¿Necesito experiencia previa para tomar clases?',
    description:
      'No es necesario tener conocimientos previos, enseñamos desde nivel inicial hasta avanzado.',
  },
  {
    title: '¿Cuántas clases por semana se dictan?',
    description:
      'Generalmente ofrecemos una clase semanal de una hora, aunque podemos adaptarnos a otras necesidades.',
  },
  {
    title: '¿Desde qué edad se puede empezar?',
    description:
      'Las clases están pensadas para chicos desde los 4 años, jóvenes y adultos.',
  },
  {
    title: '¿Necesito tener piano o teclado en casa?',
    description:
      'No es indispensable para comenzar. Podemos orientarte sobre las opciones más adecuadas para practicar en casa.',
  },
];

export const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqItems.map(({ title, description }) => ({
    '@type': 'Question',
    name: title,
    acceptedAnswer: {
      '@type': 'Answer',
      text: description,
    },
  })),
};

export default faqJsonLd;
