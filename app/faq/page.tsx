import type { Metadata } from "next";
import faqJsonLd from "@/lib/seo/faq";

export const metadata: Metadata = {
  title: "Preguntas frecuentes | TECLAS Ciudad Jard\u00edn",
  description: "Respuestas a las dudas m\u00e1s comunes sobre nuestras clases de piano en Ciudad Jard\u00edn, Buenos Aires."
};

export function Head() {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
    />
  );
}

export default function FAQPage() {
  return (
    <div className="container my-8">
      <h1 className="text-3xl font-bold mb-4">Preguntas Frecuentes</h1>
      <div className="space-y-6">
        <div>
          <h2 className="font-semibold">\u00bfNecesito experiencia previa para tomar clases?</h2>
          <p>No es necesario contar con experiencia previa, nos adaptamos a tu nivel.</p>
        </div>
        <div>
          <h2 className="font-semibold">\u00bfCu\u00e1ntas clases por semana se dictan?</h2>
          <p>Por lo general ofrecemos una clase semanal de una hora.</p>
        </div>
        <div>
          <h2 className="font-semibold">\u00bfPuedo asistir a una clase de prueba?</h2>
          <p>S\u00ed, pod\u00e9s coordinar una clase de prueba sin compromiso.</p>
        </div>
      </div>
    </div>
  );
}
