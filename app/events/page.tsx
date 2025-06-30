import type { Metadata } from "next";
import eventJsonLd from "@/lib/seo/event";

export const metadata: Metadata = {
  title: "Eventos | TECLAS Ciudad Jard\u00edn",
  description: "Pr\u00f3ximos eventos y talleres de piano en Ciudad Jard\u00edn, Buenos Aires."
};

export function Head() {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(eventJsonLd) }}
    />
  );
}

export default function EventsPage() {
  return (
    <div className="container my-8">
      <h1 className="text-3xl font-bold mb-4">Pr\u00f3ximos Eventos</h1>
      <div className="border p-4">
        <h2 className="text-xl font-semibold mb-2">Piano Workshop in Ciudad Jard\u00edn</h2>
        <p>01 de septiembre de 2024, 10:00 hs.</p>
        <p>Taller intensivo de piano para todos los niveles.</p>
        <a href="tel:+541134162288" className="text-blue-600 underline">Contactar para inscripci\u00f3n</a>
      </div>
    </div>
  );
}
