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
    {
      "@type": "Question",
      "name": "¿Puedo asistir a una clase de prueba?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Sí, coordinamos clases de prueba para que conozcas nuestra metodología antes de inscribirte."
      }
    }
  ]
};
export default faqJsonLd;

