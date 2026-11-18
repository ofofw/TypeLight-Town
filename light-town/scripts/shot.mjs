// Screenshot a local HTML file or URL.
// Usage: node scripts/shot.mjs <file-or-url> <out.png> [width] [height] [chrome|webkit]
// chrome = the installed Google Chrome; webkit = Playwright's WebKit build (Safari engine, not Safari itself).
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium, webkit } from '@playwright/test';

const [input, out, w = '1280', h = '800', engine = 'chrome'] = process.argv.slice(2);
if (!input || !out) {
  console.error('Usage: node scripts/shot.mjs <file-or-url> <out.png> [width] [height] [chrome|webkit]');
  process.exit(2);
}
const url = /^https?:|^file:/.test(input) ? input : pathToFileURL(resolve(input)).href;
const browser = await (engine === 'webkit' ? webkit.launch() : chromium.launch({ channel: 'chrome' }));
try {
  const page = await browser.newPage({ viewport: { width: Number(w), height: Number(h) } });
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForTimeout(300);
  await page.screenshot({ path: out, fullPage: true });
  console.log(`saved ${out}`);
} finally {
  await browser.close();
}
