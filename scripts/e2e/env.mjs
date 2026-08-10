// Shared config for the ad-hoc Puppeteer debug/verify scripts in this folder.
//
// These lived loose in /root until 2026-08-09 and hardcoded both values. They
// are resolved at runtime now because each hardcoded value had already rotted:
//
//   CHROME  - was pinned to a specific .../ms-playwright/chromium-NNNN/...
//             directory, which changes on every Playwright bump.
//   BASE    - was http://localhost:4321 (an Astro default) even though this
//             app is Next.js and its dev server is port 3000 per CLAUDE.md.
//
// Override either without editing the scripts:
//   BASE_URL=http://localhost:3100 node scripts/e2e/test-sheet.mjs
//   CHROME_PATH=/usr/bin/chromium node scripts/e2e/test-sheet.mjs

import { existsSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

// Reuse a Chromium that Playwright has already downloaded, newest first, rather
// than making puppeteer fetch its own ~150MB copy. Returns undefined when there
// is none, which lets puppeteer fall back to its bundled browser.
function playwrightChromium() {
  const base = join(homedir(), '.cache', 'ms-playwright');
  if (!existsSync(base)) return undefined;

  const builds = readdirSync(base)
    .filter((d) => /^chromium-\d+$/.test(d))
    .sort((a, b) => Number(b.split('-')[1]) - Number(a.split('-')[1]));

  for (const build of builds) {
    const bin = join(base, build, 'chrome-linux', 'chrome');
    if (existsSync(bin)) return bin;
  }
  return undefined;
}

export const CHROME = process.env.CHROME_PATH || playwrightChromium();

export const BASE = (process.env.BASE_URL || 'http://localhost:3000').replace(
  /\/$/,
  '',
);
