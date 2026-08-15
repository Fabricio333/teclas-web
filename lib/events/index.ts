import eventJsonLd from '@/lib/seo/event';
import { pastEventJsonLd } from '@/lib/seo/pastEvent';
import { pastColonia2026JsonLd } from '@/lib/seo/pastColonia2026';
import { colonia2027JsonLd } from '@/lib/seo/colonia2027';

/**
 * Single source of truth for /events and its `/events/{slug}` detail pages, so
 * a card and its article can never drift apart. Upcoming events are listed
 * first, past ones after.
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
  /**
   * Headline for the generated flyer and story video, when the page title is
   * not what should be shouted on a poster. Falls back to the part of `title`
   * after the colon.
   */
  flyerTitle?: string;
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
    slug: 'colonia-verano-2027',
    title: 'Colonia de Verano 2027',
    subtitle: 'Música, juegos y baile para las vacaciones',
    status: 'upcoming',
    date: 'Verano 2027 · Fechas a confirmar',
    summary:
      'Colonia de verano con música, juegos y baile para los más chicos durante las vacaciones.',
    location: 'TECLAS — Blvd. Aviador Finca 6142, Local 12, Ciudad Jardín.',
    image: '/events/colonia-verano-2026.jpg',
    imageAlt: 'Grupo de chicos de la colonia de verano de TECLAS en el parque',
    ctaLabel: 'Inscribirme por WhatsApp',
    whatsappMessage:
      '¡Hola TECLAS! Quiero anotarme a la Colonia de Verano 2027.',
    metaDescription:
      'Colonia de Verano 2027 en TECLAS Ciudad Jardín: música, juegos y baile para las vacaciones. Fechas a confirmar.',
    body: [
      'La Colonia de Verano es la propuesta de TECLAS para las vacaciones: música, juegos, baile y movimiento para los más chicos.',
      'Cada jornada combina actividades musicales con juegos al aire libre, para que el verano se sienta como vacaciones de verdad y a la vez la música siga sonando.',
      'Las fechas de la edición se están confirmando. Si te quedó gustando, dejanos un mensaje y te avisamos apenas estén.',
    ],
    facts: [
      { label: 'Fechas', value: 'A confirmar' },
      { label: 'Ediciones', value: 'Enero y Febrero' },
      { label: 'Lugar', value: 'Blvd. Aviador Finca 6142, Local 12' },
      { label: 'Dirigido a', value: 'Niños y jóvenes' },
    ],
    jsonLd: colonia2027JsonLd,
  },
  {
    slug: 'clase-abierta-piano-series-pelis-juegos',
    title: 'Clase abierta de piano: series, pelis y juegos',
    flyerTitle: 'Pelis, Series y Juegos',
    subtitle: 'Niños y jóvenes interpretarán música de series, pelis y juegos',
    status: 'upcoming',
    date: 'Sábado 29 de Agosto de 2026',
    summary:
      'Niños y jóvenes interpretarán música de series, películas y videojuegos.',
    location: 'TECLAS — Blvd. Aviador Finca 6142, Local 12, Ciudad Jardín.',
    image: '/events/clase-abierta-piano-series-pelis-juegos.jpg',
    imageAlt: 'Alumnos de TECLAS tocando el teclado en el estudio',
    ctaLabel: 'Inscribirme por WhatsApp',
    whatsappMessage:
      '¡Hola TECLAS! Quiero inscribirme a la clase abierta de piano del 29 de agosto.',
    metaDescription:
      'Clase abierta de piano en TECLAS Ciudad Jardín: niños y jóvenes interpretarán música de series, películas y videojuegos.',
    body: [
      'Una clase abierta para venir a escuchar y a tocar: niños y jóvenes de TECLAS interpretarán música de series, películas y videojuegos.',
      'Los temas que suenan en pantalla son la mejor puerta de entrada al piano — se reconocen de entrada, se disfrutan desde la primera nota y se aprenden tocando.',
      'La clase está abierta a familias y a quienes estén pensando en empezar a estudiar piano. La contribución es de $5.000.',
    ],
    facts: [
      { label: 'Fecha', value: 'Sábado 29 de Agosto de 2026' },
      { label: 'Horario', value: '17:00 hs.' },
      { label: 'Dirigido a', value: 'Niños y jóvenes, y sus familias' },
      { label: 'Lugar', value: 'Blvd. Aviador Finca 6142, Local 12' },
      { label: 'Entrada', value: '$5.000' },
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
  {
    slug: 'colonia-verano-2026',
    title: 'Colonia de Verano 2026',
    subtitle: 'Música, juegos y baile para las vacaciones',
    status: 'past',
    date: 'Enero y Febrero de 2026',
    summary:
      'Colonia de verano con música, juegos y baile para los más chicos durante las vacaciones.',
    location: 'TECLAS — Blvd. Aviador Finca 6142, Local 12, Ciudad Jardín.',
    image: '/events/colonia-verano-2026.jpg',
    imageAlt:
      'Grupo de chicos de la colonia de verano de TECLAS durante la edición 2026',
    ctaLabel: 'Consultar la próxima edición',
    whatsappMessage:
      '¡Hola TECLAS! Vi la Colonia de Verano 2026 y quiero saber cuándo es la próxima.',
    metaDescription:
      'Colonia de Verano 2026 en TECLAS Ciudad Jardín: música, juegos y baile para las vacaciones escolares.',
    body: [
      'La Colonia de Verano 2026 fue la propuesta de TECLAS para las vacaciones: música, juegos, baile y movimiento para los más chicos.',
      'Durante enero y febrero, cada jornada combinó actividades musicales con juegos al aire libre, para que el verano se sintiera como vacaciones de verdad y la música siguiera sonando.',
      'Fue un verano a pura música. Si te quedó gustando, consultanos por la próxima edición.',
    ],
    facts: [
      { label: 'Fechas', value: 'Enero y Febrero de 2026' },
      { label: 'Ediciones', value: 'Enero y Febrero' },
      { label: 'Lugar', value: 'Blvd. Aviador Finca 6142, Local 12' },
      { label: 'Dirigido a', value: 'Niños y jóvenes' },
    ],
    jsonLd: pastColonia2026JsonLd,
  },
];

export const upcomingEvents = events.filter((e) => e.status === 'upcoming');
export const pastEvents = events.filter((e) => e.status === 'past');

export function getEventBySlug(slug: string): TeclasEvent | undefined {
  return events.find((event) => event.slug === slug);
}
