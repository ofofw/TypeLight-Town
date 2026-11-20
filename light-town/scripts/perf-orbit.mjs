// 段B 帧率基准：真实 Chrome（headed）+ 硬件 WebGL，真实游戏小镇页拖拽巡览，取 rAF 帧间隔中位数。
// 由 .auto/measure.sh 调用（preview 服务器已由其起停）。打印 METRIC orbit_frame_ms=...
import { chromium } from '@playwright/test';

const URL = process.env.PERF_URL ?? 'http://127.0.0.1:4181/';
const WARMUP_MS = 2500;
const MEASURE_MS = 5000;

const browser = await chromium.launch({ channel: 'chrome', headless: false });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on('pageerror', (err) => { console.error('pageerror:', err.message); });
  await page.goto(URL, { waitUntil: 'load' });

  // 真实首跑：选玩家 → 伙伴 → 三步引导 → 引导小关 → 去小镇
  await page.getByRole('button', { name: '我是玩家一', exact: true }).click();
  await page.getByRole('button', { name: '开始点亮' }).click();
  const radios = page.getByRole('radio');
  await radios.first().focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: '下一步' }).click();
  for (const k of ['f', 'k', 'j', 'f', 'j']) await page.keyboard.press(k);
  await page.getByRole('button', { name: '去小镇' }).click();
  await page.waitForSelector('.town3d canvas', { timeout: 20000 });

  // 存档手术：全部 6 盏满灯 + 当前第 12 座（月湾港），得到最重负载的确定性场景，再重进小镇。
  await page.evaluate(() => {
    const v = JSON.parse(localStorage.getItem('lighttown.save'));
    const g = v.schemaVersion === 3 ? v.profiles[0].game : v;
    g.buildings = g.buildings.map((_, i) => (i < 11 ? 6 : 3));
    g.currentBuilding = 11;
    localStorage.setItem('lighttown.save', JSON.stringify(v));
    localStorage.removeItem('lighttown.lease');
  });
  await page.reload();
  await page.getByRole('button', { name: '我是玩家一', exact: true }).click();
  await page.getByRole('button', { name: /点亮/ }).first().click();
  await page.waitForSelector('.town3d canvas', { timeout: 20000 });
  await page.waitForTimeout(3500);

  const renderer = await page.evaluate(() => {
    const c = document.querySelector('canvas');
    const gl = (c ?? document.createElement('canvas')).getContext('webgl2');
    if (!gl) return 'no-webgl';
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    return ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : String(gl.getParameter(gl.RENDERER));
  });
  console.error(`renderer: ${renderer}`);
  if (/swiftshader|llvmpipe|software/i.test(renderer)) {
    console.error('software renderer detected — not a valid hardware-GL benchmark');
    process.exit(1);
  }

  // 帧间隔采集器：warmup 后开始记录。
  await page.evaluate(([warmup, measure]) => {
    const w = window;
    w.__frames = [];
    w.__collecting = false;
    setTimeout(() => { w.__collecting = true; }, warmup);
    setTimeout(() => { w.__collecting = false; }, warmup + measure);
    let last = performance.now();
    const tick = (t) => {
      if (w.__collecting) w.__frames.push(t - last);
      last = t;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [WARMUP_MS, MEASURE_MS]);

  // 圆周拖拽巡览（真实 OrbitControls 交互路径）。
  const box = await page.locator('.town3d canvas').boundingBox();
  if (!box) { console.error('no canvas box'); process.exit(1); }
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  const t0 = Date.now();
  const total = WARMUP_MS + MEASURE_MS;
  while (Date.now() - t0 < total) {
    const p = ((Date.now() - t0) / total) * Math.PI * 2 * 2; // 两圈
    await page.mouse.move(cx + Math.cos(p) * 160, cy + Math.sin(p) * 90, { steps: 4 });
    await page.waitForTimeout(16);
  }
  await page.mouse.up();

  const stat = await page.evaluate(() => {
    const f = (window.__frames ?? []).filter((d) => d > 0 && d < 200); // 剔除卡顿离群
    if (f.length < 60) return null;
    f.sort((a, b) => a - b);
    return {
      n: f.length,
      median: f[Math.floor(f.length / 2)],
      p95: f[Math.floor(f.length * 0.95)],
    };
  });
  if (!stat) { console.error('not enough frames collected'); process.exit(1); }
  console.log(`METRIC orbit_frame_ms=${stat.median.toFixed(2)}`);
  console.log(`frames=${stat.n} p95=${stat.p95.toFixed(2)}`);
} finally {
  await browser.close();
}
