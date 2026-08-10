import puppeteer from 'puppeteer';
import { CHROME, BASE } from './env.mjs';
const b = await puppeteer.launch({
  headless: 'new',
  executablePath: CHROME,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});
const p = await b.newPage();
await p.setViewport({ width: 1280, height: 900 });
await p.goto(BASE + '/piano-player', { waitUntil: 'networkidle0' });
await new Promise((r) => setTimeout(r, 1500));
await p.evaluate(() => {
  const s = document.getElementById('level-select');
  const i = [...s.options].findIndex((o) =>
    /Himno|Elisa|Greensleeves/i.test(o.textContent),
  );
  s.value = String(i >= 0 ? i : 0);
  s.dispatchEvent(new Event('change', { bubbles: true }));
});
await new Promise((r) => setTimeout(r, 2000));
const info = await p.evaluate(() => {
  const sheet = document.getElementById('sheet');
  const svg = sheet.querySelector('svg');
  const classes = {};
  svg.querySelectorAll('*').forEach((el) => {
    const c = (el.getAttribute('class') || '').trim();
    if (c) c.split(/\s+/).forEach((x) => (classes[x] = (classes[x] || 0) + 1));
  });
  const sc = document.getElementById('sheet-scroller');
  const top = sc.getBoundingClientRect().top;
  const notes = [...sheet.querySelectorAll('.abcjs-note')].map((n) => {
    const r = n.getBoundingClientRect();
    return { t: +(r.top - top).toFixed(1), h: +r.height.toFixed(1) };
  });
  const staffs = [...sheet.querySelectorAll('.abcjs-staff')].map((n) => {
    const r = n.getBoundingClientRect();
    return { t: +(r.top - top).toFixed(1), h: +r.height.toFixed(1) };
  });
  return {
    classes: Object.entries(classes).filter(([k]) =>
      /staff|line|system|note/i.test(k),
    ),
    noteTops: notes.slice(0, 60),
    staffs,
    svgH: svg.getBoundingClientRect().height,
  };
});
console.log('svg height', info.svgH);
console.log('relevant classes:', JSON.stringify(info.classes));
console.log('abcjs-staff boxes:', JSON.stringify(info.staffs));
const tops = info.noteTops.map((n) => n.t);
console.log('note tops:', JSON.stringify(tops));
console.log(
  'note heights:',
  JSON.stringify(
    [...new Set(info.noteTops.map((n) => n.h))].sort((a, b) => a - b),
  ),
);
await b.close();
