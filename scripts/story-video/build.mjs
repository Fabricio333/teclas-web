/**
 * Event story video -> MP4, one per upcoming event.
 *
 *   npm run video
 *
 * The composition in `videos/event-story/` is hand-authored once; only its
 * headline and fact list change from event to event. For every upcoming event
 * in `lib/events/index.ts` this copies the project to a scratch folder, writes
 * that event's copy between the `event-headline` and `event-facts` markers,
 * checks the layout (`check-layout.mjs`) and renders it into `public/events/`,
 * where `/media-kit` offers it next to the flyers.
 *
 * The copy comes from the flyer's own helpers, so the video and the PNGs
 * cannot disagree on a date, an hour or a price.
 */

import { execFileSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { register } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { findChromium } from '../flyer/chromium.mjs';
import { esc, headline, infoRows, kicker } from '../flyer/template.mjs';

register('../flyer/ts-loader.mjs', import.meta.url);

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const PROJECT = join(ROOT, 'videos/event-story');
const PUBLIC_DIR = join(ROOT, 'public');
const CHECK = fileURLToPath(new URL('./check-layout.mjs', import.meta.url));

/** Same pin as `videos/event-story/package.json`, so renders stay identical. */
const HYPERFRAMES = 'hyperframes@0.7.89';

function between(html, name, content) {
  const start = `<!-- ${name}:start -->`;
  const end = `<!-- ${name}:end -->`;
  const from = html.indexOf(start);
  const to = html.indexOf(end);
  if (from === -1 || to === -1) {
    throw new Error(`the composition is missing its ${name} markers`);
  }
  return html.slice(0, from + start.length) + content + html.slice(to);
}

function compose(html, event) {
  const subtitle = event.subtitle
    ? `\n        <p id="subtitle">${esc(event.subtitle)}</p>`
    : '';
  const withHeadline = between(
    html,
    'event-headline',
    `\n        <span id="eyebrow">${esc(kicker(event))}</span>` +
      `\n        <h1 id="title">${esc(headline(event))}</h1>${subtitle}\n        `,
  );
  return between(
    withHeadline,
    'event-facts',
    `\n          ${infoRows(event)}\n          `,
  );
}

// ---------------------------------------------------------------- main

const { upcomingEvents } = await import('@/lib/events');
const { storyVideoPath } = await import('@/lib/flyer');

if (upcomingEvents.length === 0) {
  console.log('No upcoming events in lib/events — nothing to render.');
  process.exit(0);
}

const template = readFileSync(join(PROJECT, 'index.html'), 'utf8');

/* Left to itself the renderer takes /usr/bin/chromium-browser, which on Ubuntu
   is a snap shim that cannot launch inside a container. Hand it the Chromium
   the flyer build already knows runs. */
const env = {
  ...process.env,
  HYPERFRAMES_BROWSER_PATH:
    process.env.HYPERFRAMES_BROWSER_PATH ?? findChromium(),
};

for (const event of upcomingEvents) {
  const rel = storyVideoPath(event.slug);
  const out = join(PUBLIC_DIR, rel);
  const work = mkdtempSync(join(tmpdir(), 'teclas-story-'));

  try {
    // Render output and caches stay behind; the project itself is small.
    cpSync(PROJECT, work, {
      recursive: true,
      filter: (src) => !/[/\\](out|snapshots|\.hyperframes)$/.test(src),
    });
    writeFileSync(join(work, 'index.html'), compose(template, event));

    console.log(`\n${event.slug}: checking layout`);
    execFileSync(
      process.execPath,
      ['--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', CHECK, work],
      { stdio: 'inherit' },
    );

    console.log(`${event.slug}: rendering`);
    execFileSync('npx', ['--yes', HYPERFRAMES, 'render', '--output', out], {
      cwd: work,
      env,
      stdio: 'inherit',
    });

    if (!existsSync(out)) throw new Error(`the render produced no ${rel}`);
    console.log(
      `  ${rel}  ${(statSync(out).size / 1024 / 1024).toFixed(1)} MB`,
    );
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

console.log('\nDone. The videos are listed at /media-kit.');
