/**
 * Event flyer -> PNG.
 *
 *   npm run flyer
 *
 * Renders every upcoming event in `lib/events/index.ts` at every size in
 * `lib/flyer/index.ts` and writes the results into `public/events/`, where the
 * hidden `/download` page picks them up.
 *
 * The event copy is imported from the site's own TypeScript rather than
 * retyped, so the flyer cannot advertise a date the page has already moved —
 * see `ts-loader.mjs` for the twenty lines that make that import work.
 *
 * Rendering is Chromium's own `--screenshot`, which needs no automation
 * library. The only real work is finding a Chromium that runs: on Ubuntu,
 * `/usr/bin/chromium-browser` is a snap shim that fails inside a container, so
 * every candidate is probed before it is trusted.
 */

import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { register } from 'node:module';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

import { renderFlyer } from './template.mjs';

register('./ts-loader.mjs', import.meta.url);

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const PUBLIC_DIR = join(ROOT, 'public');

// ---------------------------------------------------------------- chromium

/** Candidate binaries, best first. */
function candidates() {
  const found = [];
  const push = (p) => {
    if (p && existsSync(p) && !found.includes(p)) found.push(p);
  };

  push(process.env.CHROME_PATH);
  push(process.env.PUPPETEER_EXECUTABLE_PATH);

  // Playwright's own builds — the ones that actually run on arm64 Linux.
  const cache = join(homedir(), '.cache', 'ms-playwright');
  if (existsSync(cache)) {
    for (const dir of readdirSync(cache).sort().reverse()) {
      if (dir.startsWith('chromium_headless_shell-'))
        push(join(cache, dir, 'chrome-linux', 'headless_shell'));
      if (dir.startsWith('chromium-'))
        push(join(cache, dir, 'chrome-linux', 'chrome'));
    }
  }

  for (const name of ['google-chrome', 'chromium', 'chromium-browser']) {
    try {
      push(execFileSync('which', [name], { encoding: 'utf8' }).trim());
    } catch {
      // not on PATH
    }
  }

  return found;
}

/**
 * A binary that exists is not a binary that works: the snap shim exits 0 while
 * printing "cannot join mount namespace" and rendering nothing. Ask each one
 * to echo a document back before handing it the real job.
 */
function works(bin) {
  try {
    const out = execFileSync(
      bin,
      [...BASE_FLAGS, '--dump-dom', 'data:text/html,<p>flyer-probe</p>'],
      {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
        timeout: 60_000,
      },
    );
    return out.includes('flyer-probe');
  } catch {
    return false;
  }
}

const BASE_FLAGS = [
  '--headless=new',
  '--no-sandbox',
  '--disable-gpu',
  '--disable-dev-shm-usage',
  '--hide-scrollbars',
  '--force-device-scale-factor=1',
];

function findChromium() {
  for (const bin of candidates()) {
    if (works(bin)) return bin;
  }
  throw new Error(
    'No usable Chromium found.\n' +
      'Install one with:  npx playwright install chromium\n' +
      'or point CHROME_PATH at an existing binary.',
  );
}

// ---------------------------------------------------------------- render

/**
 * Ask the page how far its content runs past the safe area. The layout is
 * hand-tuned per size, so a bigger hero or a longer line of copy pushes the
 * contact bar off the canvas — and a screenshot of that looks fine right up
 * until you notice the phone number is missing its last line. The probe that
 * answers this lives in `template.mjs`.
 */
function measureOverflow(chromium, pagePath) {
  const dom = execFileSync(
    chromium,
    [
      ...BASE_FLAGS,
      '--virtual-time-budget=8000',
      '--dump-dom',
      `file://${pagePath}`,
    ],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 120_000 },
  );

  const match = dom.match(/<title>overflow:(-?\d+)<\/title>/);
  if (!match) throw new Error('layout probe did not report');

  return Number(match[1]);
}

function screenshot(chromium, html, size, outPath) {
  const work = mkdtempSync(join(tmpdir(), 'teclas-flyer-'));
  const page = join(work, 'flyer.html');
  const shot = join(work, 'shot.png');

  try {
    writeFileSync(page, html);

    const overflow = measureOverflow(chromium, page);
    if (overflow > 0) {
      throw new Error(
        `${size.key}: content runs ${overflow}px past the safe area — ` +
          'the contact bar would be clipped. Reduce --hero or the gaps ' +
          'around it in template.mjs.',
      );
    }

    execFileSync(
      chromium,
      [
        ...BASE_FLAGS,
        `--user-data-dir=${join(work, 'profile')}`,
        `--window-size=${size.width},${size.height}`,
        // Fonts are inlined, so this only has to outlast layout; it also stops
        // the run from hanging if a render ever goes wrong.
        '--virtual-time-budget=8000',
        `--screenshot=${shot}`,
        `file://${page}`,
      ],
      { stdio: ['ignore', 'ignore', 'ignore'], timeout: 120_000 },
    );

    if (!existsSync(shot)) throw new Error('Chromium produced no screenshot');

    // sharp both guarantees the exact pixel size (a stray scrollbar or a
    // rounding difference would otherwise ship silently) and compresses.
    return sharp(shot)
      .resize(size.width, size.height, { fit: 'cover' })
      .png({ compressionLevel: 9, palette: false })
      .toFile(outPath);
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------- main

const { upcomingEvents, WHATSAPP_NUMBER } = await import('@/lib/events');
const { FLYER_SIZES, flyerPath } = await import('@/lib/flyer');

/**
 * The landing page's hero artwork, imported rather than redrawn — same
 * keyboard geometry, same note placements, same green field.
 */
const art = {
  ...(await import('@/lib/hero-artwork/keyboard')),
  ...(await import('@/lib/hero-artwork/decorations')),
  ...(await import('@/lib/hero-artwork/particles')),
};

/** Displayed on the flyer; the digits are the ones the site dials. */
const CONTACT = {
  whatsapp: WHATSAPP_NUMBER.replace(
    /^(54)(9)(11)(\d{4})(\d{4})$/,
    '+$1 $2 $3 $4-$5',
  ),
  instagram: '@teclas.ciudadjardin',
  website: 'teclasciudadjardin.com.ar',
};

if (upcomingEvents.length === 0) {
  console.log('No upcoming events in lib/events — nothing to render.');
  process.exit(0);
}

const chromium = findChromium();
console.log(`Chromium: ${chromium}\n`);

for (const event of upcomingEvents) {
  for (const size of FLYER_SIZES) {
    const rel = flyerPath(event.slug, size.key);
    const out = join(PUBLIC_DIR, rel);
    const html = renderFlyer(event, size, CONTACT, PUBLIC_DIR, art);

    const info = await screenshot(chromium, html, size, out);
    console.log(
      `  ${rel}  ${info.width}x${info.height}  ${(info.size / 1024).toFixed(0)} KB`,
    );
  }
}

console.log('\nDone. The flyers are listed at /download.');
