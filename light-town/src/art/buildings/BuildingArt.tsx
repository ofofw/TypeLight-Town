import { useId } from 'react';
import type { ReactNode } from 'react';
import type { BuildingArtProps, BuildingSvgProps } from '../types';
import { PENDING_LIGHT, THEME_LIGHTS } from '../palette';
import type { BuildingModule, Kit } from './kit';
import { dotPositions, shapeEl } from './parts';
import { n, sparklePath, splitRgba } from './iso';
import { BUILDING_MODULES } from './registry';

export const BUILDING_BOX = { x: -110, y: -280, width: 220, height: 310 } as const;
export const BUILDING_VIEWBOX = { x: -160, y: -330, width: 320, height: 380 } as const;

/** Body top (most negative local y) of each building, for markers placed above it. */
export function buildingTop(index: number): number {
  return moduleFor(index).top;
}

function moduleFor(index: number): BuildingModule {
  const i = Math.min(BUILDING_MODULES.length - 1, Math.max(0, Math.floor(index)));
  return BUILDING_MODULES[i];
}

function baseCss(u: string): string {
  return `
.${u}-tw{animation:${u}-tw 2.6s ease-in-out infinite}
@keyframes ${u}-tw{0%,100%{opacity:1}50%{opacity:.45}}
.${u}-pd{transform-box:fill-box;transform-origin:50% 50%;animation:${u}-pop .45s ease-out 1 both,${u}-tw 2.6s ease-in-out infinite}
@keyframes ${u}-pop{0%{transform:scale(0)}60%{transform:scale(1.5)}100%{transform:scale(1)}}
.${u}-pdash{animation:${u}-pdash 3s ease-in-out infinite}
@keyframes ${u}-pdash{0%,100%{opacity:1}50%{opacity:.55}}
.${u}-cring{transform-box:view-box;transform-origin:0 0;animation:${u}-cring 1.6s ease-out 1 forwards}
@keyframes ${u}-cring{0%{transform:scale(.25);opacity:0}18%{opacity:1}100%{transform:scale(1.55);opacity:0}}
.${u}-cfly{transform-box:view-box;transform-origin:0 0;animation:${u}-cfly 1.7s cubic-bezier(.2,.7,.3,1) 1 forwards}
@keyframes ${u}-cfly{0%{transform:translate(10px,0) scale(.3);opacity:0}20%{opacity:1}75%{opacity:1}100%{transform:translate(118px,0) scale(1);opacity:0}}
.${u}-cflyb{transform-box:view-box;transform-origin:0 0;animation:${u}-cfly2 1.5s cubic-bezier(.2,.7,.3,1) .15s 1 both}
@keyframes ${u}-cfly2{0%{transform:translate(6px,0) scale(.3);opacity:0}25%{opacity:1}70%{opacity:1}100%{transform:translate(72px,0) scale(.9);opacity:0}}
`;
}

function discs(pos: readonly (readonly [number, number])[], r: number): string {
  return pos.map(([x, y]) => `M${n(x - r)},${n(y)}a${n(r)},${n(r)} 0 1 0 ${n(2 * r)},0a${n(r)},${n(r)} 0 1 0 ${n(-2 * r)},0`).join('');
}

function Pending({ k, m, count, max }: { k: Kit; m: BuildingModule; count: number; max: number }): ReactNode {
  const e = m.elems[k.stage];
  if (!e) return null;
  const pos = dotPositions(e, max).slice(0, count);
  const tight = max > 24 ? Math.max(1.6, 2.7 * Math.sqrt(24 / max)) : 2.7;
  return (
    <g>
      <g className={k.cls('pdash')}>
        {shapeEl(e.s, { fill: 'none', stroke: 'rgba(20, 28, 66, 0.55)', strokeWidth: 3.6, strokeLinejoin: 'round' }, 2.5)}
        {shapeEl(
          e.s,
          { fill: 'none', stroke: PENDING_LIGHT.outline, strokeWidth: 1.8, strokeDasharray: '3.5 3', strokeLinecap: 'round', strokeLinejoin: 'round' },
          2.5,
        )}
      </g>
      <path d={discs(pos, tight * 2.5)} fill={PENDING_LIGHT.dot} opacity={0.14} />
      <path d={discs(pos, tight * 1.7)} fill={PENDING_LIGHT.dot} opacity={0.22} />
      {pos.map((p, i) => (
        <circle
          key={i}
          cx={n(p[0])}
          cy={n(p[1])}
          r={n(tight)}
          fill={PENDING_LIGHT.dot}
          stroke="rgba(30, 36, 80, 0.55)"
          strokeWidth={0.7}
          className={k.cls('pd')}
          style={k.animate ? { animationDelay: `0s, ${n(-((i * 0.37) % 2.6))}s` } : undefined}
        />
      ))}
    </g>
  );
}

function Burst({ k, m }: { k: Kit; m: BuildingModule }): ReactNode {
  const [cx, cy] = m.burst;
  const rays = 10;
  if (!k.animate) {
    const spots: [number, number, number][] = [
      [-78, -40, 7],
      [80, -58, 8],
      [-60, -120, 6],
      [66, -128, 7],
      [-90, 20, 5],
      [92, 4, 6],
    ];
    return (
      <g>
        {spots.map(([dx, dy, r], i) => (
          <path key={i} d={sparklePath(r)} transform={`translate(${n(cx + dx)} ${n(cy + dy)})`} fill={k.L.core} stroke={k.L.glow} strokeWidth={0.8} />
        ))}
      </g>
    );
  }
  return (
    <g>
      <g transform={`translate(${n(cx)} ${n(cy)})`}>
        <g className={k.cls('cring')}>
          <ellipse rx={90} ry={70} fill="none" stroke={k.L.light} strokeWidth={3} strokeOpacity={0.8} />
          <ellipse rx={84} ry={64} fill="none" stroke={k.L.core} strokeWidth={1.2} strokeOpacity={0.7} />
        </g>
      </g>
      {Array.from({ length: rays }, (_, i) => {
        const a = (360 * i) / rays - 90 + (i % 2) * 8;
        return (
          <g key={i} transform={`translate(${n(cx)} ${n(cy)}) rotate(${n(a)})`}>
            <g className={k.cls(i % 2 ? 'cflyb' : 'cfly')}>
              <path d={sparklePath(i % 2 ? 6 : 8)} fill={i % 3 === 0 ? k.L.core : k.L.light} stroke={k.L.glow} strokeWidth={0.6} />
            </g>
          </g>
        );
      })}
    </g>
  );
}

export function BuildingArt(props: BuildingArtProps) {
  const raw = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const u = `lt${raw}`;
  const m = moduleFor(props.index);
  const stage = Math.min(6, Math.max(0, Math.floor(props.stage)));
  const animate = props.animate;
  const L = THEME_LIGHTS[props.theme] ?? THEME_LIGHTS.warm;
  const k: Kit = {
    u,
    stage,
    done: stage >= 6,
    animate,
    L,
    lit: (i) => i < stage,
    id: (name) => `${u}-${name}`,
    url: (name) => `url(#${u}-${name})`,
    cls: (name) => (animate ? `${u}-${name}` : undefined),
  };
  const max = Math.max(1, Math.floor(props.pendingMax ?? 24));
  const count = stage < 6 ? Math.min(max, Math.max(0, Math.floor(props.pending ?? 0))) : 0;
  const halo = splitRgba(L.halo);
  return (
    <g>
      <defs>
        <radialGradient id={k.id('lit')} cx="50%" cy="42%" r="68%">
          <stop offset="0" stopColor={L.core} />
          <stop offset="0.5" stopColor={L.light} />
          <stop offset="1" stopColor={L.glow} />
        </radialGradient>
        <linearGradient id={k.id('litV')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={L.core} />
          <stop offset="0.55" stopColor={L.light} />
          <stop offset="1" stopColor={L.glow} />
        </linearGradient>
        <radialGradient id={k.id('halo')}>
          <stop offset="0" stopColor={halo.color} stopOpacity={n(Math.min(0.95, halo.opacity * 1.9))} />
          <stop offset="0.45" stopColor={halo.color} stopOpacity={n(halo.opacity * 0.9)} />
          <stop offset="1" stopColor={halo.color} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={k.id('spill')}>
          <stop offset="0" stopColor={L.light} stopOpacity="0.5" />
          <stop offset="0.55" stopColor={halo.color} stopOpacity={n(halo.opacity * 0.8)} />
          <stop offset="1" stopColor={halo.color} stopOpacity="0" />
        </radialGradient>
      </defs>
      {animate ? <style>{baseCss(u) + (m.css ? m.css(u) : '')}</style> : null}
      {k.done ? (
        <ellipse cx={n(m.spill.cx)} cy={n(m.spill.cy)} rx={n(m.spill.rx)} ry={n(m.spill.ry)} fill={k.url('spill')} />
      ) : null}
      {m.draw(k)}
      {count > 0 ? <Pending k={k} m={m} count={count} max={max} /> : null}
      {props.celebrate ? <Burst k={k} m={m} /> : null}
    </g>
  );
}

export function BuildingSvg({ title, className, ...art }: BuildingSvgProps) {
  const v = BUILDING_VIEWBOX;
  return (
    <svg viewBox={`${v.x} ${v.y} ${v.width} ${v.height}`} className={className} role="img" aria-label={title}>
      <title>{title}</title>
      <BuildingArt {...art} />
    </svg>
  );
}
