/**
 * Hero artwork -> the story video's composition.
 *
 *   npm run video:artwork
 *
 * The animated story reuses the landing page's keyboard, notes, stars and
 * green field, same as the flyer does. The flyer can build its SVG at render
 * time because it generates its own HTML; a HyperFrames composition is a
 * static file that Chromium loads directly, so the markup has to be written
 * into it ahead of time.
 *
 * This writes that markup between the two marker comments in
 * `videos/event-story/index.html`. Everything outside the markers is left
 * alone, so the composition stays hand-authored — only the artwork is
 * generated. Re-run it after changing anything under `lib/hero-artwork/`.
 *
 * Unlike the flyer's copy, every piece carries a class so the composition can
 * animate the parts independently: `.hf-key`, `.hf-note`, `.hf-star`.
 */

import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { register } from 'node:module';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

register('../flyer/ts-loader.mjs', import.meta.url);

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const PROJECT = join(ROOT, 'videos/event-story');
const COMPOSITION = join(PROJECT, 'index.html');

const START = '<!-- hero-artwork:start -->';
const END = '<!-- hero-artwork:end -->';

const keyboardModule = await import('@/lib/hero-artwork/keyboard');
const decorations = await import('@/lib/hero-artwork/decorations');
const particles = await import('@/lib/hero-artwork/particles');

const { VIEWBOX_WIDTH, VIEWBOX_HEIGHT, buildKeyboard } = keyboardModule;
const { DECORATIONS, NOTE_SHAPES, STARS, starPoints } = decorations;
const { buildParticles, PARTICLE_COLOR, PARTICLE_FIELD } = particles;

// ---------------------------------------------------------------- artwork

const keyboard = buildKeyboard();

/** Still frame of the drifting field: every dot at phase zero. */
const field = buildParticles()
  .map(
    (p) =>
      `<circle cx="${p.x}" cy="${p.y}" r="${p.radius.toFixed(2)}" opacity="${p.alpha.toFixed(3)}"/>`,
  )
  .join('');

const stars = STARS.map(
  (s, i) =>
    `<polygon class="hf-star" data-i="${i}" fill="${s.fill}" points="${starPoints(s.cx, s.cy, s.outer, s.inner)}" transform="rotate(${s.rotate} ${s.cx} ${s.cy})"/>`,
).join('');

/* The treble clef is a text glyph (U+1D11E); the embedded subsets do not
   carry it, so it is dropped here exactly as it is on the flyer. */
const notes = DECORATIONS.filter((d) => d.glyph !== 'treble')
  .map((d, i) => {
    const shapes = NOTE_SHAPES[d.glyph]
      .map((shape) =>
        shape.kind === 'ellipse'
          ? `<ellipse cx="${shape.cx}" cy="${shape.cy}" rx="${shape.rx}" ry="${shape.ry}"${shape.transform ? ` transform="${shape.transform}"` : ''}/>`
          : `<path d="${shape.d}"${
              shape.strokeWidth
                ? ` fill="none" stroke="${d.color}" stroke-width="${shape.strokeWidth}"${shape.round ? ' stroke-linecap="round"' : ''}`
                : ''
            }/>`,
      )
      .join('');
    return `<g class="hf-note" data-i="${i}" transform="${d.transform}" fill="${d.color}">${shapes}</g>`;
  })
  .join('');

const whiteKeys = keyboard.whiteKeys
  .map(
    (k, i) =>
      `<path class="hf-key" data-i="${i}" d="${k.path}" fill="url(#storyWhiteKey)"/>`,
  )
  .join('');
const keyFronts = keyboard.whiteKeys
  .map((k) => `<path d="${k.frontPath}" fill="#c9cbbf"/>`)
  .join('');
const dividers = keyboard.whiteKeyDividers
  .map(
    (d) =>
      `<path d="${d}" fill="none" stroke="#b9bcae" stroke-width="2.4" stroke-linecap="round"/>`,
  )
  .join('');
const blackKeys = keyboard.blackKeys
  .map(
    (k, i) =>
      `<path class="hf-key" data-i="${i + keyboard.whiteKeys.length}" d="${k.path}" fill="url(#storyBlackKey)" stroke="#2d2e33" stroke-width="2.8"/>`,
  )
  .join('');
const blackCaps = keyboard.blackKeys
  .map(
    (k) =>
      `<path d="${k.capPath}" fill="#62646a" stroke="#3f4147" stroke-width="1.8"/>`,
  )
  .join('');

/*
 * Field grown and nudged left, scaled about its own centre. The video runs
 * these harder than the flyer does — it has the full canvas width to play
 * with, where the flyer has to leave room for the text column beside it.
 */
const FIELD_SCALE = 1.36;
const FIELD_SHIFT_X = -80;
/* The whole scene, keyboard included, slides left by this many viewBox units. */
const SCENE_SHIFT_X = -48;
const fieldTransform =
  `translate(${(PARTICLE_FIELD.centerX * (1 - FIELD_SCALE) + FIELD_SHIFT_X).toFixed(1)} ` +
  `${(PARTICLE_FIELD.centerY * (1 - FIELD_SCALE)).toFixed(1)}) scale(${FIELD_SCALE})`;

const svg = `<svg id="hf-artwork" viewBox="0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="storyWhiteKey" x1="0%" x2="0%" y1="0%" y2="100%">
            <stop offset="0%" stop-color="#ffffff"/>
            <stop offset="62%" stop-color="#fbfbf6"/>
            <stop offset="100%" stop-color="#ecece2"/>
          </linearGradient>
          <linearGradient id="storyBlackKey" x1="0%" x2="0%" y1="0%" y2="100%">
            <stop offset="0%" stop-color="#313237"/>
            <stop offset="58%" stop-color="#202126"/>
            <stop offset="100%" stop-color="#0d0e12"/>
          </linearGradient>
          <filter id="storyKeyShadow" x="-20%" y="-20%" width="140%" height="150%">
            <feDropShadow dx="0" dy="9" flood-color="#05070f" flood-opacity="0.55" stdDeviation="10"/>
          </filter>
        </defs>
        <g id="hf-scene" transform="translate(${SCENE_SHIFT_X} 0)">
          <g id="hf-field" fill="${PARTICLE_COLOR}" transform="${fieldTransform}">${field}</g>
          <g id="hf-stars">${stars}</g>
          <g id="hf-keyboard" filter="url(#storyKeyShadow)">
            ${whiteKeys}${keyFronts}${dividers}
            <path d="${keyboard.keyboardEdgePath}" fill="none" stroke="#b9bcae" stroke-width="3.2" stroke-linejoin="round"/>
            ${blackKeys}${blackCaps}
          </g>
          <g id="hf-notes">${notes}</g>
        </g>
      </svg>`;

// ---------------------------------------------------------------- write

const html = readFileSync(COMPOSITION, 'utf8');
const from = html.indexOf(START);
const to = html.indexOf(END);
if (from === -1 || to === -1) {
  throw new Error(`markers ${START} / ${END} not found in ${COMPOSITION}`);
}

writeFileSync(
  COMPOSITION,
  html.slice(0, from + START.length) +
    '\n      ' +
    svg +
    '\n      ' +
    html.slice(to),
);

// Fonts and the isotipo travel with the project so a render needs no network.
const FONTS = [
  'Lobster-latin.woff2',
  'Delius-latin.woff2',
  'ComicNeue-latin.woff2',
];
mkdirSync(join(PROJECT, 'assets/fonts'), { recursive: true });
for (const font of FONTS) {
  copyFileSync(
    join(ROOT, 'scripts/flyer/fonts', font),
    join(PROJECT, 'assets/fonts', font),
  );
}
copyFileSync(join(ROOT, 'public/icon.svg'), join(PROJECT, 'assets/icon.svg'));

console.log(
  `Artwork synced into ${COMPOSITION.replace(ROOT, '')}\n` +
    `  ${keyboard.whiteKeys.length} white keys, ${keyboard.blackKeys.length} black keys, ` +
    `${STARS.length} stars, ${DECORATIONS.length - 1} notes, ${field.split('<circle').length - 1} dots`,
);
