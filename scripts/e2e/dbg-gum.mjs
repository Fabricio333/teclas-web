import puppeteer from 'puppeteer';
import { CHROME, BASE } from './env.mjs';
for (const extra of [
  [],
  ['--use-fake-device-for-media-capture'],
  [
    '--use-fake-device-for-media-capture',
    '--use-fake-ui-for-media-stream',
    '--allow-file-access-from-files',
  ],
]) {
  const b = await puppeteer.launch({
    headless: 'new',
    executablePath: CHROME,
    args: ['--no-sandbox', '--disable-setuid-sandbox', ...extra],
  });
  const p = await b.newPage();
  await b.defaultBrowserContext().overridePermissions(BASE, ['microphone']);
  await p.goto(BASE + '/calibracion', { waitUntil: 'domcontentloaded' });
  const r = await p.evaluate(async () => {
    const out = {};
    for (const [name, c] of [
      ['plain', { audio: true }],
      [
        'strict',
        {
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
            channelCount: 1,
            sampleRate: 48000,
          },
        },
      ],
    ]) {
      try {
        const s = await navigator.mediaDevices.getUserMedia(c);
        out[name] = 'ok';
        s.getTracks().forEach((t) => t.stop());
      } catch (e) {
        out[name] = e.name;
      }
    }
    out.devices = (await navigator.mediaDevices.enumerateDevices()).filter(
      (d) => d.kind === 'audioinput',
    ).length;
    return out;
  });
  console.log(JSON.stringify(extra), '->', JSON.stringify(r));
  await b.close();
}
