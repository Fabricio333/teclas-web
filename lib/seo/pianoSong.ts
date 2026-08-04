import { songPath, type Level } from '@/lib/piano-player/songs';
import {
  difficultyLabel,
  getSongPage,
  songPageDescription,
} from '@/lib/piano-player/songPages';

const SITE = 'https://teclasciudadjardin.com.ar';

/**
 * Structured data for /piano-player/[slug].
 *
 * New pages — added alongside `pianoPlayer.ts`, which keeps describing the hub
 * untouched. `isPartOf` points at the hub so the whole set reads as one section
 * rather than as nineteen pages claiming to be the same app.
 *
 * This one is a function and not an object literal because there is a page per
 * song and every field that could disagree with the game is read from the
 * `Level`: the name, the difficulty and the description all come from the same
 * data the player loads. Structured data that contradicts the page is worse
 * than none at all (see the note in `event.ts`), and the only way to guarantee
 * it does not is to stop writing it by hand.
 */
export function pianoSongJsonLd(level: Level) {
  const url = `${SITE}${songPath(level.id)}`;

  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: `${level.name} en piano - TECLAS Ciudad Jardín`,
    url,
    image: `${SITE}/teclas.jpg`,
    description: songPageDescription(level),
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Web',
    browserRequirements: 'Requiere un navegador moderno con soporte de audio',
    inLanguage: 'es',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'ARS',
    },
    author: {
      '@type': 'Organization',
      name: 'TECLAS Ciudad Jardín',
      url: SITE,
    },
    educationalLevel: [difficultyLabel(level)],
    learningResourceType: 'Partitura interactiva',
    teaches: `Tocar ${level.name} en piano`,
    abstract: getSongPage(level).tagline,
    isPartOf: {
      '@type': 'WebApplication',
      name: 'Aprende Piano - TECLAS Ciudad Jardín',
      url: `${SITE}/piano-player`,
    },
  };
}

export default pianoSongJsonLd;
