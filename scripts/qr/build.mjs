/**
 * Website QR code -> SVG + PNG, with the school's piano in the middle.
 *
 *   npm run qr
 *
 * Writes into `public/media-kit/`, where the media kit page offers both files.
 *
 * The keyboard in the centre is the same artwork as the landing page hero and
 * the event flyers — `lib/hero-artwork/*` — so the mark never drifts from the
 * site. It covers roughly a fifth of the code's area, which is why the code is
 * generated at error-correction level H: H tolerates about 30% of the modules
 * being unreadable, so the badge can sit on top without breaking the scan.
 *
 * Scanning is verified at the end by decoding the rendered PNG back to a URL —
 * a QR code that looks right and does not scan is the whole failure mode here,
 * and it is not visible by eye.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { register } from 'node:module';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import QRCode from 'qrcode';
import sharp from 'sharp';

register('../flyer/ts-loader.mjs', import.meta.url);

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const OUT_DIR = join(ROOT, 'public/media-kit');

export const QR_TARGET = 'https://teclasciudadjardin.com.ar';

/** Rendered size of the PNG. The SVG is resolution-independent. */
const SIZE = 1200;
/** Side of the centre badge, as a fraction of the code. */
const BADGE = 0.26;

const { buildKeyboard, VIEWBOX_WIDTH, VIEWBOX_HEIGHT } =
  await import('@/lib/hero-artwork/keyboard');

// ---------------------------------------------------------------- pieces

/**
 * The keyboard alone — no notes, stars or dot field. At a fifth of a QR code
 * the decoration would read as noise rather than as artwork.
 */
function pianoBadge() {
  const keyboard = buildKeyboard();

  const whiteKeys = keyboard.whiteKeys
    .map((k) => `<path d="${k.path}" fill="#ffffff"/>`)
    .join('');
  const fronts = keyboard.whiteKeys
    .map((k) => `<path d="${k.frontPath}" fill="#c9cbbf"/>`)
    .join('');
  const dividers = keyboard.whiteKeyDividers
    .map(
      (d) =>
        `<path d="${d}" fill="none" stroke="#b9bcae" stroke-width="3" stroke-linecap="round"/>`,
    )
    .join('');
  const blackKeys = keyboard.blackKeys
    .map(
      (k) =>
        `<path d="${k.path}" fill="#16171c" stroke="#2d2e33" stroke-width="3"/>`,
    )
    .join('');
  const caps = keyboard.blackKeys
    .map(
      (k) =>
        `<path d="${k.capPath}" fill="#62646a" stroke="#3f4147" stroke-width="2"/>`,
    )
    .join('');

  /*
   * The keyboard is a wide, shallow band; centred in a square badge it would
   * float in empty space. Cropping the viewBox to the band's own bounds lets
   * it fill the badge instead.
   */
  const bandTop = 150;
  const bandHeight = VIEWBOX_HEIGHT - bandTop * 2;

  return {
    viewBox: `0 ${bandTop} ${VIEWBOX_WIDTH} ${bandHeight}`,
    markup: `${whiteKeys}${fronts}${dividers}
      <path d="${keyboard.keyboardEdgePath}" fill="none" stroke="#b9bcae" stroke-width="4" stroke-linejoin="round"/>
      ${blackKeys}${caps}`,
  };
}

/**
 * QR modules as one path, so the badge can be layered over them.
 *
 * The `qrcode` package draws the modules as STROKED horizontal runs
 * (`M x y.5 h n`) on a half-pixel grid, not as filled rectangles — rendering
 * that path with a fill produces a blank code that still looks plausible in a
 * viewer. It has to be stroked at width 1.
 */
async function qrPath() {
  const svg = await QRCode.toString(QR_TARGET, {
    type: 'svg',
    errorCorrectionLevel: 'H',
    margin: 2,
  });

  const viewBox = svg.match(/viewBox="([^"]+)"/)?.[1];

  /*
   * Two paths come back: a filled background rectangle and the stroked
   * modules. Taking the first one yields an empty frame that still renders,
   * so pick the element that actually carries a stroke.
   */
  const modules = [...svg.matchAll(/<path\b[^>]*>/g)]
    .map((m) => m[0])
    .find((el) => el.includes('stroke='));
  const path = modules?.match(/\sd="([^"]+)"/)?.[1];

  if (!viewBox || !path) throw new Error('could not read the generated QR svg');

  return { viewBox, path };
}

// ---------------------------------------------------------------- compose

const { viewBox, path } = await qrPath();
const [, , vbW, vbH] = viewBox.split(/\s+/).map(Number);

const badgeSide = vbW * BADGE;
const badgeX = (vbW - badgeSide) / 2;
const badgeY = (vbH - badgeSide) / 2;
/* A little breathing room so dark modules never touch the badge edge. */
const plateSide = badgeSide * 1.16;
const plateX = (vbW - plateSide) / 2;
const plateY = (vbH - plateSide) / 2;

const badge = pianoBadge();

const composed = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="${SIZE}" height="${SIZE}">
  <rect width="100%" height="100%" fill="#ffffff"/>
  <path d="${path}" stroke="#141d36" stroke-width="1" fill="none" shape-rendering="crispEdges"/>
  <rect x="${plateX.toFixed(3)}" y="${plateY.toFixed(3)}" width="${plateSide.toFixed(3)}" height="${plateSide.toFixed(3)}" rx="${(plateSide * 0.18).toFixed(3)}" fill="#ffffff"/>
  <rect x="${plateX.toFixed(3)}" y="${plateY.toFixed(3)}" width="${plateSide.toFixed(3)}" height="${plateSide.toFixed(3)}" rx="${(plateSide * 0.18).toFixed(3)}" fill="none" stroke="#a5ce39" stroke-width="${(vbW * 0.006).toFixed(3)}"/>
  <svg x="${badgeX.toFixed(3)}" y="${badgeY.toFixed(3)}" width="${badgeSide.toFixed(3)}" height="${badgeSide.toFixed(3)}" viewBox="${badge.viewBox}" preserveAspectRatio="xMidYMid meet">
    ${badge.markup}
  </svg>
</svg>`;

mkdirSync(OUT_DIR, { recursive: true });

const svgPath = join(OUT_DIR, 'qr-teclasciudadjardin.svg');
const pngPath = join(OUT_DIR, 'qr-teclasciudadjardin.png');

writeFileSync(svgPath, composed);
const png = await sharp(Buffer.from(composed), { density: 300 })
  .resize(SIZE, SIZE)
  .png({ compressionLevel: 9 })
  .toFile(pngPath);

// ---------------------------------------------------------------- verify

/*
 * Decode what was actually written. A code whose badge has eaten one module
 * too many still looks perfectly fine on screen; the only way to know is to
 * read it back.
 */
const { default: jsQR } = await import('jsqr');
const raw = await sharp(pngPath)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const decoded = jsQR(
  new Uint8ClampedArray(raw.data),
  raw.info.width,
  raw.info.height,
);

if (!decoded || decoded.data !== QR_TARGET) {
  throw new Error(
    `the rendered QR does not scan back to ${QR_TARGET} (got ${decoded ? decoded.data : 'no code found'}). ` +
      'Shrink BADGE or raise the margin in scripts/qr/build.mjs.',
  );
}

console.log(
  `QR -> ${QR_TARGET}\n` +
    `  public/media-kit/qr-teclasciudadjardin.svg  (vector, for print)\n` +
    `  public/media-kit/qr-teclasciudadjardin.png  ${png.width}x${png.height}  ${(png.size / 1024).toFixed(0)} KB\n` +
    '  verified: decodes back to the site URL',
);
