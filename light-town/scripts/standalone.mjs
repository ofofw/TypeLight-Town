import { readFile, writeFile, readdir } from 'node:fs/promises';
import { resolve, relative, extname } from 'node:path';

// A self-contained file avoids file:// module and audio fetch restrictions.
const root = resolve('dist');
let html = await readFile(resolve(root, 'index.html'), 'utf8');
html = html.replace(/<script id="source-file-entry">[\s\S]*?<\/script>/, '');
const audio = {};
async function collect(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = resolve(dir, entry.name);
    if (entry.isDirectory()) await collect(file);
    else {
      const mime = extname(file) === '.wav' ? 'audio/wav' : 'audio/mp4';
      audio[relative(root, file).split('\\').join('/')] = `data:${mime};base64,${(await readFile(file)).toString('base64')}`;
    }
  }
}
await collect(resolve(root, 'audio'));
const escapeScript = (s) => s.replace(/<\/script/gi, '<\\/script');
let appScripts = '';
for (const match of [...html.matchAll(/<script\b[^>]*src="([^"]+)"[^>]*><\/script>/g)]) {
  const js = await readFile(resolve(root, match[1]), 'utf8');
  appScripts += `<script>globalThis.__LIGHT_TOWN_AUDIO__=${JSON.stringify(audio)};</script><script id="game-app">${escapeScript(js)}</script>`;
  html = html.replace(match[0], '');
}
for (const match of [...html.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g)]) {
  const css = await readFile(resolve(root, match[1]), 'utf8');
  html = html.replace(match[0], () => `<style>${css}</style>`);
}
html = html.replace(/<link\b[^>]*rel="(?:manifest|modulepreload)"[^>]*>/g, '');
for (const match of [...html.matchAll(/<link\b[^>]*href="([^"]+)"[^>]*>/g)]) {
  const file = match[1];
  const mime = file.endsWith('.svg') ? 'image/svg+xml' : 'image/png';
  const data = (await readFile(resolve(root, file))).toString('base64');
  html = html.replace(match[0], match[0].replace(file, `data:${mime};base64,${data}`));
}
html = html.replace('</body>', () => `${appScripts}</body>`);
await writeFile(resolve(root, 'index.html'), html);
// User-facing entry beside the project README, without changing Vite's source entry.
await writeFile(resolve('..', 'index.html'), html);
console.log('Standalone HTML generated: dist/index.html and ../index.html');
