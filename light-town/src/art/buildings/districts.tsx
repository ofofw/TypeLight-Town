import { useId } from 'react';
import type { DistrictSceneProps, DistrictSlot } from '../types';
import { PENDING_LIGHT, THEME_LIGHTS, UI } from '../palette';
import { n, splitRgba } from './iso';
import type { DCtx, DistrictModule } from './island';
import { currentMarker } from './island';
import { BuildingArt, buildingTop } from './BuildingArt';
import { lane } from './district0';
import { creek } from './district1';
import { slope } from './district2';
import { harbour } from './district3';

export const DISTRICT_VIEWBOX = { width: 1200, height: 720 } as const;

/** Building anchors (footprint centre) per district, in slot order. */
export const DISTRICT_SLOTS: readonly (readonly DistrictSlot[])[] = [
  [
    { x: 330, y: 425, scale: 1.4 },
    { x: 610, y: 540, scale: 1.4 },
    { x: 890, y: 430, scale: 1.4 },
  ],
  [
    { x: 310, y: 440, scale: 1.4 },
    { x: 650, y: 440, scale: 1.2 },
    { x: 905, y: 470, scale: 1.35 },
  ],
  [
    { x: 290, y: 440, scale: 1.35 },
    { x: 620, y: 440, scale: 1.35 },
    { x: 930, y: 375, scale: 1.25 },
  ],
  [
    { x: 270, y: 435, scale: 1.2 },
    { x: 600, y: 560, scale: 1.35 },
    { x: 920, y: 450, scale: 1.35 },
  ],
];

const MODULES: readonly DistrictModule[] = [lane, creek, slope, harbour];

function css(u: string): string {
  return `
.${u}-twinkle{animation:${u}-tw 4s ease-in-out infinite}
@keyframes ${u}-tw{0%,100%{opacity:1}50%{opacity:.3}}
.${u}-ringPulse{transform-box:view-box;transform-origin:0 0;animation:${u}-ring 2.6s ease-in-out infinite}
@keyframes ${u}-ring{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.62;transform:scale(1.05)}}
.${u}-bob{transform-box:view-box;transform-origin:0 0;animation:${u}-bob 2.4s ease-in-out infinite}
@keyframes ${u}-bob{0%,100%{transform:translate(0,0)}50%{transform:translate(0,-7px)}}
.${u}-shimmer{animation:${u}-sh 3.8s ease-in-out infinite}
@keyframes ${u}-sh{0%,100%{opacity:.85}50%{opacity:.35}}
.${u}-drift{transform-box:view-box;transform-origin:0 0;animation:${u}-drift 6s ease-in-out infinite}
@keyframes ${u}-drift{0%,100%{transform:translate(0,0)}50%{transform:translate(6px,0)}}
`;
}

export function DistrictScene(props: DistrictSceneProps) {
  const raw = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const u = `ld${raw}`;
  const d = Math.min(3, Math.max(0, Math.floor(props.district)));
  const L = THEME_LIGHTS[props.theme] ?? THEME_LIGHTS.warm;
  const animate = props.animate;
  const stages = props.stages.map((s) => Math.min(6, Math.max(0, Math.floor(s)))) as unknown as readonly [number, number, number];
  const c: DCtx = {
    u,
    L,
    animate,
    stages,
    id: (name) => `${u}-${name}`,
    url: (name) => `url(#${u}-${name})`,
    cls: (name) => (animate ? `${u}-${name}` : undefined),
  };
  const slots = DISTRICT_SLOTS[d];
  const order = [0, 1, 2].sort((a, b) => slots[a].y - slots[b].y);
  const cur = props.current ?? null;
  const halo = splitRgba(L.halo);
  const mod = MODULES[d];
  return (
    <svg viewBox="0 0 1200 720" preserveAspectRatio="xMidYMid meet" className={props.className} role="img" aria-label={props.title}>
      <title>{props.title}</title>
      <defs>
        <radialGradient id={c.id('halo')}>
          <stop offset="0" stopColor={halo.color} stopOpacity={n(Math.min(0.95, halo.opacity * 1.9))} />
          <stop offset="0.45" stopColor={halo.color} stopOpacity={n(halo.opacity * 0.9)} />
          <stop offset="1" stopColor={halo.color} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={c.id('spill')}>
          <stop offset="0" stopColor={L.light} stopOpacity="0.45" />
          <stop offset="1" stopColor={halo.color} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={c.id('ring')}>
          <stop offset="0" stopColor={PENDING_LIGHT.outline} stopOpacity="0.42" />
          <stop offset="0.7" stopColor={UI.focus} stopOpacity="0.16" />
          <stop offset="1" stopColor={UI.focus} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={c.id('water')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2B6CA0" />
          <stop offset="1" stopColor="#1C3F73" />
        </linearGradient>
        <radialGradient id={c.id('moon')}>
          <stop offset="0" stopColor="#FFF0C2" stopOpacity="0.55" />
          <stop offset="1" stopColor="#FFF0C2" stopOpacity="0" />
        </radialGradient>
      </defs>
      {animate ? <style>{css(u)}</style> : null}
      {mod.back(c)}
      {cur !== null && cur >= 0 && cur <= 2 ? currentMarker(c, slots[cur].x, slots[cur].y, slots[cur].scale, 0, 'ring') : null}
      {order.map((i) => (
        <g key={i} transform={`translate(${slots[i].x} ${slots[i].y}) scale(${slots[i].scale})`}>
          <BuildingArt index={d * 3 + i} stage={stages[i]} theme={props.theme} animate={animate} celebrate={props.celebrateSlot === i} />
        </g>
      ))}
      {mod.front ? mod.front(c) : null}
      {cur !== null && cur >= 0 && cur <= 2
        ? currentMarker(c, slots[cur].x, slots[cur].y, slots[cur].scale, buildingTop(d * 3 + cur), 'float')
        : null}
    </svg>
  );
}
