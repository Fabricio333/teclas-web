import eventJsonLd from '@/lib/seo/event';
import { pastEventJsonLd } from '@/lib/seo/pastEvent';

/**
 * Single source of truth for /events and its `/events/{slug}` detail pages, so
 * a card and its article can never drift apart. The copy of the pre-existing
 * "Piano Workshop in Ciudad Jardín" entry is reproduced verbatim from the old
 * hard-coded markup — moved, never rewritten (see the SEO rule in CLAUDE.md).
 */
export type TeclasEvent = {
  slug: string;
  title: string;
  subtitle?: string;
  status: 'upcoming' | 'past';
  /** Human-readable date line shown on the card and the article. */
  date: string;
  summary: string;
  location: string;
  image: string;
  imageAlt: string;
  /** Label of the WhatsApp pill — an ended event should not say "inscribirme". */
  ctaLabel: string;
  /** Pre-filled WhatsApp message. */
  whatsappMessage: string;
  /** Article body, one string per paragraph. */
  body: string[];
  /** Fact list rendered beside the article body. */
  facts: { label: string; value: string }[];
  /** Metadata description for the detail page. */
  metaDescription: string;
  jsonLd: object;
};

export const WHATSAPP_NUMBER = '5491134162288';

export function whatsappUrl(message: string): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

export const events: TeclasEvent[] = [
  {
    slug: 'piano-workshop-ciudad-jardin',
    title: 'Piano Workshop in Ciudad Jardín',
    status: 'upcoming',
    date: '01 de Septiembre de 2024, 10:00 hs.',
    summary: 'Taller intensivo de piano para todos los niveles.',
    location: 'TECLAS — Blvd. Aviador Finca 6142, Local 12, Ciudad Jardín.',
    image: '/events/piano-workshop-ciudad-jardin.jpg',
    imageAlt: 'Piano en el estudio de TECLAS, Ciudad Jardín',
    ctaLabel: 'Inscribirme por WhatsApp',
    whatsappMessage:
      '¡Hola TECLAS! Quiero inscribirme al Piano Workshop in Ciudad Jardín.',
    metaDescription:
      'Taller intensivo de piano para todos los niveles en TECLAS Ciudad Jardín.',
    body: [
      'Taller intensivo de piano para todos los niveles.',
      'Trabajamos en grupos reducidos para que cada persona tenga tiempo al teclado y una devolución concreta sobre lo que está tocando, sin importar desde qué punto arranque.',
      'No hace falta traer instrumento: en el estudio hay teclados disponibles durante todo el encuentro.',
    ],
    facts: [
      { label: 'Fecha', value: '01 de Septiembre de 2024, 10:00 hs.' },
      { label: 'Duración', value: '2 horas' },
      { label: 'Nivel', value: 'Todos los niveles' },
      { label: 'Lugar', value: 'Blvd. Aviador Finca 6142, Local 12' },
      { label: 'Cupos', value: 'Limitados' },
    ],
    jsonLd: eventJsonLd,
  },
  {
    slug: 'taller-piano-adultos-principiantes',
    title: 'Taller de Piano para Adultos Principiantes',
    subtitle: 'Clase abierta «El Piano: una mirada diferente»',
    status: 'past',
    date: 'Sábado 20 de Junio de 2026, 16:00 hs.',
    summary:
      'Clase abierta para jóvenes y adultos principiantes y para quienes aún no cuentan con experiencia.',
    location: 'TECLAS — Blvd. Aviador Finca 6142, Local 12, Ciudad Jardín.',
    image: '/events/taller-piano-adultos-principiantes.jpg',
    imageAlt:
      'Grupo de adultos tocando el teclado durante la clase abierta en TECLAS',
    ctaLabel: 'Consultar la próxima edición',
    whatsappMessage:
      '¡Hola TECLAS! Vi el Taller de Piano para Adultos Principiantes y quiero saber cuándo es la próxima edición.',
    metaDescription:
      'Clase abierta de piano en TECLAS Ciudad Jardín para jóvenes y adultos principiantes, y para quienes aún no cuentan con experiencia.',
    body: [
      '«El Piano: una mirada diferente» fue una clase abierta pensada para jóvenes y adultos que querían aprender a tocar y todavía no habían tocado nunca un teclado.',
      'La propuesta fue sacarle el peso al piano: nada de exámenes ni de años de teoría previa. Cada persona se sentó frente a un instrumento y tocó desde el primer momento, con material impreso para seguir la clase y llevarse a casa.',
      'El encuentro fue con cupos limitados para que el acompañamiento fuera cercano, y la única contribución fue el material impreso y el seguro: $5.000.',
    ],
    facts: [
      { label: 'Fecha', value: 'Sábado 20 de Junio de 2026, 16:00 hs.' },
      { label: 'Duración', value: '2 horas' },
      {
        label: 'Dirigido a',
        value: 'Jóvenes y adultos principiantes, sin experiencia previa',
      },
      { label: 'Lugar', value: 'Blvd. Aviador Finca 6142, Local 12' },
      { label: 'Cupos', value: 'Limitados' },
      { label: 'Contribución', value: 'Material impreso y seguro: $5.000' },
    ],
    jsonLd: pastEventJsonLd,
  },
];

export const upcomingEvents = events.filter((e) => e.status === 'upcoming');
export const pastEvents = events.filter((e) => e.status === 'past');

export function getEventBySlug(slug: string): TeclasEvent | undefined {
  return events.find((event) => event.slug === slug);
}
