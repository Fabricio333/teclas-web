import puppeteer from 'puppeteer';
import { CHROME, BASE } from './env.mjs';
const b = await puppeteer.launch({
  headless: 'new',
  executablePath: CHROME,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});
const p = await b.newPage();
p.on('console', (m) =>
  console.log('[' + m.type() + ']', m.text().slice(0, 200)),
);
p.on('pageerror', (e) => console.log('[pageerror]', e.message.slice(0, 300)));
await p.goto(BASE + '/progreso', { waitUntil: 'networkidle0' });
await new Promise((r) => setTimeout(r, 1200));
const t = await p.evaluate(() => ({
  text: document.body.innerText.slice(0, 400),
  hasSkeleton: !!document.querySelector('[aria-hidden="true"]'),
  storage: Object.keys(localStorage),
}));
console.log('---TEXT---\n' + t.text);
console.log('skeleton present:', t.hasSkeleton, '| storage:', t.storage);
await b.close();
