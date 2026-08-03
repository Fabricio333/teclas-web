/**
 * Does anything in the story video's artwork collide with the text?
 *
 *   npm run video:check
 *
 * The illustration is drawn with `overflow: visible`, so its stars and notes
 * can reach outside the box the layout gave them — the orange star at the
 * bottom of the scene did exactly that and landed on the date line. Nothing
 * catches this: `hyperframes check` validates timing, layout boxes and
 * contrast, and a rendered frame with a star on a word still looks like a
 * finished video.
 *
 * So measure it. The composition is loaded in Chromium, the timeline is seeked
 * to a few moments across its length, and every star and note is compared
 * against the text above and below the artwork. Overlap is an error; anything
 * closer than MIN_GAP is a warning.
 */

import {
  copyFileSync,
  cpSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const PROJECT = join(ROOT, 'videos/event-story');

/** Comfortable breathing room, in CSS px, between artwork and type. */
const MIN_GAP = 24;
/** Moments to test. The ambient drift moves things after the build-in. */
const TIMES = [5, 6.5, 9, 11.5, 14.5];

const BASE_FLAGS = [
  '--headless=new',
  '--no-sandbox',
  '--disable-gpu',
  '--disable-dev-shm-usage',
  '--hide-scrollbars',
  '--force-device-scale-factor=1',
];

function findChromium() {
  const found = [];
  const push = (p) => {
    if (p && existsSync(p) && !found.includes(p)) found.push(p);
  };
  push(process.env.HYPERFRAMES_BROWSER_PATH);
  push(process.env.CHROME_PATH);
  const cache = join(homedir(), '.cache', 'ms-playwright');
  if (existsSync(cache)) {
    for (const dir of readdirSync(cache).sort().reverse()) {
      if (dir.startsWith('chromium_headless_shell-'))
        push(join(cache, dir, 'chrome-linux', 'headless_shell'));
      if (dir.startsWith('chromium-'))
        push(join(cache, dir, 'chrome-linux', 'chrome'));
    }
  }
  for (const bin of found) {
    try {
      const out = execFileSync(
        bin,
        [...BASE_FLAGS, '--dump-dom', 'data:text/html,<p>probe</p>'],
        {
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'ignore'],
          timeout: 60_000,
        },
      );
      if (out.includes('probe')) return bin;
    } catch {
      // try the next one
    }
  }
  throw new Error(
    'No usable Chromium found.\n' +
      'Install one with:  npx playwright install chromium\n' +
      'or point HYPERFRAMES_BROWSER_PATH at an existing binary.',
  );
}

/**
 * The probe runs inside the page: seek, let the browser apply the transforms,
 * then report every artwork piece's box against the type around it.
 */
const PROBE = (times) => `
<script>
(function () {
  function run() {
    try {
      var tl = window.__timelines && window.__timelines['main'];
      if (!tl) { document.title = 'ERR:no timeline registered'; return; }
      var out = [];
      ${JSON.stringify(times)}.forEach(function (t) {
        // GSAP applies a seek synchronously, so the boxes are readable at
        // once. Awaiting rAF here never resolves under --virtual-time-budget.
        tl.seek(t);
        var above = document.querySelector('#subtitle').getBoundingClientRect().bottom;
        var below = document.querySelector('#info').getBoundingClientRect().top;
        var lowest = -Infinity, highest = Infinity;
        document.querySelectorAll('.hf-star, .hf-note').forEach(function (el) {
          var r = el.getBoundingClientRect();
          if (!r.height) return;
          lowest = Math.max(lowest, r.bottom);
          highest = Math.min(highest, r.top);
        });
        out.push({ t: t, gapBelow: below - lowest, gapAbove: highest - above });
      });
      document.title = 'layout:' + JSON.stringify(out);
    } catch (e) {
      document.title = 'ERR:' + e.message;
    }
  }
  if (document.readyState === 'complete') run();
  else window.addEventListener('load', run);
})();
</script>
`;

// ---------------------------------------------------------------- run

const chromium = findChromium();
const work = mkdtempSync(join(tmpdir(), 'teclas-video-layout-'));

try {
  const page = join(work, 'probe.html');
  cpSync(join(PROJECT, 'assets'), join(work, 'assets'), { recursive: true });
  const html = readFileSync(join(PROJECT, 'index.html'), 'utf8');
  writeFileSync(page, html.replace('</body>', `${PROBE(TIMES)}</body>`));

  const dom = execFileSync(
    chromium,
    [
      ...BASE_FLAGS,
      '--virtual-time-budget=15000',
      '--dump-dom',
      `file://${page}`,
    ],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 180_000 },
  );

  const failed = dom.match(/<title>ERR:([^<]*)<\/title>/);
  if (failed) throw new Error(`the layout probe failed: ${failed[1]}`);

  const match = dom.match(/<title>layout:(\[.*?\])<\/title>/s);
  if (!match) throw new Error('the layout probe did not report');

  const rows = JSON.parse(match[1]);
  let worstBelow = Infinity;
  let worstAbove = Infinity;

  for (const row of rows) {
    worstBelow = Math.min(worstBelow, row.gapBelow);
    worstAbove = Math.min(worstAbove, row.gapAbove);
    console.log(
      `  t=${String(row.t).padStart(4)}s  above type: ${row.gapAbove.toFixed(0).padStart(5)}px` +
        `   below type: ${row.gapBelow.toFixed(0).padStart(5)}px`,
    );
  }

  const problems = [];
  if (worstBelow < 0)
    problems.push(
      `artwork overlaps the fact list by ${(-worstBelow).toFixed(0)}px`,
    );
  else if (worstBelow < MIN_GAP)
    problems.push(
      `only ${worstBelow.toFixed(0)}px between the artwork and the fact list (want ${MIN_GAP})`,
    );

  if (worstAbove < 0)
    problems.push(
      `artwork overlaps the subtitle by ${(-worstAbove).toFixed(0)}px`,
    );
  else if (worstAbove < MIN_GAP)
    problems.push(
      `only ${worstAbove.toFixed(0)}px between the artwork and the subtitle (want ${MIN_GAP})`,
    );

  if (problems.length) {
    throw new Error(
      `${problems.join('; ')}.\n` +
        'Adjust SCENE_SHIFT_Y in scripts/story-video/sync-artwork.mjs (moves the\n' +
        'illustration inside its box) or #artwork height/margins in the composition,\n' +
        'then re-run `npm run video:artwork`.',
    );
  }

  console.log(
    `\nClear: worst gap is ${Math.min(worstAbove, worstBelow).toFixed(0)}px (minimum ${MIN_GAP}px).`,
  );
} finally {
  rmSync(work, { recursive: true, force: true });
}
