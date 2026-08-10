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
  ],
});
const p = await b.newPage();
p.on('console', (m) =>
  console.log('[' + m.type() + ']', m.text().slice(0, 200)),
);
p.on('pageerror', (e) => console.log('[pageerror]', e.message.slice(0, 200)));
await b.defaultBrowserContext().overridePermissions(BASE, ['microphone']);
await p.goto(BASE + '/calibracion', { waitUntil: 'networkidle0' });
await new Promise((r) => setTimeout(r, 500));
console.log(
  'buttons:',
  await p.evaluate(() =>
    [...document.querySelectorAll('button')]
      .map((b) => JSON.stringify(b.textContent.trim()))
      .join(', '),
  ),
);
const gum = await p.evaluate(async () => {
  try {
    const s = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
        channelCount: 1,
        sampleRate: 48000,
      },
    });
    s.getTracks().forEach((t) => t.stop());
    return 'ok';
  } catch (e) {
    return e.name + ': ' + e.message;
  }
});
console.log('getUserMedia(strict):', gum);
await p.evaluate(() => {
  [...document.querySelectorAll('button')]
    .find((x) => x.textContent.trim() === 'Empezar')
    ?.click();
});
await new Promise((r) => setTimeout(r, 2000));
console.log(
  'after click:',
  (await p.evaluate(() => document.body.innerText))
    .split('\n')
    .filter(Boolean)
    .slice(4, 10)
    .join(' | '),
);
await b.close();
