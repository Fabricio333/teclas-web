import puppeteer from 'puppeteer';
import { CHROME, BASE } from './env.mjs';
const b = await puppeteer.launch({
  headless: 'new',
  executablePath: CHROME,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--autoplay-policy=no-user-gesture-required',
  ],
});
let fails = 0;
const check = (n, ok, x = '') => {
  if (!ok) fails++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${x ? '  ' + x : ''}`);
};
const p = await b.newPage();
await p.setViewport({ width: 1280, height: 900 });
await p.goto(BASE + '/piano-player', { waitUntil: 'networkidle0' });
await new Promise((r) => setTimeout(r, 2500)); // abcjs render + rAF measure

// Estrellita fits on one system, so there is nothing to follow. Switch to the
// longest piece in the library before measuring.
await p.evaluate(() => {
  const sel = document.getElementById('level-select');
  let best = 0,
    bestLen = 0;
  [...sel.options].forEach((o, i) => {
    if (o.textContent.length > bestLen) {
    }
  });
  // pick by known id ordering: the last non-debug entry is the longest anthem
  const idx = [...sel.options].findIndex((o) =>
    /Himno|Completo|Elisa|Greensleeves/i.test(o.textContent),
  );
  sel.value = String(idx >= 0 ? idx : sel.options.length - 1);
  sel.dispatchEvent(new Event('change', { bubbles: true }));
});
await new Promise((r) => setTimeout(r, 2000));

const initial = await p.evaluate(() => {
  const vp = document.getElementById('sheet-viewport');
  const sc = document.getElementById('sheet-scroller');
  const notes = document.querySelectorAll(
    '#sheet .abcjs-note, #sheet [class*="abcjs-n"]',
  );
  return {
    viewportHeight: vp ? parseFloat(getComputedStyle(vp).height) : null,
    overflow: vp ? getComputedStyle(vp).overflowY : null,
    transform: sc ? getComputedStyle(sc).transform : null,
    noteCount: notes.length,
    sheetHeight:
      document.getElementById('sheet')?.getBoundingClientRect().height ?? 0,
  };
});
check('notes rendered', initial.noteCount > 0, `n=${initial.noteCount}`);
check(
  'viewport clips overflow',
  initial.overflow === 'hidden',
  initial.overflow,
);
check(
  'viewport height measured',
  initial.viewportHeight > 50,
  `${initial.viewportHeight}px`,
);
check(
  'viewport shorter than full score (is actually clipping)',
  initial.viewportHeight < initial.sheetHeight,
  `vp=${Math.round(initial.viewportHeight)} sheet=${Math.round(initial.sheetHeight)}`,
);

// With 2 systems and 2 visible lines there is correctly nothing to scroll.
// Force the following behaviour by narrowing the viewport to a single line.
await p.evaluate(() => {
  document.querySelectorAll('button').forEach((x) => {
    if (x.getAttribute('aria-label') === 'Ajustes de la vista') x.click();
  });
});
await new Promise((r) => setTimeout(r, 300));
await p.evaluate(() => {
  const sel = document.querySelector('[role="menu"] select');
  sel.value = '1';
  sel.dispatchEvent(new Event('change', { bubbles: true }));
});
await new Promise((r) => setTimeout(r, 800));
const oneLineHeight = await p.evaluate(() =>
  parseFloat(
    getComputedStyle(document.getElementById('sheet-viewport')).height,
  ),
);
check(
  'one-line viewport is shorter than two-line',
  oneLineHeight < initial.viewportHeight,
  `1line=${oneLineHeight} 2line=${initial.viewportHeight}`,
);

// Drive the song from the engine's own hint key, so this works for whichever
// piece is loaded: read the highlighted key's base MIDI, press the matching
// QWERTY key, repeat.
const MIDI_TO_KEY = {
  60: 'a',
  61: 'w',
  62: 's',
  63: 'e',
  64: 'd',
  65: 'f',
  66: 't',
  67: 'g',
  68: 'y',
  69: 'h',
  70: 'u',
  71: 'j',
};
const transforms = [];
for (let i = 0; i < 26; i++) {
  const midi = await p.evaluate(() => {
    const el = document.querySelector('[class*="hintKey"]');
    return el ? Number(el.getAttribute('data-midi')) : null;
  });
  if (midi === null) break;
  const k = MIDI_TO_KEY[midi];
  if (!k) break;
  await p.keyboard.down(k);
  await new Promise((r) => setTimeout(r, 80));
  await p.keyboard.up(k);
  await new Promise((r) => setTimeout(r, 140));
  transforms.push(
    await p.evaluate(
      () =>
        getComputedStyle(document.getElementById('sheet-scroller')).transform,
    ),
  );
}
const uniq = [...new Set(transforms)];
check(
  'sheet scrolled as the piece advanced',
  uniq.length > 1,
  `${uniq.length} distinct offsets over ${transforms.length} notes`,
);

const progressed = await p.evaluate(
  () => document.getElementById('progress')?.style.width,
);
check(
  'progress advanced (keys registered)',
  progressed && progressed !== '0%',
  `width=${progressed}`,
);

// The settings menu is already open from the line-count change above.
// menu may already be open from the line-count step; only click if closed
await p.evaluate(() => {
  if (!document.querySelector('[role="menu"]'))
    document.querySelectorAll('button').forEach((x) => {
      if (x.getAttribute('aria-label') === 'Ajustes de la vista') x.click();
    });
});
await new Promise((r) => setTimeout(r, 300));
check(
  'settings menu opens',
  await p.evaluate(() => !!document.querySelector('[role="menu"]')),
);

await p.evaluate(() => {
  const cb = document.querySelector('[role="menu"] input[type="checkbox"]');
  if (cb) cb.click();
});
await new Promise((r) => setTimeout(r, 500));
const pianoHidden = await p.evaluate(() => {
  const w = document.getElementById('octave-indicator')?.parentElement;
  return w ? getComputedStyle(w).display : 'not-found';
});
check('piano hides via settings', pianoHidden === 'none', pianoHidden);

await p.reload({ waitUntil: 'networkidle0' });
await new Promise((r) => setTimeout(r, 2200));
const stillHidden = await p.evaluate(() => {
  const w = document.getElementById('octave-indicator')?.parentElement;
  return w ? getComputedStyle(w).display : 'not-found';
});
check('piano stays hidden after reload', stillHidden === 'none', stillHidden);
const linesPersisted = await p.evaluate(
  () =>
    JSON.parse(localStorage.getItem('teclas.progress') || '{}')?.settings
      ?.sheetLines,
);
check(
  'sheet line count persisted',
  linesPersisted === 1,
  `sheetLines=${linesPersisted}`,
);

const calib = await p.evaluate(() => {
  const a = document.querySelector('a[href="/calibracion"]');
  return a ? a.textContent.trim() : null;
});
check('calibration button present', calib !== null, String(calib));

await b.close();
console.log(
  fails === 0 ? '\nALL SHEET CHECKS PASSED' : `\n${fails} FAILURE(S)`,
);
process.exit(fails === 0 ? 0 : 1);
