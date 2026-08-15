/**
 * Rebuilds public/og-teclas.jpg — the link-preview card used by every page.
 *
 *   node scripts/make-og-image.js
 *
 * Why a generated card rather than the raw artwork:
 *
 * - public/teclas.jpg is 5768x4094 and 3.4 MB. WhatsApp drops any og:image
 *   over roughly 300 KB, so a link shared there rendered with no picture.
 * - A preview with no words is wallpaper. The card carries the headline and
 *   the call to action so it reads as something to tap.
 *
 * Every string below already exists on the site — the hero's H1 and the hero
 * button's label — so the card invents no new copy (see CLAUDE.md).
 *
 * Fonts: the wordmark is Lobster, the same face the navbar logo uses. It has
 * to be installed for fontconfig to find it; next/font keeps only a subsetted
 * woff2 in .next, which librsvg cannot read. To regenerate on a machine
 * without it, install Lobster (and any bold grotesque for the headline — Noto
 * Sans here) and re-run. If the wordmark comes out in a fallback face, that is
 * the missing font, not a bug in this script.
 */
const path = require('path');
const sharp = require('sharp');

const ROOT = path.join(__dirname, '..');
const W = 1200;
const H = 630;
const ART_H = 286;

// Brand tokens, straight from styles/_tokens.scss.
const GREEN = '#a5ce39';
const GREEN_DEEP = '#6a861f';
const INK = '#141d36';
const NEAR_BLACK = '#1c2230';

const WORDMARK = 'TECLAS';
const HEADLINE = 'Clases de Piano en Ciudad Jardín';
const CTA = 'Comienza hoy mismo';

// Advance-width sum for the CTA at its rendered size, so the pill hugs the
// label instead of being a guess. Measured off the same face the SVG asks for.
const CTA_WIDTH = 330;
const PILL_H = 74;
const PILL_W = CTA_WIDTH + 88;
const PILL_X = (W - PILL_W) / 2;
const PILL_Y = 468;

const overlay = `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <rect x="0" y="${ART_H}" width="${W}" height="${H - ART_H}" fill="#ffffff"/>
  <rect x="0" y="${ART_H}" width="${W}" height="7" fill="${GREEN}"/>

  <text x="${W / 2}" y="367" text-anchor="middle"
        font-family="Lobster" font-size="58" fill="${GREEN_DEEP}">${WORDMARK}</text>

  <text x="${W / 2}" y="434" text-anchor="middle"
        font-family="Noto Sans" font-weight="700" font-size="46" fill="${INK}">${HEADLINE}</text>

  <rect x="${PILL_X}" y="${PILL_Y}" width="${PILL_W}" height="${PILL_H}"
        rx="${PILL_H / 2}" fill="${GREEN}"/>
  <text x="${W / 2}" y="${PILL_Y + 49}" text-anchor="middle"
        font-family="Noto Sans" font-weight="700" font-size="31" fill="${NEAR_BLACK}">${CTA}</text>
</svg>`;

(async () => {
  // The whole keyboard fitted inside the top band rather than cropped to it:
  // covering the full card and laying a translucent panel over the bottom left
  // the keyboard cut in half and ghosting through behind the headline.
  const art = await sharp(path.join(ROOT, 'public/teclas.jpg'))
    .resize(W, ART_H, { fit: 'contain', background: '#ffffff' })
    .png()
    .toBuffer();

  const base = await sharp({
    create: { width: W, height: H, channels: 3, background: '#ffffff' },
  })
    .composite([{ input: art, top: 0, left: 0 }])
    .png()
    .toBuffer();

  const out = path.join(ROOT, 'public/og-teclas.jpg');
  const { size } = await sharp(base)
    .composite([{ input: Buffer.from(overlay), top: 0, left: 0 }])
    .jpeg({ quality: 88, mozjpeg: true, progressive: true })
    .toFile(out);

  console.log(`wrote ${out} — ${(size / 1024).toFixed(0)} KB`);
  if (size > 300 * 1024) {
    console.error('WARNING: over 300 KB, WhatsApp will not render it');
    process.exitCode = 1;
  }
})();
