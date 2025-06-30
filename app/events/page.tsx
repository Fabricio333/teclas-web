import eventJsonLd from "@/lib/seo/event";
import { eventsMetadata } from "@/lib/metadata";

export { eventsMetadata as metadata };


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
      <h1 className="text-3xl font-bold mb-4">Próximos Eventos</h1>
      <div className="border p-4">
        <h2 className="text-xl font-semibold mb-2">Piano Workshop in Ciudad Jardín</h2>
        <p>01 de Septiembre de 2024, 10:00 hs.</p>
        <p>Taller intensivo de piano para todos los niveles.</p>
        <a href="tel:+541134162288" className="text-blue-600 underline">Contactar para inscripción</a>
      </div>
    </div>
  );
}
