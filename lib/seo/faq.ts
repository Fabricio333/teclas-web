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
