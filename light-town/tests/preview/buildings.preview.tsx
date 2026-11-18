import { test } from 'vitest';
import { saveSheet, type SheetCell } from './render';
import { readFileSync } from 'node:fs';
import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Resvg } from '@resvg/resvg-js';
import { BuildingArt, BuildingSvg, DemoWindow, DistrictScene, DISTRICT_SLOTS, TownCelebration } from '../../src/art/buildings';
import { DISTRICTS } from '../../src/config/buildings';
import type { ThemeId } from '../../src/config/shop';
import { BUILDINGS } from '../../src/config/buildings';

const STAGES = [0, 1, 2, 3, 4, 5, 6];
const THEMES: ThemeId[] = ['warm', 'mint', 'berry'];
const ALL = BUILDINGS.map((b) => b.index);

function cell(index: number, stage: number, opts: { pending?: number; pendingMax?: number; theme?: ThemeId; animate?: boolean; celebrate?: boolean } = {}) {
  return (
    <BuildingSvg
      index={index}
      stage={stage}
      pending={opts.pending}
      pendingMax={opts.pendingMax}
      theme={opts.theme ?? 'warm'}
      animate={opts.animate ?? false}
      celebrate={opts.celebrate}
      title={`${BUILDINGS[index].name}，已点亮 ${stage}/6`}
    />
  );
}

test('buildings: all stages', () => {
  for (const [name, list] of [
    ['buildings-stages-a', ALL.slice(0, 6)],
    ['buildings-stages-b', ALL.slice(6)],
  ] as const) {
    const cells: SheetCell[] = [];
    for (const b of list) {
      for (const s of STAGES) cells.push({ element: cell(b, s), label: `${b} ${BUILDINGS[b].id} · ${s}/6` });
    }
    saveSheet(name, cells, { cols: 7, cellWidth: 210, cellHeight: 250 });
  }
});

test('buildings: pending light points', () => {
  const cells: SheetCell[] = [];
  for (const b of [0, 3, 4, 8, 9, 11]) {
    for (const p of [0, 1, 12, 24]) cells.push({ element: cell(b, 2, { pending: p }), label: `${b} stage 2 · pending ${p}` });
    cells.push({ element: cell(b, 5, { pending: 30, pendingMax: 40 }), label: `${b} stage 5 · 30/40` });
  }
  saveSheet('buildings-pending', cells, { cols: 5, cellWidth: 300, cellHeight: 356 });
  const zoom: SheetCell[] = [
    { element: cell(0, 2, { pending: 12 }), label: 'cottage 2/6 + 12 pending' },
    { element: cell(8, 3, { pending: 18, animate: true }), label: 'windmill 3/6 + 18 pending (anim)' },
    { element: cell(11, 4, { pending: 24 }), label: 'festival 4/6 + 24 pending' },
  ];
  saveSheet('buildings-pending-zoom', zoom, { cols: 3, cellWidth: 340, cellHeight: 404 });
});

test('buildings: themes at completion', () => {
  for (const [name, list] of [
    ['buildings-themes-a', ALL.slice(0, 6)],
    ['buildings-themes-b', ALL.slice(6)],
  ] as const) {
    const cells: SheetCell[] = [];
    for (const b of list) for (const t of THEMES) cells.push({ element: cell(b, 6, { theme: t }), label: `${b} · ${t}` });
    saveSheet(name, cells, { cols: 6, cellWidth: 250, cellHeight: 297 });
  }
});

test('buildings: animate off vs on (first frame) at completion', () => {
  const cells: SheetCell[] = [];
  for (const b of ALL) {
    cells.push({ element: cell(b, 6, { animate: false }), label: `${b} static` });
    cells.push({ element: cell(b, 6, { animate: true }), label: `${b} animated` });
  }
  saveSheet('buildings-animate', cells, { cols: 8, cellWidth: 200, cellHeight: 238 });
});

test('buildings: celebrate burst', () => {
  const cells: SheetCell[] = [];
  for (const b of [0, 5, 9, 11]) {
    cells.push({ element: cell(b, 6, { celebrate: true, animate: false }), label: `${b} celebrate static` });
    cells.push({ element: cell(b, 6, { celebrate: true, animate: true }), label: `${b} celebrate animated` });
  }
  saveSheet('buildings-celebrate', cells, { cols: 4, cellWidth: 260, cellHeight: 309 });
});

/** District scene with a debug overlay: anchor cross, ~70 px label zone, top 60 px band. */
function withGuides(d: number) {
  return (
    <svg viewBox="0 0 1200 720">
      <DistrictScene district={d} stages={[2, 4, 6]} current={2} theme="warm" animate={false} title={DISTRICTS[d].name} />
      {DISTRICT_SLOTS[d].map((s, i) => (
        <g key={i}>
          <rect x={s.x - 60} y={s.y + 8} width={120} height={62} fill="none" stroke="#FF5A8A" strokeDasharray="4 4" strokeWidth={2} />
          <path d={`M${s.x - 8},${s.y} h16 M${s.x},${s.y - 8} v16`} stroke="#FF5A8A" strokeWidth={2} />
        </g>
      ))}
      <rect x={0} y={0} width={1200} height={60} fill="#FF5A8A" opacity={0.12} />
    </svg>
  );
}

test('districts', () => {
  const variants: { stages: [number, number, number]; current: number | null; label: string; celebrate?: number }[] = [
    { stages: [0, 0, 0], current: 0, label: 'all dark, current slot 0' },
    { stages: [6, 3, 0], current: 1, label: 'mixed 6/3/0, current slot 1' },
    { stages: [6, 6, 6], current: null, label: 'complete' },
  ];
  DISTRICTS.forEach((dist) => {
    const cells: SheetCell[] = variants.map((v) => ({
      element: (
        <DistrictScene district={dist.index} stages={v.stages} current={v.current} theme="warm" animate={false} title={`${dist.name}：${v.label}`} />
      ),
      label: `${dist.index} ${dist.id} · ${v.label}`,
    }));
    saveSheet(`district-${dist.index}`, cells, { cols: 3, cellWidth: 900, cellHeight: 540, background: '#101C46', pngWidth: 2400 });
  });
  const guides: SheetCell[] = DISTRICTS.map((dist) => ({ element: withGuides(dist.index), label: `${dist.index} label zones` }));
  saveSheet('district-guides', guides, { cols: 2, cellWidth: 1200, cellHeight: 720, background: '#101C46', pngWidth: 2400 });
  DISTRICTS.forEach((dist) => {
    saveSheet(`district-${dist.index}-full`, [{ element: withGuides(dist.index) }], { cols: 1, cellWidth: 1200, cellHeight: 720, background: '#101C46' });
  });
});

test('districts: themes, animate first frame, celebrate', () => {
  const cells: SheetCell[] = [
    { element: <DistrictScene district={0} stages={[6, 6, 6]} theme="mint" animate={false} title="mint" />, label: '0 mint complete' },
    { element: <DistrictScene district={1} stages={[6, 6, 6]} theme="berry" animate={false} title="berry" />, label: '1 berry complete' },
    { element: <DistrictScene district={2} stages={[6, 6, 2]} current={2} theme="warm" animate title="anim" />, label: '2 animated first frame' },
    { element: <DistrictScene district={3} stages={[6, 6, 6]} celebrateSlot={2} theme="warm" animate={false} title="cel" />, label: '3 complete + celebrate (static)' },
  ];
  saveSheet('district-variants', cells, { cols: 2, cellWidth: 1000, cellHeight: 600, background: '#101C46', pngWidth: 2200 });
});

test('demo window', () => {
  const cells: SheetCell[] = [];
  for (const animate of [false, true]) {
    for (let lit = 0; lit <= 4; lit += 1) {
      cells.push({ element: <DemoWindow lit={lit} animate={animate} title={`示范窗 ${lit}/4`} />, label: `lit ${lit}${animate ? ' (anim)' : ''}` });
    }
  }
  saveSheet('demo-window', cells, { cols: 5, cellWidth: 240, cellHeight: 240 });
});

test('app icon', () => {
  const raw = readFileSync(new URL('../../public/icon.svg', import.meta.url), 'utf8');
  const inner = raw.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
  const icon = () => <svg viewBox="0 0 512 512" dangerouslySetInnerHTML={{ __html: inner }} />;
  saveSheet('icon-512', [{ element: icon(), label: '512' }], { cols: 1, cellWidth: 512, cellHeight: 512 });
  for (const s of [128, 64, 32]) {
    saveSheet(`icon-${s}`, [{ element: icon() }], { cols: 1, cellWidth: s, cellHeight: s, background: '#F2F2F2' });
  }
});

test('town celebration', () => {
  const cells: SheetCell[] = [
    { element: <TownCelebration theme="warm" animate={false} />, label: 'static garland (warm)' },
    { element: <TownCelebration theme="mint" animate={false} />, label: 'static garland (mint)' },
    { element: <TownCelebration theme="berry" animate />, label: 'animated, first frame (no CSS in resvg)' },
  ];
  saveSheet('town-celebration', cells, { cols: 3, cellWidth: 600, cellHeight: 360, background: '#16244F' });
});

test('buildings: body bounds and element counts', () => {
  const box = { x0: -110, y0: -280, x1: 110, y1: 30 };
  const view = { x0: -160, y0: -330, x1: 160, y1: 50 };
  const measure = (el: ReactElement) => {
    const svg = renderToStaticMarkup(
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="-400 -500 800 700" width={800} height={700}>
        {el}
      </svg>,
    );
    const b = new Resvg(svg).getBBox();
    const elements = (svg.match(/<(?!\/)[a-zA-Z]/g) ?? []).length - 1;
    return { x0: b?.x ?? 0, y0: b?.y ?? 0, x1: (b?.x ?? 0) + (b?.width ?? 0), y1: (b?.y ?? 0) + (b?.height ?? 0), elements };
  };
  const rows: string[] = [];
  for (const b of ALL) {
    const body = measure(<BuildingArt index={b} stage={0} theme="warm" animate={false} />);
    const full = measure(<BuildingArt index={b} stage={6} theme="warm" animate={false} celebrate />);
    const busy = measure(<BuildingArt index={b} stage={5} pending={24} theme="warm" animate />);
    const anim = measure(<BuildingArt index={b} stage={6} theme="warm" animate celebrate />);
    const bodyOk = body.x0 >= box.x0 && body.x1 <= box.x1 && body.y0 >= box.y0 && body.y1 <= box.y1;
    const fullOk = full.x0 >= view.x0 && full.x1 <= view.x1 && full.y0 >= view.y0 && full.y1 <= view.y1;
    rows.push(
      `${String(b).padStart(2)} ${BUILDINGS[b].id.padEnd(14)} body [${body.x0.toFixed(0)},${body.y0.toFixed(0)} → ${body.x1.toFixed(0)},${body.y1.toFixed(0)}] ${bodyOk ? 'ok' : 'OUT'}` +
        ` | stage6+effects [${full.x0.toFixed(0)},${full.y0.toFixed(0)} → ${full.x1.toFixed(0)},${full.y1.toFixed(0)}] ${fullOk ? 'ok' : b === 9 ? 'beam (allowed)' : 'OUT'}` +
        ` | elements dark ${body.elements} / done ${full.elements} / pending24+anim ${busy.elements} / done+anim ${anim.elements}`,
    );
  }
  console.log(rows.join('\n'));
});

test('buildings: card size (~90 px)', () => {
  const cells: SheetCell[] = [];
  for (const s of [0, 3, 6]) for (const b of ALL) cells.push({ element: cell(b, s), label: `${b}·${s}` });
  saveSheet('buildings-card-size', cells, { cols: 12, cellWidth: 76, cellHeight: 90 });
});
