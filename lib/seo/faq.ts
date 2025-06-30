export const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "¿Necesito experiencia previa para tomar clases?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "No es necesario tener conocimientos previos, enseñamos desde nivel inicial hasta avanzado."
      }
    },
    {
      "@type": "Question",
      "name": "¿Cuántas clases por semana se dictan?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Generalmente ofrecemos una clase semanal de una hora, aunque podemos adaptarnos a otras necesidades."
      }
    },
  ]
};
export default faqJsonLd;

