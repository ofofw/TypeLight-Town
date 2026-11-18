import { mkdirSync, writeFileSync } from 'node:fs';
import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { PREVIEW_DIR, saveSheet } from './render';
import { AccessoryIcon, HandsArt, PartnerArt } from '../../src/art/partners';
import type { PartnerPose } from '../../src/art/types';
import type { FingerId } from '../../src/config/keys';
import type { AccessorySlot, PartnerId } from '../../src/config/shop';
import { ACCESSORIES } from '../../src/config/shop';

const POSES: PartnerPose[] = ['idle', 'encourage', 'celebrate', 'guide'];
const IDS: PartnerId[] = ['nuannuan', 'manman', 'tiaotiao'];
const FINGERS: FingerId[] = ['L5', 'L4', 'L3', 'L2', 'R2', 'R3', 'R4', 'R5', 'RT'];
const CARD = '#24366F';
const PANEL = '#1B2A5E';

type Outfit = Partial<Record<AccessorySlot, string | null>>;

/** Three full sets: together every item is shown on every partner in every pose. */
const SETS: Array<{ name: string; equipped: Outfit }> = [
  { name: '30', equipped: { head: 'leaf-hat', scarf: 'scarf-orange', lamp: 'lamp-firefly' } },
  { name: '60', equipped: { head: 'star-hat', scarf: 'scarf-mint', lamp: 'lamp-flower' } },
  { name: '90', equipped: { head: 'moon-crown', scarf: 'scarf-night', lamp: 'lamp-planet' } },
];

const art = (id: PartnerId, pose: PartnerPose, equipped: Outfit = {}) => (
  <PartnerArt partner={id} pose={pose} equipped={equipped} animate={false} title={`${id} ${pose}`} />
);

describe('partners preview', () => {
  it('partners: poses, outfits, mixes', () => {
    saveSheet(
      'partners-poses',
      IDS.flatMap((id) => POSES.map((pose) => ({ element: art(id, pose), label: `${id} ${pose}` }))),
      { cols: 4, cellWidth: 240, cellHeight: 240, background: CARD },
    );
    for (const id of IDS) {
      saveSheet(
        `partners-zoom-${id}`,
        POSES.map((pose) => ({ element: art(id, pose), label: pose })),
        { cols: 2, cellWidth: 520, cellHeight: 520, background: CARD },
      );
      saveSheet(
        `partners-outfits-${id}`,
        SETS.flatMap((set) => POSES.map((pose) => ({ element: art(id, pose, set.equipped), label: `${set.name} ${pose}` }))),
        { cols: 4, cellWidth: 300, cellHeight: 300, background: CARD },
      );
      saveSheet(
        `partners-outfits-zoom-${id}`,
        POSES.map((pose, i) => {
          const set = SETS[(i + 1) % SETS.length];
          return { element: art(id, pose, set.equipped), label: `${set.name} ${pose}` };
        }),
        { cols: 2, cellWidth: 520, cellHeight: 520, background: CARD },
      );
    }
    const mixes: Array<{ name: string; equipped: Outfit }> = [
      { name: 'head only', equipped: { head: 'moon-crown' } },
      { name: 'scarf only', equipped: { scarf: 'scarf-night' } },
      { name: 'lamp only', equipped: { lamp: 'lamp-planet' } },
      { name: 'mixed', equipped: { head: 'star-hat', scarf: 'scarf-orange', lamp: 'lamp-firefly' } },
      { name: 'mixed 2', equipped: { head: 'leaf-hat', scarf: 'scarf-night', lamp: 'lamp-flower' } },
      { name: 'invalid ids', equipped: { head: 'scarf-mint', scarf: 'nope', lamp: null } },
    ];
    saveSheet(
      'partners-mixed',
      IDS.flatMap((id, k) => mixes.map((m, i) => ({ element: art(id, POSES[(i + k) % 4], m.equipped), label: `${m.name}` }))),
      { cols: 6, cellWidth: 200, cellHeight: 200, background: CARD },
    );
  });

  it('partners: faces and small sizes', () => {
    const crops: Record<PartnerId, string> = {
      nuannuan: '62 56 116 116',
      manman: '62 62 116 116',
      tiaotiao: '62 64 116 116',
    };
    saveSheet(
      'partners-faces',
      IDS.flatMap((id) =>
        POSES.map((pose) => ({
          element: (
            <svg viewBox={crops[id]}>
              <svg x={0} y={0} width={240} height={240} viewBox="0 0 240 240">
                {art(id, pose)}
              </svg>
            </svg>
          ),
          label: `${id} ${pose}`,
        })),
      ),
      { cols: 4, cellWidth: 240, cellHeight: 240, background: CARD },
    );
    saveSheet(
      'partners-96',
      IDS.flatMap((id) => [
        ...POSES.map((pose) => ({ element: art(id, pose) })),
        ...POSES.map((pose, i) => ({ element: art(id, pose, SETS[i % 3].equipped) })),
      ]),
      { cols: 8, cellWidth: 96, cellHeight: 96, background: CARD },
    );
  });

  it('partners: accessory icons', () => {
    const slots: AccessorySlot[] = ['head', 'scarf', 'lamp'];
    const cells = slots.flatMap((slot) => [
      { element: <AccessoryIcon id={null} slot={slot} title={`不戴${slot}`} />, label: `none ${slot}` },
      ...ACCESSORIES.filter((a) => a.slot === slot).map((a) => ({
        element: <AccessoryIcon id={a.id} slot={slot} title={a.name} />,
        label: `${a.id} ${a.price}`,
      })),
    ]);
    saveSheet('partners-icons', cells, { cols: 4, cellWidth: 192, cellHeight: 192, background: CARD });
    saveSheet(
      'partners-icons-96',
      cells.map((c) => ({ element: c.element })),
      { cols: 12, cellWidth: 96, cellHeight: 96, background: CARD },
    );
  });

  it('partners: hands', () => {
    const cell = (finger: FingerId | null, emphasis: boolean, keys: boolean) => ({
      element: <HandsArt finger={finger} emphasis={emphasis} showHomeKeys={keys} animate={false} title={finger ?? 'none'} />,
      label: `${finger ?? 'none'}${emphasis ? ' emphasis' : ''}${keys ? ' keys' : ''}`,
    });
    const opts = { cols: 2, cellWidth: 480, cellHeight: 240, background: PANEL };
    saveSheet('partners-hands-left', FINGERS.slice(0, 4).flatMap((f) => [cell(f, false, true), cell(f, true, true)]), opts);
    saveSheet('partners-hands-right', FINGERS.slice(4).flatMap((f) => [cell(f, false, true), cell(f, true, true)]), opts);
    saveSheet(
      'partners-hands-nokeys',
      [cell(null, false, true), cell(null, false, false), ...FINGERS.flatMap((f) => [cell(f, false, false), cell(f, true, false)])],
      opts,
    );
    saveSheet('partners-hands-zoom', [cell('L2', false, true), cell('RT', true, true)], {
      cols: 1,
      cellWidth: 960,
      cellHeight: 480,
      background: PANEL,
    });
  });

  it('partners: markup contract', () => {
    const roots = [
      renderToStaticMarkup(<PartnerArt partner="manman" pose="celebrate" equipped={{ head: 'star-hat' }} animate={false} title="慢慢" />),
      renderToStaticMarkup(<AccessoryIcon id={null} slot="lamp" title="不戴随行灯" />),
      renderToStaticMarkup(<HandsArt finger="RT" emphasis showHomeKeys animate={false} title="拇指" />),
    ];
    for (const m of roots) {
      const open = m.match(/^<svg\b[^>]*>/)?.[0] ?? '';
      expect(open).toMatch(/role="img"/);
      expect(open).toMatch(/aria-label="[^"]+"/);
      expect(open).not.toMatch(/\s(width|height)=/);
      expect(m.slice(open.length)).toMatch(/^<title>[^<]+<\/title>/);
      expect(m).not.toContain('<style');
      expect(m).not.toMatch(/class="/);
    }
    const twoCards = renderToStaticMarkup(
      <>
        {IDS.map((id) => (
          <PartnerArt key={id} partner={id} pose="idle" equipped={SETS[2].equipped} animate title={id} />
        ))}
        <HandsArt finger="L2" emphasis animate title="L2" />
        <HandsArt finger="R2" emphasis animate title="R2" />
      </>,
    );
    const ids = [...twoCards.matchAll(/ id="([^"]+)"/g)].map((x) => x[1]);
    expect(ids.length).toBeGreaterThan(0);
    expect(new Set(ids).size).toBe(ids.length);
    expect(twoCards).toContain('<style');
    expect(twoCards).toMatch(/class="lt[a-zA-Z0-9_-]+-breathe"/);
  });

  it('partners: animation filmstrip (html; resvg ignores CSS animation)', () => {
    const frames = [0, 0.3, 0.6, 1.0, 1.6, 2.4, 3.97];
    const cases: Array<{ name: string; el: ReactElement }> = [
      ...IDS.flatMap((id) =>
        POSES.map((pose) => ({
          name: `${id} ${pose}`,
          el: <PartnerArt partner={id} pose={pose} equipped={SETS[2].equipped} animate title={pose} />,
        })),
      ),
      { name: 'hands R3 emphasis', el: <HandsArt finger="R3" emphasis animate showHomeKeys title="R3" /> },
    ];
    const css = [
      'body{background:#24366F;margin:0;padding:8px;font:11px Helvetica,Arial,sans-serif;color:#F7F2E6}',
      '.row{display:flex;gap:6px;margin-bottom:4px}',
      '.cell{width:132px}.cell svg{width:132px;height:132px;display:block}',
      '.wide .cell,.cell.wide{width:200px}.wide .cell svg,.cell.wide svg{width:200px;height:100px}',
      ...frames.map((t, i) => `.f${i} *{animation-delay:-${t}s !important;animation-play-state:paused !important}`),
    ].join('');
    const wide = (name: string) => name.startsWith('hands');
    const live =
      '<p>Live (open this file in a browser):</p><div class="row" style="flex-wrap:wrap">' +
      cases.map((c) => `<div class="cell${wide(c.name) ? ' wide' : ''}">${renderToStaticMarkup(c.el)}<div>${c.name}</div></div>`).join('') +
      '</div><p>Frozen frames (seconds into each animation):</p>';
    const rows = cases.map(
      (c) =>
        `<div class="row${wide(c.name) ? ' wide' : ''}">` +
        frames.map((t, i) => `<div class="cell f${i}">${renderToStaticMarkup(c.el)}<div>${c.name} t=${t}</div></div>`).join('') +
        '</div>',
    );
    mkdirSync(PREVIEW_DIR, { recursive: true });
    writeFileSync(
      `${PREVIEW_DIR}/partners-anim.html`,
      `<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body>${live}${rows.join('')}</body></html>`,
    );
  });
});
