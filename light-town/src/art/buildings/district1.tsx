import type { ReactNode } from 'react';
import { ACCENT, DISTRICT_GROUND } from '../palette';
import { TONES, INK } from './materials';
import { line, n, pts } from './iso';
import type { Pt } from './iso';
import type { DCtx, DistrictModule } from './island';
import { W, alongPath, bush, flowers, grass, islandBlock, lampPost, tree, worldBand } from './island';

/** 溪桥街 Creek Bridge Street: a creek winds across the street under an arched wooden bridge. */

const G = DISTRICT_GROUND[1];
const ISLAND: [number, number][] = [
  [-300, -240],
  [280, -240],
  [280, 240],
  [-230, 240],
  [-230, 170],
  [-300, 170],
];
const CREEK: [number, number][] = [
  [-110, -240],
  [-60, -130],
  [-25, -40],
  [-20, 60],
  [-5, 100],
  [40, 150],
  [100, 195],
  [120, 240],
];
const PATH_A: [number, number][] = [
  [-100, 232],
  [-62, 232],
  [-62, 80],
  [-50, 80],
];
const PATH_B: [number, number][] = [
  [25, 80],
  [130, 80],
  [130, -10],
  [280, -10],
];
const BRIDGE = { x0: -50, x1: 25, y0: 68, y1: 92, rise: 15 };

function bridge(c: DCtx): ReactNode {
  const { x0, x1, y0, y1, rise } = BRIDGE;
  const steps = 10;
  const z = (x: number) => 3 + rise * Math.sin((Math.PI * (x - x0)) / (x1 - x0));
  const xs = Array.from({ length: steps + 1 }, (_, i) => x0 + ((x1 - x0) * i) / steps);
  const wood = TONES.wood;
  const side: Pt[] = [...xs.map((x) => W(x, y1, z(x))), ...xs
    .slice()
    .reverse()
    .map((x) => W(x, y1, z(x) - 5))];
  const railF = xs.map((x) => W(x, y1, z(x) + 11));
  const railB = xs.map((x) => W(x, y0, z(x) + 11));
  const total = c.stages[0] + c.stages[1] + c.stages[2];
  return (
    <g>
      <path d={line(railB)} fill="none" stroke={wood.edge} strokeWidth={2} opacity={0.7} />
      {[0, 5, 10].map((i) => (
        <path key={i} d={line([W(xs[i], y0, z(xs[i])), W(xs[i], y0, z(xs[i]) + 11)])} stroke={wood.left} strokeWidth={2.4} />
      ))}
      {xs.slice(0, -1).map((x, i) => (
        <polygon
          key={i}
          points={pts([W(x, y0, z(x)), W(xs[i + 1], y0, z(xs[i + 1])), W(xs[i + 1], y1, z(xs[i + 1])), W(x, y1, z(x))])}
          fill={i % 2 ? wood.top : '#9C8197'}
          stroke={wood.right}
          strokeWidth={0.6}
        />
      ))}
      <polygon points={pts(side)} fill={wood.left} stroke={wood.edge} strokeWidth={0.8} strokeOpacity={0.6} />
      {[0, 2.5, 5, 7.5, 10].map((i) => {
        const x = xs[Math.round(i)];
        return <path key={i} d={line([W(x, y1, z(x)), W(x, y1, z(x) + 11)])} stroke={wood.left} strokeWidth={2.6} />;
      })}
      <path d={line(railF)} fill="none" stroke={wood.top} strokeWidth={2.6} strokeLinecap="round" />
      {lampPost(c, x0 - 2, y1 + 3, total >= 3, 'bl', 40, 3)}
      {lampPost(c, x1 + 2, y1 + 3, total >= 9, 'br', 40, 3)}
    </g>
  );
}

function creekWater(c: DCtx): ReactNode {
  const band = worldBand(CREEK, 36);
  const inner = worldBand(CREEK, 22);
  const shine = alongPath(CREEK, 46, 20);
  const fall: Pt[] = [W(103, 240, 0), W(137, 240, 0), W(137, 240, -50), W(103, 240, -50)];
  return (
    <g>
      <polygon points={pts(worldBand(CREEK, 46))} fill="#2E6258" />
      <polygon points={pts(band)} fill={c.url('water')} />
      <polygon points={pts(inner)} fill="#3B86B0" opacity={0.55} />
      <g className={c.cls('shimmer')}>
        {shine.map(([x, y], i) => {
          const [sx, sy] = W(x, y);
          return <path key={i} d={`M${n(sx - 7)},${n(sy)} L${n(sx + 7)},${n(sy)}`} stroke={ACCENT.tealPale} strokeWidth={1.4} strokeLinecap="round" opacity={0.7} />;
        })}
      </g>
      {[
        [-52, -118],
        [-14, 8],
        [64, 166],
      ].map(([x, y], i) => {
        const [sx, sy] = W(x, y);
        return (
          <g key={i}>
            <ellipse cx={n(sx)} cy={n(sy)} rx={7} ry={3.4} fill="#4DB59A" />
            <path d={`M${n(sx)},${n(sy)} L${n(sx + 6)},${n(sy - 1.5)}`} stroke="#2C7D6E" strokeWidth={1.2} />
            {i === 1 ? <circle cx={n(sx - 2)} cy={n(sy - 2)} r={2} fill={INK.flagA} /> : null}
          </g>
        );
      })}
      <polygon points={pts(fall)} fill="#3B86B0" opacity={0.9} />
      <g className={c.cls('shimmer')} stroke={ACCENT.tealPale} strokeWidth={1.3} strokeLinecap="round" opacity={0.75}>
        {[0.25, 0.5, 0.75].map((f, i) => {
          const x = 103 + 34 * f;
          return <path key={i} d={line([W(x, 240, -4 - i * 3), W(x, 240, -42 + i * 4)])} />;
        })}
      </g>
      <ellipse cx={n(W(120, 240, -54)[0])} cy={n(W(120, 240, -54)[1])} rx={22} ry={7} fill={ACCENT.tealPale} opacity={0.35} />
    </g>
  );
}

function reeds(): ReactNode {
  const spots: [number, number][] = [
    [-68, -200],
    [-40, -150],
    [8, -60],
    [12, 40],
    [-28, 118],
    [45, 118],
    [130, 205],
  ];
  return spots.map(([x, y], i) => {
    const [sx, sy] = W(x, y);
    return (
      <g key={i} stroke="#4DB59A" strokeWidth={1.4} strokeLinecap="round">
        <path d={`M${n(sx)},${n(sy)} L${n(sx - 2)},${n(sy - 14)} M${n(sx + 3)},${n(sy)} L${n(sx + 4)},${n(sy - 11)} M${n(sx - 3)},${n(sy)} L${n(sx - 6)},${n(sy - 9)}`} />
        <path d={`M${n(sx - 2)},${n(sy - 14)} L${n(sx - 2.4)},${n(sy - 19)}`} stroke={INK.trunk} strokeWidth={3} />
      </g>
    );
  });
}

function back(c: DCtx): ReactNode {
  const total = c.stages[0] + c.stages[1] + c.stages[2];
  return (
    <g>
      {islandBlock(ISLAND, 0, 50, G, 'island')}
      {grass(
        [
          [-250, -180],
          [-200, -20],
          [-140, -150],
          [60, -180],
          [180, -150],
          [240, 60],
          [200, 200],
          [-170, 120],
          [90, -90],
          [-260, 100],
        ],
        'g0',
      )}
      {tree(-180, -200, 1.1, 't0')}
      {tree(-230, -100, 1.2, 't1')}
      {tree(0, -230, 1.05, 't2')}
      {tree(250, -222, 1.15, 't3')}
      {tree(-262, 60, 1, 't4')}
      {bush(-150, -40, 1.1, 'b0')}
      {bush(200, -215, 1, 'b1', '#4DB59A')}
      <polygon points={pts(worldBand(PATH_A, 28))} fill="#7E9585" stroke="#A4BBA9" strokeWidth={1} strokeOpacity={0.45} strokeLinejoin="round" />
      <polygon points={pts(worldBand(PATH_B, 28))} fill="#7E9585" stroke="#A4BBA9" strokeWidth={1} strokeOpacity={0.45} strokeLinejoin="round" />
      {creekWater(c)}
      {reeds()}
      {bridge(c)}
      {flowers(
        [
          [-205, 225],
          [-190, 232],
          [-215, 205],
          [-80, -200],
          [-70, -180],
          [10, -120],
          [24, -100],
          [160, 140],
          [176, 152],
          [252, 120],
        ],
        'fl',
      )}
      {lampPost(c, 152, -38, total >= 15, 'l3')}
    </g>
  );
}

function front(): ReactNode {
  return <g>{bush(222, 162, 1, 'bf')}</g>;
}

export const creek: DistrictModule = { back, front };
