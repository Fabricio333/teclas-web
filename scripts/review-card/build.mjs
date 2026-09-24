/**
 * "Leave us a review" card -> PNG + printable A6 PDF.
 *
 *   npm run qr && npm run review-card
 *
 * A counter sign for the school: a friendly line, five stars and the Google
 * profile QR from `scripts/qr/build.mjs`, which has to be built first. Writes
 * into `public/media-kit/`, where the media kit page offers both files.
 *
 * Same rendering as the event flyers — HTML with every font and image inlined,
 * screenshotted by headless Chromium — so it touches no network and uses the
 * brand's own fonts.
 */

import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

import { BASE_FLAGS, findChromium } from '../flyer/chromium.mjs';

const require = createRequire(import.meta.url);
const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const OUT_DIR = join(ROOT, 'public/media-kit');
const FONT_DIR = join(ROOT, 'scripts/flyer/fonts');

/** A6 at 300 dpi. The PDF is the same layout zoomed down to 105 × 148 mm. */
const WIDTH = 1240;
const HEIGHT = 1748;

const COPY = {
  title: '¿Te gusta cómo suena TECLAS?',
  body: 'Contalo en Google: tu reseña ayuda a que más personas se animen a tocar el piano.',
  scan: 'Escaneá el código con la cámara del celu',
  thanks: '¡Gracias por ser parte de TECLAS!',
};

// ---------------------------------------------------------------- assets

function dataUri(absPath, mime) {
  return `data:${mime};base64,${readFileSync(absPath).toString('base64')}`;
}

function fontFace(family, file) {
  return `@font-face{font-family:'${family}';font-weight:400;font-display:block;src:url(${dataUri(join(FONT_DIR, file), 'font/woff2')}) format('woff2')}`;
}

/** Same icon extraction as the flyer template. */
function faIcon(icon, className) {
  const [w, h, , , path] = icon.icon;
  const d = Array.isArray(path) ? path.join(' ') : path;
  return `<svg class="${className}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="${d}"/></svg>`;
}

const solid = require('@fortawesome/free-solid-svg-icons');

const qrFile = join(OUT_DIR, 'qr-google.svg');
if (!existsSync(qrFile)) {
  throw new Error(
    'public/media-kit/qr-google.svg is missing — run `npm run qr` first.',
  );
}

// ---------------------------------------------------------------- page

const notes = [
  {
    icon: solid.faMusic,
    x: 70,
    y: 400,
    size: 70,
    rotate: -14,
    color: '#8658A7',
  },
  {
    icon: solid.faMusic,
    x: 1085,
    y: 330,
    size: 84,
    rotate: 12,
    color: '#ED3B95',
  },
  {
    icon: solid.faMusic,
    x: 95,
    y: 1290,
    size: 62,
    rotate: 10,
    color: '#415CA9',
  },
  {
    icon: solid.faMusic,
    x: 1080,
    y: 1210,
    size: 70,
    rotate: -10,
    color: '#A5CE39',
  },
]
  .map(
    (n) =>
      `<span class="note" style="left:${n.x}px;top:${n.y}px;width:${n.size}px;height:${n.size}px;color:${n.color};transform:rotate(${n.rotate}deg)">${faIcon(n.icon, 'noteIcon')}</span>`,
  )
  .join('');

const stars = Array.from({ length: 5 }, () =>
  faIcon(solid.faStar, 'star'),
).join('');

const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><style>
${fontFace('CardDisplay', 'Lobster-latin.woff2')}
${fontFace('CardBody', 'Delius-latin.woff2')}
${fontFace('CardSupport', 'ComicNeue-latin.woff2')}

@page{size:105mm 148mm;margin:0}
*{margin:0;padding:0;box-sizing:border-box}
html,body{background:#FFFDF6}
@media print{.card{zoom:${(((105 / 25.4) * 96) / WIDTH).toFixed(5)}}}

.card{position:relative;overflow:hidden;width:${WIDTH}px;height:${HEIGHT}px;
  background:#FFFDF6;color:#141D36;font-family:'CardBody',sans-serif;
  display:flex;flex-direction:column;align-items:center;text-align:center;
  padding:96px 110px 0}
.card::before,.card::after{content:'';position:absolute;left:0;right:0;height:28px}
.card::before{top:0;background:#A5CE39}
.card::after{bottom:0;background:#415CA9}

.note{position:absolute;opacity:.55}
.noteIcon{width:100%;height:100%;display:block}

.brand{display:flex;align-items:center;gap:22px}
.brand img{width:92px;height:92px}
.wordmark{font-family:'CardDisplay',cursive;font-size:72px;color:#35450F;letter-spacing:.06em;line-height:1}

.title{font-family:'CardDisplay',cursive;font-size:100px;line-height:1.08;color:#415CA9;margin-top:62px}
.stars{display:flex;gap:18px;margin-top:40px;color:#FFD122}
.star{width:72px;height:72px;filter:drop-shadow(0 3px 0 #E0A800)}
.body{font-size:44px;line-height:1.35;margin-top:40px;max-width:960px}

.qr{margin-top:54px;padding:26px;background:#fff;border:8px solid #A5CE39;border-radius:48px;
  box-shadow:0 14px 0 rgba(65,92,169,.14)}
.qr img{display:block;width:580px;height:580px}

.scan{font-family:'CardSupport',sans-serif;font-weight:700;font-size:36px;margin-top:40px;
  display:flex;align-items:center;gap:16px;color:#415CA9}
.scan svg{width:40px;height:40px}
.thanks{position:absolute;left:0;right:0;bottom:78px;font-size:38px;color:#35450F;
  display:flex;justify-content:center;align-items:center;gap:14px}
.thanks svg{width:36px;height:36px;color:#ED3B95}
</style></head><body>
<div class="card">
  ${notes}
  <div class="brand">
    <img src="${dataUri(join(ROOT, 'public/icon.svg'), 'image/svg+xml')}" alt="">
    <span class="wordmark">TECLAS</span>
  </div>
  <h1 class="title">${COPY.title}</h1>
  <div class="stars">${stars}</div>
  <p class="body">${COPY.body}</p>
  <div class="qr"><img src="${dataUri(qrFile, 'image/svg+xml')}" alt=""></div>
  <p class="scan">${faIcon(solid.faCamera, '')}${COPY.scan}</p>
  <p class="thanks">${faIcon(solid.faHeart, '')}${COPY.thanks}</p>
</div>
</body></html>`;

// ---------------------------------------------------------------- render

const chromium = findChromium();
const work = mkdtempSync(join(tmpdir(), 'teclas-review-card-'));
const page = join(work, 'card.html');
const shot = join(work, 'shot.png');
const pngPath = join(OUT_DIR, 'cartel-review-google.png');
const pdfPath = join(OUT_DIR, 'cartel-review-google.pdf');

try {
  writeFileSync(page, html);
  const run = (args) =>
    execFileSync(
      chromium,
      [
        ...BASE_FLAGS,
        `--user-data-dir=${join(work, 'profile')}`,
        '--virtual-time-budget=8000',
        ...args,
        `file://${page}`,
      ],
      { stdio: ['ignore', 'ignore', 'ignore'], timeout: 120_000 },
    );

  run([`--window-size=${WIDTH},${HEIGHT}`, `--screenshot=${shot}`]);
  run(['--no-pdf-header-footer', `--print-to-pdf=${pdfPath}`]);

  if (!existsSync(shot) || !existsSync(pdfPath)) {
    throw new Error('Chromium produced no output');
  }

  const png = await sharp(shot)
    .resize(WIDTH, HEIGHT, { fit: 'cover' })
    .png({ compressionLevel: 9 })
    .toFile(pngPath);

  console.log(
    `  public/media-kit/cartel-review-google.png  ${png.width}x${png.height}  ${(png.size / 1024).toFixed(0)} KB\n` +
      `  public/media-kit/cartel-review-google.pdf  A6, para imprimir`,
  );
} finally {
  rmSync(work, { recursive: true, force: true });
}
