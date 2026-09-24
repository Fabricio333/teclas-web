/**
 * Finding a Chromium that actually renders, shared by the flyer and the
 * review card generators.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

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

export const BASE_FLAGS = [
  '--headless=new',
  '--no-sandbox',
  '--disable-gpu',
  '--disable-dev-shm-usage',
  '--hide-scrollbars',
  '--force-device-scale-factor=1',
];

export function findChromium() {
  for (const bin of candidates()) {
    if (works(bin)) return bin;
  }
  throw new Error(
    'No usable Chromium found.\n' +
      'Install one with:  npx playwright install chromium\n' +
      'or point CHROME_PATH at an existing binary.',
  );
}
