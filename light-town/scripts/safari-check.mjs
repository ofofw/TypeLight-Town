#!/usr/bin/env node
/**
 * Keyboard walkthrough in the real Safari app over WebDriver (safaridriver ships with macOS; no installs).
 * It covers the manual Mac Safari checklist in docs/兼容性报告.md except the two things WebDriver cannot
 * produce: the Caps Lock key state and Chinese IME composition. Whether the sound is pleasant still needs ears.
 *
 * One-time setup in Safari: Settings → Advanced → "Show features for web developers",
 * then Settings → Developer → "Allow remote automation" (or run `safaridriver --enable` once).
 *
 * Usage: start the game (`npm run build && npm run preview`), then
 *   node scripts/safari-check.mjs [url]                 default url: http://127.0.0.1:4173/
 *   CHROMEDRIVER=/path/to/chromedriver node scripts/safari-check.mjs --chrome [url]
 * The --chrome mode runs the same steps in headless Chrome to test this script itself; its results
 * go to test-results/webdriver-chrome.json and say nothing about Safari.
 *
 * Safari runs the session in its own automation window with separate, temporary website data,
 * so the player's own save in normal Safari windows is not read or changed.
 * Results go to docs/evidence/safari-real.json (and safari-failure.png when a step fails).
 */
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const CHROME = args.includes('--chrome');
const BASE = args.find((a) => !a.startsWith('--')) ?? 'http://127.0.0.1:4173/';
const PORT = 4445;
const SAVE_KEY = 'lighttown.save';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = CHROME ? resolve(ROOT, 'test-results') : resolve(ROOT, 'docs/evidence');
const OUT_NAME = CHROME ? 'webdriver-chrome' : 'safari-real';
const KEY = { Enter: '\uE007', Escape: '\uE00C', Tab: '\uE004', Alt: '\uE00A', Shift: '\uE008', ArrowRight: '\uE014', Space: ' ' };
/** Safari moves focus between buttons with Option+Tab; Chrome with Tab. */
const NEXT_FOCUS = CHROME ? [KEY.Tab] : [KEY.Alt, KEY.Tab];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const checks = [];
let sid = null;

async function wd(method, path, body) {
  const res = await fetch(`http://127.0.0.1:${PORT}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await res.json();
  if (json.value && json.value.error) throw new Error(`${json.value.error}: ${json.value.message}`);
  return json.value;
}

const s = (path) => `/session/${sid}${path}`;

/** Runs `body` as a function in the page; `arguments` holds `args`. */
const exec = (body, ...args) => wd('POST', s('/execute/sync'), { script: body, args });

const FIND = `
  function find(text, within) {
    const root = within ? document.querySelector(within) : document;
    if (!root) return null;
    return [...root.querySelectorAll('button, [role="radio"], a[href]')].find(
      (b) => b.getClientRects().length > 0 && (b.getAttribute('aria-label') || b.textContent).replace(/\\s+/g, '').includes(text),
    ) ?? null;
  }`;

async function waitFor(what, body, args = [], timeout = 10_000) {
  const t0 = Date.now();
  for (;;) {
    const v = await exec(body, ...args);
    if (v) return v;
    if (Date.now() - t0 > timeout) throw new Error(`timed out waiting for ${what}`);
    await sleep(100);
  }
}

const LEVEL_RUNNING = `return !document.querySelector('[role="dialog"], .ready-panel') && !!document.querySelector('.target-box');`;

const waitText = (what, selector, text) =>
  waitFor(what, `const el = document.querySelector(arguments[0]); return !!el && el.textContent.includes(arguments[1]);`, [selector, text]);

/** Presses keys one after another; an array entry is a chord such as [Alt, Tab]. */
async function press(...seq) {
  const actions = [];
  for (const k of seq) {
    const parts = Array.isArray(k) ? k : [k];
    for (const p of parts) actions.push({ type: 'keyDown', value: p });
    for (const p of [...parts].reverse()) actions.push({ type: 'keyUp', value: p });
  }
  await wd('POST', s('/actions'), { actions: [{ type: 'key', id: 'keyboard', actions }] });
  await wd('DELETE', s('/actions'));
}

/** Moves focus the way a keyboard user would (Option+Tab in Safari) until the named control has it. */
async function focusWithKeyboard(text, within, max = 30) {
  for (let i = 0; i <= max; i++) {
    if (await exec(`${FIND} return find(arguments[0], arguments[1]) === document.activeElement;`, text, within)) return i;
    await press(NEXT_FOCUS);
  }
  throw new Error(`the keyboard did not reach "${text}"`);
}

async function activate(text, within) {
  await focusWithKeyboard(text, within);
  await press(KEY.Enter);
}

/** Navigation for the layout audit only, where the keyboard path is not what is being tested. */
async function clickText(text, within) {
  const ok = await exec(`${FIND} const b = find(arguments[0], arguments[1]); if (b) b.click(); return !!b;`, text, within);
  if (!ok) throw new Error(`no button "${text}"`);
  await sleep(250);
}

const readSave = () => exec(`return JSON.parse(localStorage.getItem(arguments[0]) || 'null');`, SAVE_KEY);
const level = async () => (await readSave()).activeLevel;

async function typeTargets(count = Infinity, gapMs = 0) {
  const lvl = await level();
  if (!lvl) throw new Error('no active level in the save');
  for (const ch of lvl.targets.slice(lvl.pos, lvl.pos + count)) {
    await press(ch);
    if (gapMs) await sleep(gapMs);
  }
}

const wrongFor = (ch) => (ch === 'q' ? 'p' : 'q');

/** Resizes the window so the page itself (not the window frame) gets roughly w×h. Returns the size reached. */
async function setViewport(w, h) {
  const frame = await exec('return { w: outerWidth - innerWidth, h: outerHeight - innerHeight };');
  await wd('POST', s('/window/rect'), { x: 0, y: 0, width: w + frame.w, height: h + frame.h });
  await sleep(300);
  return exec('return { width: innerWidth, height: innerHeight };');
}

/** Same rules as tests/e2e/layout.spec.ts: no sideways scrolling, 44 px targets, readable text. */
const AUDIT = `
  const out = [];
  const doc = document.scrollingElement;
  if (doc.scrollWidth > innerWidth + 1) out.push('horizontal overflow ' + doc.scrollWidth + ' > ' + innerWidth);
  const visible = (el) => { const r = el.getBoundingClientRect(); const st = getComputedStyle(el); return r.width > 0 && r.height > 0 && st.visibility !== 'hidden' && st.display !== 'none'; };
  const label = (el) => (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 24);
  for (const el of document.querySelectorAll('button, a[href], select, input, summary, [role="switch"], [role="radio"]')) {
    if (!visible(el) || el.closest('[inert]')) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 43.5 || r.height < 43.5) out.push('small target ' + Math.round(r.width) + 'x' + Math.round(r.height) + ' "' + label(el) + '"');
  }
  for (const el of document.querySelectorAll('p, li, dd, td, dt, th, figcaption, label, legend')) {
    if (!visible(el) || !el.textContent.trim()) continue;
    const size = parseFloat(getComputedStyle(el).fontSize);
    if (size < 17.9) out.push('small text ' + size + 'px "' + label(el) + '"');
  }
  for (const el of document.querySelectorAll('.target-char, .target-letter')) {
    if (!visible(el)) continue;
    const size = parseFloat(getComputedStyle(el).fontSize);
    if (size < 40) out.push('target text ' + size + 'px');
  }
  return out;`;

async function audit(page) {
  await sleep(200);
  return (await exec(AUDIT)).map((issue) => `${page}: ${issue}`);
}

async function step(name, fn) {
  const t0 = Date.now();
  try {
    const detail = await fn();
    checks.push({ name, ok: true, ms: Date.now() - t0, ...(detail ? { detail } : {}) });
    console.log(`  ✓ ${name}${detail ? `: ${typeof detail === 'string' ? detail : JSON.stringify(detail)}` : ''}`);
  } catch (err) {
    checks.push({ name, ok: false, ms: Date.now() - t0, error: String(err.message ?? err) });
    console.log(`  ✗ ${name}: ${err.message ?? err}`);
    try {
      const png = await wd('GET', s('/screenshot'));
      writeFileSync(resolve(OUT_DIR, `${OUT_NAME}-failure.png`), Buffer.from(png, 'base64'));
    } catch {}
    throw err;
  }
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const driver = CHROME
    ? spawn(process.env.CHROMEDRIVER ?? 'chromedriver', [`--port=${PORT}`], { stdio: 'ignore' })
    : spawn('safaridriver', ['-p', String(PORT)], { stdio: 'ignore' });
  let caps = null;
  try {
    for (let i = 0; i < 50; i++) {
      try {
        await fetch(`http://127.0.0.1:${PORT}/status`);
        break;
      } catch {
        await sleep(100);
      }
    }
    const capabilities = CHROME
      ? { browserName: 'chrome', 'goog:chromeOptions': { args: ['--headless=new', '--autoplay-policy=no-user-gesture-required'] } }
      : { browserName: 'safari' };
    const session = await wd('POST', '/session', { capabilities: { alwaysMatch: capabilities } });
    sid = session.sessionId;
    caps = session.capabilities;
    await wd('POST', s('/window/rect'), { x: 40, y: 40, width: 1280, height: 860 });
    console.log(`${caps.browserName} ${caps.browserVersion} on ${caps.platformName}, ${BASE}`);

    await step('home page loads with fresh storage', async () => {
      await wd('POST', s('/url'), { url: BASE });
      await exec('localStorage.clear(); sessionStorage.clear();');
      await wd('POST', s('/refresh'), {});
      await waitText('the home title', 'h1', '点亮小镇');
      return exec('return { viewport: innerWidth + "x" + innerHeight, ua: navigator.userAgent };');
    });

    await step('home → partner with the keyboard and Enter', async () => {
      await activate('开始点亮');
      await waitFor('three partners', `return document.querySelectorAll('[role="radio"]').length === 3;`);
    });

    await step('partner chosen with arrow keys and Enter', async () => {
      await focusWithKeyboard('', '[role="radiogroup"]');
      await press(KEY.ArrowRight);
      const checked = await exec(`return document.querySelectorAll('[role="radio"]')[1].getAttribute('aria-checked');`);
      if (checked !== 'true') throw new Error('ArrowRight did not select the second partner');
      await press(KEY.Enter);
      await waitText('the welcome step', 'h2', '欢迎来到点亮小镇');
    });

    await step('guide: three steps, then the f/j demo (a wrong key only shows a hint)', async () => {
      for (let i = 0; i < 3; i++) await activate('下一步');
      await waitText('the demo step', 'h2', '点亮第一扇窗');
      await press('f', 'k');
      await waitText('the gentle hint', 'body', '再找找看，没关系');
      await press('j', 'f', 'j');
      await waitText('the end of the guide', 'h2', '准备好了！');
      const save = await readSave();
      if (save.stats.attempts !== 0 || save.coins !== 0) throw new Error(`guide counted: attempts ${save.stats.attempts}, coins ${save.coins}`);
      return { partner: save.partner, attempts: save.stats.attempts, coins: save.coins };
    });

    await step('town, then the first level through its introductions (Enter only)', async () => {
      await activate('去小镇');
      await waitText('the town goal', '.town__goal', '现在点亮：小灯屋');
      await activate('继续点亮', '.town__goal');
      for (let i = 0; i < 4; i++) {
        const where = await waitFor(
          'an introduction or the level',
          `return document.querySelector('[role="dialog"], .ready-panel') ? 'intro' : document.querySelector('.target-box') ? 'level' : null;`,
        );
        if (where === 'level') break;
        await press(KEY.Enter);
        await sleep(250);
      }
      await waitFor('the first target', LEVEL_RUNNING);
    });

    await step('typing feedback latency (keydown → painted frame)', async () => {
      await exec(`
        window.__lat = [];
        window.addEventListener('keydown', () => (window.__t0 = performance.now()), true);
        new MutationObserver(() => {
          const dom = performance.now() - window.__t0;
          requestAnimationFrame(() => requestAnimationFrame(() => window.__lat.push({ dom, frame: performance.now() - window.__t0 })));
        }).observe(document.querySelector('.light-strip'), { subtree: true, attributes: true, attributeFilter: ['class'] });`);
      await typeTargets(10, 80);
      await sleep(300);
      const lat = await exec('return window.__lat;');
      if (lat.length < 10) throw new Error(`only ${lat.length} key presses were measured`);
      const maxFrame = Math.max(...lat.map((l) => l.frame));
      const result = {
        n: lat.length,
        domMaxMs: +Math.max(...lat.map((l) => l.dom)).toFixed(1),
        frameAvgMs: +(lat.reduce((a, l) => a + l.frame, 0) / lat.length).toFixed(1),
        frameMaxMs: +maxFrame.toFixed(1),
      };
      if (maxFrame >= 100) throw new Error(`slowest feedback ${result.frameMaxMs} ms`);
      return result;
    });

    await step('two wrong keys enlarge the hint; the correct key brings back the basic hint', async () => {
      const before = await level();
      const target = before.targets[before.pos];
      await press(wrongFor(target), wrongFor(target));
      await waitFor('the enlarged hint', `return document.querySelectorAll('.key--enhanced').length === 1;`);
      const mid = await level();
      if (mid.pos !== before.pos || mid.attempts !== before.attempts + 2) throw new Error(`wrong keys moved on or were not counted: ${JSON.stringify(mid)}`);
      await press(target);
      await waitFor('the basic hint', `return document.querySelectorAll('.key--enhanced').length === 0;`);
      if ((await level()).pos !== before.pos + 1) throw new Error('the correct key did not advance');
      return { target, attempts: mid.attempts };
    });

    await step('Shift + letter counts as correct and shows the Shift note', async () => {
      const before = await level();
      const target = before.targets[before.pos];
      await press([KEY.Shift, target.toUpperCase()]);
      await waitText('the Shift note', 'body', '不用按 Shift 键');
      if ((await level()).pos !== before.pos + 1) throw new Error('the upper-case letter was not accepted');
    });

    await step('Space in a level without space targets: not counted and the page does not scroll', async () => {
      const size = await setViewport(1024, 520);
      const before = await level();
      await exec('window.scrollTo(0, 0);');
      const scrollable = await exec('return document.scrollingElement.scrollHeight > innerHeight;');
      await press(KEY.Space);
      await sleep(200);
      const y = await exec('return scrollY;');
      const after = await level();
      await setViewport(1280, 770);
      if (y !== 0) throw new Error(`the page scrolled to ${y}`);
      if (after.attempts !== before.attempts || after.pos !== before.pos) throw new Error('Space was counted');
      return { viewport: `${size.width}x${size.height}`, pageScrollable: scrollable, scrollY: y };
    });

    await step('Escape pauses; Tab stays inside the menu; Enter on 继续 resumes without typing', async () => {
      const before = await level();
      await press(KEY.Escape);
      await waitFor('the pause menu', `return document.querySelector('[role="dialog"]')?.textContent.includes('已暂停');`);
      const n = await exec(`return document.querySelector('[role="dialog"]').querySelectorAll('button').length;`);
      const first = await exec(`return document.activeElement.textContent.trim();`);
      for (let i = 0; i < n; i++) {
        await press(KEY.Tab);
        if (!(await exec(`return document.querySelector('[role="dialog"]').contains(document.activeElement);`))) {
          throw new Error(`focus left the menu after ${i + 1} Tab presses`);
        }
      }
      const back = await exec(`return document.activeElement.textContent.trim();`);
      if (back !== first) throw new Error(`after ${n} Tabs focus is on "${back}", expected "${first}"`);
      await press(KEY.Enter);
      await waitFor('the menu to close', `return !document.querySelector('[role="dialog"]');`);
      const after = await level();
      if (after.attempts !== before.attempts || after.pos !== before.pos) throw new Error('menu keys were counted as typing');
      return { menuButtons: n, focusStart: first };
    });

    await step('switching to another tab pauses; keys are not counted until Enter', async () => {
      const original = await wd('GET', s('/window'));
      const opened = await wd('POST', s('/window/new'), { type: 'tab' });
      await wd('POST', s('/window'), { handle: opened.handle });
      await sleep(500);
      await wd('DELETE', s('/window'));
      await wd('POST', s('/window'), { handle: original });
      await waitText('the paused panel', '.ready-panel', '离开了页面或切换了窗口');
      const before = await level();
      await press(before.targets[before.pos]);
      await sleep(200);
      if ((await level()).attempts !== before.attempts) throw new Error('a key was counted while paused');
      await press(KEY.Enter);
      await waitFor('the target', LEVEL_RUNNING);
    });

    await step('reload mid-level: same targets and position, paused until confirmed', async () => {
      await typeTargets(2);
      const before = await level();
      await wd('POST', s('/refresh'), {});
      await waitText('the home title', 'h1', '点亮小镇');
      await activate('继续点亮');
      await waitText('the resume banner', '.resume-banner', `已完成 ${before.pos}/24`);
      await activate('继续上次', '.resume-banner');
      await waitText('the paused panel', '.ready-panel', '已暂停');
      await press(KEY.Enter);
      await waitFor('the target', LEVEL_RUNNING);
      const after = await level();
      if (after.id !== before.id || after.pos !== before.pos || after.targets.join('') !== before.targets.join('')) {
        throw new Error('the level changed after reload');
      }
      return { pos: after.pos, bulbsOn: await exec(`return document.querySelectorAll('.bulb--on').length;`) };
    });

    await step('finish the level; Enter and Space on the result page do nothing', async () => {
      await typeTargets();
      await waitText('the result page', 'h1', '完成啦');
      await press(KEY.Enter, KEY.Space);
      await sleep(400);
      const still = await exec(`return document.querySelector('h1')?.textContent.includes('完成啦');`);
      if (!still) throw new Error('the result page was skipped by Enter/Space');
      const save = await readSave();
      const text = await exec(`return document.querySelector('.result__building-text')?.textContent;`);
      if (save.buildings[0] !== 1) throw new Error(`building at ${save.buildings[0]}/6`);
      if (save.stats.attempts !== 26 || save.coins !== 12) throw new Error(`24 correct + 2 wrong should pay 12: attempts ${save.stats.attempts}, coins ${save.coins}`);
      await sleep(2200);
      const problems = await audit('result');
      if (problems.length) throw new Error(problems.join('; '));
      return { building: text, coins: save.coins, attempts: save.stats.attempts };
    });

    await step('end the session → summary → town shows 1/6', async () => {
      await activate('结束本次');
      await waitText('the summary', 'h2', '这次完成了 1 关');
      await activate('回小镇');
      await waitText('the town progress', '.town__goal-progress', '已点亮 1/6');
    });

    await step('sound: files loaded, no problem shown; muting in settings keeps the channel settings', async () => {
      const loaded = await exec(`return performance.getEntriesByType('resource').map((e) => e.name).filter((n) => n.includes('/audio/')).map((n) => n.split('/audio/')[1]);`);
      if (!loaded.some((n) => n.startsWith('music/'))) throw new Error('the music file was not requested');
      if (await exec(`${FIND} return !!find('声音没加载好');`)) throw new Error('the game reports that sound files failed to load');
      const blocked = await exec(`${FIND} return !!find('点这里开启声音');`);
      await activate('设置', '.town-nav');
      await waitText('the settings page', 'h2', '声音');
      const before = (await readSave()).settings;
      await activate('全部声音');
      await waitFor('master mute saved', `return JSON.parse(localStorage.getItem(arguments[0])).settings.masterMute === true;`, [SAVE_KEY]);
      await activate('全部声音');
      await waitFor('sound back on', `return JSON.parse(localStorage.getItem(arguments[0])).settings.masterMute === false;`, [SAVE_KEY]);
      const after = (await readSave()).settings;
      for (const k of ['music', 'sfx', 'voice', 'musicVolume', 'sfxVolume', 'voiceVolume']) {
        if (after[k] !== before[k]) throw new Error(`muting changed ${k}: ${before[k]} → ${after[k]}`);
      }
      await activate('小镇');
      await waitText('the town', '.town__goal', '现在点亮');
      return { filesLoaded: loaded.length, autoplay: blocked ? 'blocked until a click on 点这里开启声音' : 'started' };
    });

    await step('layout at Mac, iPad and 200 % zoom sizes: no sideways scroll, 44 px targets, readable text', async () => {
      const reached = [];
      const problems = [];
      for (const [w, h] of [[1280, 800], [1024, 768], [768, 1024], [640, 400]]) {
        const size = await setViewport(w, h);
        const tag = `${size.width}x${size.height}`;
        reached.push(tag);
        problems.push(...(await audit(`${tag} town`)));
        for (const page of ['衣柜', '学习路线', '灯光节', '家长', '设置']) {
          await clickText(page, '.town-nav');
          problems.push(...(await audit(`${tag} ${page}`)));
          await clickText('小镇');
        }
      }
      await setViewport(1280, 770);
      if (problems.length) throw new Error(problems.slice(0, 12).join('; '));
      return { viewports: reached };
    });

    await step('Space types a space target and does not scroll the page; Space in the menu presses 继续', async () => {
      const save = await readSave();
      save.course = { ...save.course, stage: 12, introSeen: 12 };
      save.seen = { ...save.seen, 'mode:keys': true, 'mode:strip': true, 'mode:sign': true, 'mode:sign-space': true };
      await exec(`localStorage.setItem(arguments[0], JSON.stringify(arguments[1]));`, SAVE_KEY, save);
      await setViewport(1024, 520);
      await wd('POST', s('/refresh'), {});
      await waitText('the home title', 'h1', '点亮小镇');
      await activate('继续点亮');
      await activate('继续点亮', '.town__goal');
      await waitFor('the ready panel', `return !!document.querySelector('.ready-panel');`);
      await press(KEY.Enter);
      await waitFor('the target', LEVEL_RUNNING);
      const lvl = await level();
      const first = lvl.targets.indexOf(' ');
      if (first < 0) throw new Error('no space target in a stage-12 level');
      await typeTargets(first);
      await exec('window.scrollTo(0, 0);');
      const scrollable = await exec('return document.scrollingElement.scrollHeight > innerHeight;');
      await press(KEY.Space);
      await sleep(200);
      const y = await exec('return scrollY;');
      if (y !== 0) throw new Error(`the page scrolled to ${y}`);
      if ((await level()).pos !== first + 1) throw new Error('Space did not type the space target');
      await press(KEY.Escape);
      await waitFor('the pause menu', `return !!document.querySelector('[role="dialog"]');`);
      await press(KEY.Space);
      await waitFor('the menu to close', `return !document.querySelector('[role="dialog"]');`);
      const after = await level();
      if (after.paused || after.pos !== first + 1) throw new Error('Space in the menu was typed into the level');
      return { pageScrollable: scrollable, scrollY: y };
    });

    await step('practice page layout at Mac, iPad and 200 % zoom sizes', async () => {
      const reached = [];
      const problems = [];
      for (const [w, h] of [[1280, 800], [1024, 768], [768, 1024], [640, 400]]) {
        const size = await setViewport(w, h);
        const tag = `${size.width}x${size.height}`;
        reached.push(tag);
        problems.push(...(await audit(`${tag} practice`)));
      }
      if (problems.length) throw new Error(problems.slice(0, 12).join('; '));
      return { viewports: reached };
    });
  } finally {
    if (caps) {
      const report = {
        when: new Date().toISOString(),
        url: BASE,
        browser: `${caps.browserName} ${caps.browserVersion}`,
        platform: caps.platformName,
        notCovered: ['Caps Lock key state', 'Chinese IME composition', 'whether the sound is pleasant'],
        passed: checks.filter((c) => c.ok).length,
        failed: checks.filter((c) => !c.ok).length,
        checks,
      };
      writeFileSync(resolve(OUT_DIR, `${OUT_NAME}.json`), JSON.stringify(report, null, 2) + '\n');
      console.log(`${report.passed} passed, ${report.failed} failed → ${resolve(OUT_DIR, `${OUT_NAME}.json`)}`);
    } else {
      console.log('No browser session was created, so no report was written.');
    }
    if (sid) await wd('DELETE', s('')).catch(() => {});
    driver.kill();
  }
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exitCode = 1;
});
