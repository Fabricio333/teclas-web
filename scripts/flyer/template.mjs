/**
 * The flyer itself: `renderFlyer(event, size) -> html`.
 *
 * Everything the page needs is inlined as a data URI — the three brand fonts,
 * the event photo, the isotipo — so the render touches neither the network nor
 * the filesystem once Chromium has the HTML. That is what makes the output
 * byte-stable: no font swap mid-screenshot, no half-loaded image.
 *
 * The two sizes share every token and differ only in the `--*` custom
 * properties set on `.flyer`, so a colour or a wording fix lands on both.
 */

import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const here = (rel) => fileURLToPath(new URL(rel, import.meta.url));

// ---------------------------------------------------------------- assets

const FONTS = {
  lobster: 'fonts/Lobster-latin.woff2',
  delius: 'fonts/Delius-latin.woff2',
  comic: 'fonts/ComicNeue-latin.woff2',
};

function fontFace(family, file) {
  const b64 = readFileSync(here(file)).toString('base64');
  return `@font-face{font-family:'${family}';font-style:normal;font-weight:400;font-display:block;src:url(data:font/woff2;base64,${b64}) format('woff2')}`;
}

function dataUri(absPath, mime) {
  return `data:${mime};base64,${readFileSync(absPath).toString('base64')}`;
}

/**
 * FontAwesome ships each icon as `[width, height, ligatures, unicode, path]`.
 * Taking the path straight from the package keeps the flyer's icons identical
 * to the site's, with no icon font to load and no network call.
 */
function faIcon(icon, className) {
  const [w, h, , , path] = icon.icon;
  const d = Array.isArray(path) ? path.join(' ') : path;
  return `<svg class="${className}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="${d}"/></svg>`;
}

const solid = require('@fortawesome/free-solid-svg-icons');
const brands = require('@fortawesome/free-brands-svg-icons');

// ------------------------------------------------------------- hero artwork

/**
 * The keyboard, notes and green field are the landing page's animated hero,
 * rendered still. Geometry and placement come from `lib/hero-artwork/*` — the
 * same modules the React component draws from — so the flyer cannot fall out
 * of step with the site. Only the palette differs, because here the artwork
 * sits on the night blue instead of a light page.
 *
 * Loaded by `build.mjs` and handed in, since this file is plain JS and the
 * shared modules are TypeScript.
 */
/** Flyer-only adjustments to the shared green field. */
const FIELD_SCALE = 1.18;
const FIELD_SHIFT_X = -60;

function heroSvg(art) {
  const { VIEWBOX_WIDTH, VIEWBOX_HEIGHT } = art;
  const keyboard = art.buildKeyboard();

  // The dot field, drifted to nothing: a still frame is phase zero.
  const field = art
    .buildParticles()
    .map(
      (p) =>
        `<circle cx="${p.x}" cy="${p.y}" r="${p.radius.toFixed(2)}" opacity="${p.alpha.toFixed(3)}"/>`,
    )
    .join('');

  /*
   * The field is grown and nudged left for the flyer only — on the landing
   * page it sits behind a keyboard that shares the frame with headline copy,
   * here it has the whole width. Scaling about the field's own centre rather
   * than the origin, so `FIELD_SHIFT_X` stays the only thing moving it.
   */
  const { centerX, centerY } = art.PARTICLE_FIELD;
  const fieldTransform =
    `translate(${(centerX * (1 - FIELD_SCALE) + FIELD_SHIFT_X).toFixed(1)} ` +
    `${(centerY * (1 - FIELD_SCALE)).toFixed(1)}) scale(${FIELD_SCALE})`;

  const stars = art.STARS.map(
    (s) =>
      `<polygon fill="${s.fill}" points="${art.starPoints(s.cx, s.cy, s.outer, s.inner)}" transform="rotate(${s.rotate} ${s.cx} ${s.cy})"/>`,
  ).join('');

  // The treble clef is a text glyph (U+1D11E) and none of the three embedded
  // subsets carry it, so it is dropped here rather than rendered as tofu.
  const notes = art.DECORATIONS.filter((d) => d.glyph !== 'treble')
    .map((d) => {
      const shapes = art.NOTE_SHAPES[d.glyph]
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
      return `<g transform="${d.transform}" fill="${d.color}">${shapes}</g>`;
    })
    .join('');

  const whiteKeys = keyboard.whiteKeys
    .map((k) => `<path d="${k.path}" fill="url(#flyerWhiteKey)"/>`)
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
      (k) =>
        `<path d="${k.path}" fill="url(#flyerBlackKey)" stroke="#2d2e33" stroke-width="2.8"/>`,
    )
    .join('');
  const blackCaps = keyboard.blackKeys
    .map(
      (k) =>
        `<path d="${k.capPath}" fill="#62646a" stroke="#3f4147" stroke-width="1.8"/>`,
    )
    .join('');

  return `<svg class="heroArt" viewBox="0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="flyerWhiteKey" x1="0%" x2="0%" y1="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="62%" stop-color="#fbfbf6"/>
      <stop offset="100%" stop-color="#ecece2"/>
    </linearGradient>
    <linearGradient id="flyerBlackKey" x1="0%" x2="0%" y1="0%" y2="100%">
      <stop offset="0%" stop-color="#313237"/>
      <stop offset="58%" stop-color="#202126"/>
      <stop offset="100%" stop-color="#0d0e12"/>
    </linearGradient>
    <filter id="flyerKeyShadow" x="-20%" y="-20%" width="140%" height="150%">
      <feDropShadow dx="0" dy="9" flood-color="#05070f" flood-opacity="0.55" stdDeviation="10"/>
    </filter>
  </defs>
  <g fill="${art.PARTICLE_COLOR}" transform="${fieldTransform}">${field}</g>
  ${stars}
  <g filter="url(#flyerKeyShadow)">
    ${whiteKeys}${keyFronts}${dividers}
    <path d="${keyboard.keyboardEdgePath}" fill="none" stroke="#b9bcae" stroke-width="3.2" stroke-linejoin="round"/>
    ${blackKeys}${blackCaps}
  </g>
  ${notes}
</svg>`;
}

// ---------------------------------------------------------------- confetti

const STAR =
  'M50 4 L61.2 34.6 L93.8 35.8 L68.1 55.9 L77 87.2 L50 69 L23 87.2 L31.9 55.9 L6.3 35.8 L38.8 34.6 Z';

/**
 * Hand-placed rather than random: the pieces have to sit in the margins and
 * stay off the type, and a seeded shuffle would still need checking by eye.
 * `[left%, top%, size, rotation, colour, shape]`.
 */
const CONFETTI = [
  [4, 7, 46, -18, '#ED3B95', 'note'],
  [88, 5, 40, 14, '#FFD122', 'star'],
  [93, 15, 30, -8, '#60C9DE', 'note'],
  [7, 17, 34, 22, '#8658A7', 'star'],
  [2, 34, 38, -12, '#F3862C', 'note'],
  [95, 33, 34, 16, '#ED3B95', 'star'],
  [90, 47, 30, -20, '#FFD122', 'note'],
  [3, 52, 32, 10, '#60C9DE', 'star'],
  [94, 63, 40, 18, '#8658A7', 'note'],
  [5, 68, 28, -14, '#F3862C', 'star'],
  [91, 78, 32, -6, '#60C9DE', 'star'],
  [6, 84, 36, 20, '#FFD122', 'note'],
];

function confetti() {
  return CONFETTI.map(([x, y, size, rot, color, shape]) => {
    const art =
      shape === 'star'
        ? `<svg viewBox="0 0 100 100"><path fill="${color}" d="${STAR}"/></svg>`
        : faIcon(solid.faMusic, 'confettiNote').replace('currentColor', color);
    return `<span class="confetti" style="left:${x}%;top:${y}%;width:${size}px;height:${size}px;transform:rotate(${rot}deg)">${art}</span>`;
  }).join('');
}

// ---------------------------------------------------------------- content

/** Contact block — the whole point of the flyer, so it is built from the
 *  same constants the site links against. */
function contactRows(contact) {
  return [
    [brands.faWhatsapp, contact.whatsapp],
    [brands.faInstagram, contact.instagram],
    [solid.faGlobe, contact.website],
  ]
    .map(
      ([icon, text]) =>
        `<li class="contactRow">${faIcon(icon, 'contactIcon')}<span>${esc(text)}</span></li>`,
    )
    .join('');
}

/**
 * The four facts a passer-by needs. Values come from the event's own `facts`
 * list where one exists, so the flyer cannot claim an hour or a price the
 * article does not.
 */
function infoRows(event) {
  const fact = (label) =>
    event.facts.find((f) => f.label === label)?.value ?? '';

  // An event without the matching fact drops its row rather than printing a
  // bare "Horario" / "Entrada" with nothing after it.
  const optional = (label, prefix) => {
    const value = fact(label);
    return value ? `${prefix} ${value.toLowerCase()}` : '';
  };

  const rows = [
    [solid.faCalendarDays, '#ED3B95', event.date],
    [solid.faClock, '#60C9DE', optional('Horario', 'Horario')],
    [
      solid.faLocationDot,
      '#F3862C',
      event.location.replace(/^TECLAS — /, '').replace(/\.$/, ''),
    ],
    [solid.faTicket, '#FFD122', optional('Entrada', 'Entrada')],
  ];

  return rows
    .filter(([, , text]) => text)
    .map(
      ([icon, color, text]) =>
        `<li class="infoRow"><span class="chip" style="background:${color}">${faIcon(icon, 'chipIcon')}</span><span class="infoText">${esc(text)}</span></li>`,
    )
    .join('');
}

/**
 * Event titles are written as "<kind>: <hook>" ("Clase abierta de piano:
 * series, pelis y juegos"). Splitting on the colon gives the small pill its
 * label and the big Lobster line its hook, without either being retyped here —
 * rename the event on the site and the flyer follows.
 */
function kicker(event) {
  return event.title.split(/:\s*/)[0];
}

function headline(event) {
  // An explicit poster headline wins: a page title and a thing you shout on a
  // flyer are not always the same words in the same order.
  if (event.flyerTitle) return event.flyerTitle;

  const rest = event.title.split(/:\s*/).slice(1).join(': ');
  if (!rest) return event.title;
  return rest.charAt(0).toUpperCase() + rest.slice(1);
}

function esc(value) {
  return String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[c],
  );
}

// ---------------------------------------------------------------- template

export function renderFlyer(event, size, contact, publicDir, art) {
  const logo = dataUri(`${publicDir}/icon.svg`, 'image/svg+xml');
  const isStories = size.key === 'stories';

  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><style>
${fontFace('FlyerDisplay', FONTS.lobster)}
${fontFace('FlyerBody', FONTS.delius)}
${fontFace('FlyerSupport', FONTS.comic)}

*{margin:0;padding:0;box-sizing:border-box}

.flyer{
  position:relative;overflow:hidden;
  width:${size.width}px;height:${size.height}px;
  background:#141D36;
  font-family:'FlyerBody',sans-serif;
  color:#fff;
  /* Only these change between the two sizes. */
  --pad-x:${isStories ? 96 : 72}px;
  --pad-top:${isStories ? 130 : 60}px;
  --pad-bottom:${isStories ? 155 : 52}px;
  --logo:${isStories ? 96 : 80}px;
  --wordmark:${isStories ? 70 : 60}px;
  --title:${isStories ? 86 : 74}px;
  --subtitle:${isStories ? 36 : 32}px;
  --hero:${isStories ? 560 : 375}px;
  --chip:${isStories ? 64 : 58}px;
  --info:${isStories ? 34 : 30}px;
  --contact:${isStories ? 34 : 30}px;
}

/* Glow, so the night blue is not a flat wall behind the art. */
.glow{position:absolute;inset:0;
  background:
    radial-gradient(120% 55% at 50% 30%, rgba(65,92,169,.55) 0%, rgba(65,92,169,0) 70%),
    radial-gradient(80% 40% at 50% 100%, rgba(165,206,57,.20) 0%, rgba(165,206,57,0) 70%);
}
.confetti{position:absolute;display:block;opacity:.5}
.confetti svg{width:100%;height:100%;display:block}

.safe{position:absolute;inset:0;z-index:2;
  display:flex;flex-direction:column;justify-content:space-between;align-items:center;
  padding:var(--pad-top) var(--pad-x) var(--pad-bottom);
  text-align:center;
}

/* --- brand lockup --- */
.brand{display:flex;flex-direction:column;align-items:center;gap:10px}
.brandRow{display:flex;align-items:center;gap:22px}
.brandRow img{width:var(--logo);height:var(--logo)}
.wordmark{font-family:'FlyerDisplay',cursive;font-size:var(--wordmark);
  color:#A5CE39;letter-spacing:.06em;line-height:1}
.tagline{font-family:'FlyerSupport',sans-serif;font-size:24px;
  color:rgba(255,255,255,.72);letter-spacing:.16em;text-transform:uppercase}

/* --- headline --- */
/* The margin keeps the pill from reading as part of the lockup above it;
   space-between has no slack to spare once the stack is this full. */
.stage{display:flex;flex-direction:column;align-items:center;width:100%;
  margin-top:${isStories ? 34 : 26}px}
.eyebrow{display:inline-block;background:#FFD122;color:#141D36;
  font-family:'FlyerSupport',sans-serif;font-weight:700;
  font-size:${isStories ? 27 : 24}px;letter-spacing:.24em;
  padding:${isStories ? '14px 34px' : '12px 30px'};border-radius:999px;
  text-transform:uppercase}
.title{font-family:'FlyerDisplay',cursive;font-size:var(--title);
  line-height:1.06;margin-top:${isStories ? 26 : 20}px;
  text-shadow:0 6px 0 rgba(0,0,0,.18)}
.subtitle{font-size:var(--subtitle);line-height:1.32;
  margin-top:${isStories ? 18 : 14}px;color:rgba(255,255,255,.86);
  /* Narrower than the column on purpose, so the sub-line breaks into two
     balanced lines instead of orphaning its last word. */
  max-width:${isStories ? 820 : 720}px}

/* --- hero --- */
/* Vector, so there is no white ground to hide: the keyboard, the notes and the
   green field are drawn straight onto the night blue. The earlier raster went
   through a multiply blend and a white halo purely to dissolve the JPG's
   background — none of that is needed now, and nothing on the flyer is white
   except the keys themselves. */
.hero{position:relative;width:100%;height:var(--hero);
  margin-top:${isStories ? 26 : 20}px;
  display:flex;align-items:center;justify-content:center}

/* Brand glow behind the artwork, so the keys sit in light rather than on a
   flat wall. Deliberately weak — the green dot field is the bright element. */
.heroBloom{position:absolute;inset:-20% -14%;
  background:
    radial-gradient(closest-side, rgba(165,206,57,.30) 0%, rgba(165,206,57,.08) 60%, rgba(165,206,57,0) 100%),
    radial-gradient(closest-side, rgba(96,201,222,.18) 0%, rgba(96,201,222,0) 100%)}

.heroArt{position:relative;display:block;
  height:100%;width:auto;max-width:100%}

/* --- facts --- */
.info{list-style:none;width:100%;margin-top:${isStories ? 32 : 24}px;
  display:flex;flex-direction:column;gap:${isStories ? 18 : 14}px}
.infoRow{display:flex;align-items:center;gap:${isStories ? 26 : 20}px;text-align:left}
.chip{flex:none;width:var(--chip);height:var(--chip);border-radius:50%;
  display:flex;align-items:center;justify-content:center;color:#141D36}
.chipIcon{width:${isStories ? 34 : 29}px;height:${isStories ? 34 : 29}px}
.infoText{font-size:var(--info);line-height:1.26}

/* --- contact --- */
/* Ink on green, never white: media-kit rule for the brand colour. */
/* Stacked on stories, which has the height for it. On the wider-looking but
   shorter post the three lines do not fit across 936px, so they wrap: phone
   and handle share a row, the domain takes the next one. Wrapping rather than
   shrinking the type keeps the number readable at thumbnail size. */
.contact{width:100%;background:#A5CE39;color:#35450F;border-radius:36px;
  padding:${isStories ? '30px 44px' : '22px 36px'};
  list-style:none;display:flex;
  ${
    isStories
      ? 'flex-direction:column;gap:14px'
      : 'flex-wrap:wrap;justify-content:center;gap:10px 44px'
  };
  margin-top:${isStories ? 32 : 18}px}
.contactRow{display:flex;align-items:center;gap:18px;
  font-size:var(--contact);font-weight:700;white-space:nowrap}
.contactIcon{flex:none;width:${isStories ? 38 : 32}px;height:${isStories ? 38 : 32}px}
</style></head>
<body>
<!--
  Layout guard. The stack is tuned by hand for each size, so growing the
  artwork or a longer line of copy can push the contact bar off the canvas
  with nothing to show for it but a clipped phone number. This reports how
  far past its safe area the content runs; build.mjs reads it back and
  refuses to ship a flyer that overflows.
-->
<script>
  window.addEventListener('load', () => {
    const flyer = document.querySelector('.flyer');
    const last = document.querySelector('.contact');
    const padBottom = parseFloat(
      getComputedStyle(document.querySelector('.safe')).paddingBottom,
    );
    const limit = flyer.getBoundingClientRect().bottom - padBottom;
    const over = Math.round(last.getBoundingClientRect().bottom - limit);
    document.title = 'overflow:' + Math.max(0, over);
  });
</script>
<div class="flyer">
  <div class="glow"></div>
  ${confetti()}
  <div class="safe">
    <header class="brand">
      <div class="brandRow">
        <img src="${logo}" alt="">
        <span class="wordmark">TECLAS</span>
      </div>
      <span class="tagline">Escuela de piano · Ciudad Jardín</span>
    </header>

    <div class="stage">
      <span class="eyebrow">${esc(kicker(event))}</span>
      <h1 class="title">${esc(headline(event))}</h1>
      <div class="hero">
        <span class="heroBloom"></span>
        ${heroSvg(art)}
      </div>
      <ul class="info">${infoRows(event)}</ul>
    </div>

    <ul class="contact">${contactRows(contact)}</ul>
  </div>
</div>
</body></html>`;
}
