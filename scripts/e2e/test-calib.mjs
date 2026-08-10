import puppeteer from 'puppeteer';
import { CHROME, BASE } from './env.mjs';
const b = await puppeteer.launch({
  headless: 'new',
  executablePath: CHROME,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--use-fake-ui-for-media-stream',
    '--use-fake-device-for-media-capture',
    '--autoplay-policy=no-user-gesture-required',
  ],
});
let fails = 0;
const check = (n, ok, x = '') => {
  if (!ok) fails++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${x ? '  ' + x : ''}`);
};
const p = await b.newPage();
const errs = [];
p.on('pageerror', (e) => errs.push(e.message));
const ctx = b.defaultBrowserContext();
await ctx.overridePermissions(BASE, ['microphone']);
await p.goto(BASE + '/calibracion', { waitUntil: 'networkidle0' });
await new Promise((r) => setTimeout(r, 600));

check(
  'page renders intro',
  (await p.evaluate(() => document.body.innerText)).includes(
    'Calibrá tu instrumento',
  ),
);
check(
  'source options present',
  await p.evaluate(() =>
    [...document.querySelectorAll('button')].some((x) =>
      x.textContent.includes('Piano acústico'),
    ),
  ),
);
check('no page errors', errs.length === 0, errs.slice(0, 2).join('|'));

// This container exposes zero audio input devices, so getUserMedia always
// fails here. That makes the happy path untestable headlessly — but the
// failure path is exactly what a student with a denied/absent mic sees, so
// assert that instead of skipping.
const noDevices = await p.evaluate(
  async () =>
    (await navigator.mediaDevices.enumerateDevices()).filter(
      (d) => d.kind === 'audioinput',
    ).length,
);
console.log(`      (audio input devices available: ${noDevices})`);

await p.evaluate(() => {
  [...document.querySelectorAll('button')]
    .find((x) => x.textContent.trim() === 'Empezar')
    ?.click();
});
await new Promise((r) => setTimeout(r, 1500));
const after = await p.evaluate(() => document.body.innerText);

if (noDevices === 0) {
  check(
    'shows a helpful error when no mic exists',
    after.includes('No encontramos ningún micrófono'),
    after.split('\n').filter(Boolean).slice(-6).join(' | ').slice(0, 110),
  );
  check(
    'stays on the intro step rather than a blank screen',
    after.includes('Calibrá tu instrumento'),
  );
} else {
  check('advances to mic check', after.includes('Probá el micrófono'));
}

// mic released when navigating away
await p.goto(BASE + '/', { waitUntil: 'networkidle0' });
await new Promise((r) => setTimeout(r, 500));
check(
  'no errors after teardown',
  errs.length === 0,
  errs.slice(0, 2).join('|'),
);

await b.close();
console.log(
  fails === 0 ? '\nALL CALIBRATION CHECKS PASSED' : `\n${fails} FAILURE(S)`,
);
process.exit(fails === 0 ? 0 : 1);
