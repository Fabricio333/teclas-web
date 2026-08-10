import puppeteer from 'puppeteer';
import { CHROME, BASE } from './env.mjs';

const PAGES = [
  ['/', 'h1, h2'],
  ['/ear-training', 'h2'],
  ['/piano-player', 'h2'],
  ['/resources', 'h1'],
  ['/faq', 'h1'],
  ['/events', 'h1'],
];

const VIEWPORTS = [
  { name: 'mobile-360', width: 360, height: 740 },
  { name: 'tablet-768', width: 768, height: 900 },
  { name: 'desktop-1280', width: 1280, height: 900 },
];

const browser = await puppeteer.launch({
  headless: 'new',
  executablePath: CHROME,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

let failures = 0;

for (const vp of VIEWPORTS) {
  console.log(`\n=== ${vp.name} (${vp.width}px) ===`);
  const page = await browser.newPage();
  await page.setViewport({ width: vp.width, height: vp.height });

  for (const [path, sel] of PAGES) {
    await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 350));

    const res = await page.evaluate((sel) => {
      const header = document.querySelector('header');
      const hb = header?.getBoundingClientRect();
      const heading = document.querySelector(sel);
      const tb = heading?.getBoundingClientRect();
      const navVisible = header
        ? getComputedStyle(header).transform !== 'matrix(1, 0, 0, 1, 0, -100)'
        : false;
      // Is any nav link reachable? (768px dead-zone regression check)
      const links = [...document.querySelectorAll('header a')].filter((a) => {
        const r = a.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      });
      const burger = document.querySelector('header button');
      const burgerVisible = burger
        ? burger.getBoundingClientRect().width > 0
        : false;
      return {
        headerH: hb ? +hb.height.toFixed(1) : null,
        headerBottom: hb ? +hb.bottom.toFixed(1) : null,
        headingTop: tb ? +tb.top.toFixed(1) : null,
        headingText: heading?.textContent?.trim().slice(0, 32) ?? null,
        navLinks: links.length,
        burgerVisible,
        docScrolls:
          document.documentElement.scrollHeight > window.innerHeight + 2,
        bodyOverflowX:
          document.documentElement.scrollWidth > window.innerWidth + 2,
      };
    }, sel);

    const clear = res.headingTop - res.headerBottom;
    const ok = clear >= 0;
    const navOk = res.navLinks > 0 || res.burgerVisible;
    if (!ok || !navOk) failures++;
    console.log(
      `${ok && navOk ? 'PASS' : 'FAIL'}  ${path.padEnd(15)} header=${res.headerH}px ` +
        `heading@${res.headingTop} clearance=${clear.toFixed(1)}px ` +
        `nav=${res.navLinks}links/burger:${res.burgerVisible} ` +
        `xoverflow=${res.bodyOverflowX} "${res.headingText}"`,
    );
  }
  await page.close();
}

// Anchor-offset check: does #about-academy land below the header?
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 900 });
await page.goto(BASE + '/', { waitUntil: 'networkidle0' });
const anchor = await page.evaluate(async () => {
  document.querySelector('#about-academy')?.scrollIntoView();
  await new Promise((r) => setTimeout(r, 600));
  const t = document
    .querySelector('#about-academy')
    .getBoundingClientRect().top;
  const hb = document.querySelector('header').getBoundingClientRect().bottom;
  return { top: +t.toFixed(1), headerBottom: +hb.toFixed(1) };
});
const anchorOk = anchor.top >= anchor.headerBottom - 1;
if (!anchorOk) failures++;
console.log(
  `\n=== anchor scroll ===\n${anchorOk ? 'PASS' : 'FAIL'}  #about-academy top=${anchor.top} headerBottom=${anchor.headerBottom}`,
);

await browser.close();
console.log(
  `\n${failures === 0 ? 'ALL CHECKS PASSED' : failures + ' FAILURE(S)'}`,
);
process.exit(failures === 0 ? 0 : 1);
