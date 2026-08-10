// Shared config for the ad-hoc Puppeteer debug/verify scripts in this folder.
//
// These lived loose in /root until 2026-08-09 and hardcoded both values. They
// are driven by env vars now because each hardcoded value had already rotted:
//
//   CHROME  - was pinned to .../ms-playwright/chromium-1234/..., a directory
//             that changes on every Playwright bump.
//   BASE    - was http://localhost:4321 (an Astro default) even though this
//             app is Next.js and its dev server is port 3000 per CLAUDE.md.
//
// Override either without editing the scripts:
//   BASE_URL=http://localhost:3100 node scripts/e2e/test-sheet.mjs

export const CHROME =
  process.env.CHROME_PATH ||
  '/root/.cache/ms-playwright/chromium-1234/chrome-linux/chrome';

export const BASE = (process.env.BASE_URL || 'http://localhost:3000').replace(
  /\/$/,
  '',
);
