export const pianoPlayerJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "Aprende Piano - TECLAS Ciudad Jardín",
  "url": "https://teclasciudadjardin.com.ar/piano-player",
  "image": "https://teclasciudadjardin.com.ar/teclas.jpg",
  "description":
    "Aplicación interactiva para aprender piano online. Seguí las notas en la partitura y tocá canciones clásicas usando tu teclado o haciendo clic en las teclas del piano.",
  "applicationCategory": "EducationalApplication",
  "operatingSystem": "Web",
  "browserRequirements": "Requiere un navegador moderno con soporte de audio",
  "inLanguage": "es",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "ARS"
  },
  "author": {
    "@type": "Organization",
    "name": "TECLAS Ciudad Jardín",
    "url": "https://teclasciudadjardin.com.ar"
  },
  "educationalLevel": ["Principiante", "Intermedio", "Avanzado"],
  "learningResourceType": "Aplicación interactiva",
  "teaches": "Piano",
  "isPartOf": {
    "@type": "WebSite",
    "name": "TECLAS Ciudad Jardín",
    "url": "https://teclasciudadjardin.com.ar"
  }
};
export default pianoPlayerJsonLd;
