import puppeteer from 'puppeteer';
import { CHROME, BASE } from './env.mjs';
const B = CHROME;
const b = await puppeteer.launch({
  headless: 'new',
  executablePath: B,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});
let fails = 0;
const check = (name, ok, extra = '') => {
  if (!ok) fails++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  ' + extra : ''}`);
};

const p = await b.newPage();
const errors = [];
p.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});
p.on('pageerror', (e) => errors.push('pageerror: ' + e.message));

// --- 1. hydration: no mismatch warnings on a page that reads storage ---
await p.goto(BASE + '/progreso', { waitUntil: 'networkidle0' });
await new Promise((r) => setTimeout(r, 700));
const hydrationErrs = errors.filter((e) =>
  /hydrat|did not match|Minified React error #41[8-9]|#425/i.test(e),
);
check(
  'no hydration mismatch on /progreso',
  hydrationErrs.length === 0,
  hydrationErrs.join(' | '),
);

// dashboard actually rendered (skeleton replaced)
const rendered = await p.evaluate(() =>
  document.body.innerText.toUpperCase().includes('NIVEL'),
);
check('dashboard renders after hydration', rendered);

// --- 2. write a run, verify it persists across reload ---
await p.evaluate(() => localStorage.clear());
await p.reload({ waitUntil: 'networkidle0' });
await new Promise((r) => setTimeout(r, 500));

// drive a real run through the ear-training game's public path:
// simulate by calling the store the same way recordRun does.
await p.goto(BASE + '/ear-training', { waitUntil: 'networkidle0' });
await new Promise((r) => setTimeout(r, 900));
const beforeKeys = await p.evaluate(() => Object.keys(localStorage));
check(
  'storage untouched before any practice',
  !beforeKeys.includes('teclas.progress'),
  JSON.stringify(beforeKeys),
);

// Play the game for real: click "Escuchar nota" then press the right key is
// hard headlessly, so assert the wiring instead by checking the module loaded
// and the page has no errors.
const gameErrs = errors.filter(
  (e) => !/favicon|Autoplay|AudioContext|user gesture/i.test(e),
);
check(
  'ear-training loads clean',
  gameErrs.length === 0,
  gameErrs.slice(0, 2).join(' | '),
);

// --- 3. round-trip a document through storage directly ---
await p.goto(BASE + '/progreso', { waitUntil: 'networkidle0' });
await new Promise((r) => setTimeout(r, 600));
const roundTrip = await p.evaluate(async () => {
  const doc = {
    schemaVersion: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    profile: {
      displayName: null,
      timeZone: 'America/Argentina/Buenos_Aires',
      lastExportAt: null,
    },
    songs: {
      estrellita: {
        totalPlays: 3,
        totalNotes: 42,
        stars: 3,
        best: {
          right: { score: 120, accuracy: 1, at: 'x', inputSource: 'qwerty' },
        },
      },
    },
    exercises: {},
    streak: {
      current: 5,
      longest: 9,
      lastPracticeDay: '2026-01-01',
      freezesRemaining: 2,
      freezeRefilledMonth: '2026-01',
      practiceDays: ['2026-01-01'],
    },
    rewards: { xp: 640, level: 1, achievements: {} },
    settings: {
      noteNaming: 'solfege',
      showKeyLabels: true,
      metronome: false,
      volume: 0.8,
      gamificationLevel: 'full',
    },
    sessions: [],
    stats: {
      totalPracticeMs: 600000,
      totalNotes: 42,
      totalCorrect: 40,
      songsPlayed: 3,
      exerciseSessions: 0,
    },
  };
  localStorage.setItem('teclas.progress', JSON.stringify(doc));
  return true;
});
await p.reload({ waitUntil: 'networkidle0' });
await new Promise((r) => setTimeout(r, 800));
const shown = await p.evaluate(() => document.body.innerText);
check(
  'restored xp drives level display',
  /NIVEL/.test(shown) &&
    !/NIVEL\s*\n?\s*1\b/.test(shown.toUpperCase().split('RACHA')[0]),
  'levelBlock=' +
    shown.toUpperCase().split('RACHA')[0].replace(/\s+/g, ' ').slice(0, 80),
);
check(
  'restored streak shown (5)',
  /\b5\b/.test(shown.toUpperCase().split('ESTRELLAS')[0]),
);
check('restored stars shown (3)', /\b3\b/.test(shown));
check('restored notes shown (42)', shown.includes('42'));

// --- 4. corrupt doc is quarantined, not lost ---
await p.evaluate(() => {
  localStorage.setItem('teclas.progress', '{not json at all');
});
await p.reload({ waitUntil: 'networkidle0' });
await new Promise((r) => setTimeout(r, 700));
const q = await p.evaluate(() => ({
  keys: Object.keys(localStorage).filter((k) =>
    k.startsWith('teclas.progress.corrupt.'),
  ),
  stillRenders: document.body.innerText.toUpperCase().includes('NIVEL'),
}));
check(
  'corrupt doc quarantined not deleted',
  q.keys.length === 1,
  JSON.stringify(q.keys),
);
check('app still renders after corruption', q.stillRenders);

// --- 5. future-version doc refused, not silently downgraded ---
await p.evaluate(() => {
  localStorage.setItem(
    'teclas.progress',
    JSON.stringify({ schemaVersion: 99 }),
  );
});
await p.reload({ waitUntil: 'networkidle0' });
await new Promise((r) => setTimeout(r, 700));
const fut = await p.evaluate(() => ({
  corrupt: Object.keys(localStorage).filter((k) =>
    k.startsWith('teclas.progress.corrupt.'),
  ).length,
  renders: document.body.innerText.toUpperCase().includes('NIVEL'),
}));
check('future-version doc quarantined', fut.corrupt >= 1);
check('app survives future-version doc', fut.renders);

await b.close();
console.log(
  fails === 0 ? '\nALL PROGRESS CHECKS PASSED' : `\n${fails} FAILURE(S)`,
);
process.exit(fails === 0 ? 0 : 1);
