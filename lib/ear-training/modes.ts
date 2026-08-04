/**
 * The two listening games, as pages.
 *
 * /ear-training stays the hub where both games live behind a tab switch — that
 * is still the page a student lands on and plays. These entries give each game
 * a URL of its own, so a search engine has one indexable page per game and a
 * teacher can link straight to the exercise a student needs.
 *
 * Names and slugs live here rather than in the pages, so the hub's tabs, the
 * cross-links and the headings can never disagree — the same reason
 * `lib/events/index.ts` is the single source for the event pages.
 */
export type EarTrainingMode = {
  slug: string;
  /** Short name — tab label and cross-links. */
  name: string;
  /** Heading of the game's own page. Says more than the tab label, and keeps
   *  the page from opening with the same words twice in a row. */
  heading: string;
  /** Line under the heading. */
  tagline: string;
  /** Intro paragraphs above the game. */
  body: string[];
};

export const ENCONTRA_LA_NOTA: EarTrainingMode = {
  slug: 'encontra-la-nota',
  name: 'Encontrá la nota',
  heading: 'Encontrá la nota en el piano',
  tagline: 'Suena una nota, la buscás en el teclado.',
  body: [
    'Suena una nota y tenés que encontrarla en el piano. Se empieza con Do, Re y Mi, y a medida que el oído se acomoda aparecen la octava completa, los sostenidos y, al final, dos octavas.',
    'Podés responder con el mouse, con las teclas de la computadora, con un teclado MIDI o tocando tu propio piano frente al micrófono.',
  ],
};

export const SIMON_MUSICAL: EarTrainingMode = {
  slug: 'simon',
  name: 'Simon musical',
  heading: 'Simon musical: escuchá y repetí',
  tagline: 'La app toca una secuencia, vos la repetís.',
  body: [
    'La app toca una secuencia corta y vos la repetís en el piano. Cada ronda suma una nota, y a partir de la tercera aparecen las notas largas: primero se afina el oído para las alturas y después para el ritmo.',
    'Se juega con las siete teclas blancas de una octava — Do, Re, Mi, Fa, Sol, La y Si — así que se puede empezar sin saber nada de música.',
  ],
};

export const EAR_TRAINING_MODES: EarTrainingMode[] = [
  ENCONTRA_LA_NOTA,
  SIMON_MUSICAL,
];

export function earTrainingModePath(slug: string): string {
  return `/ear-training/${slug}`;
}
