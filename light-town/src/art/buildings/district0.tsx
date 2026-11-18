import type { ReactNode } from 'react';
import { DISTRICT_GROUND } from '../palette';
import { TONES, INK } from './materials';
import { line, n, pts } from './iso';
import type { DCtx, DistrictModule } from './island';
import { W, alongPath, barrel, bench, bush, dBox, flowers, groundPoly, islandBlock, lampPost, tree, worldBand } from './island';

/** 暖灯巷 Warm Lantern Lane: cobbled L-shaped lane, low brick walls, street lamps, a little well. */

const G = DISTRICT_GROUND[0];
const ISLAND: [number, number][] = [
  [-290, -250],
  [290, -250],
  [290, 250],
  [-230, 250],
  [-230, 190],
  [-290, 190],
];
const LANE: [number, number][] = [
  [-230, 231],
  [231, 231],
  [231, -33],
  [290, -33],
];
const LAMPS: [number, number, number][] = [
  [-200, 200, 2],
  [40, 205, 6],
  [264, 120, 10],
  [282, -150, 14],
];

function cobbles(): ReactNode {
  const out: ReactNode[] = [];
  for (let s = 0; s < LANE.length - 1; s += 1) {
    const a = LANE[s];
    const b = LANE[s + 1];
    const along = alongPath([a, b], 19, s === 0 ? 6 : 14);
    const dx = Math.sign(b[0] - a[0]);
    const dy = Math.sign(b[1] - a[1]);
    along.forEach(([x, y], i) => {
      for (const off of [-8, 8]) {
        const px = x + -dy * off + (off > 0 ? dx * 6 : 0);
        const py = y + dx * off + (off > 0 ? dy * 6 : 0);
        const [sx, sy] = W(px, py);
        out.push(<ellipse key={`${s}-${i}-${off}`} cx={n(sx)} cy={n(sy)} rx={6.6} ry={3.3} fill={(i + (off > 0 ? 1 : 0)) % 2 ? '#9886A6' : '#867495'} stroke="#5C4C70" strokeWidth={0.6} />);
      }
    });
  }
  return out;
}

function brickLines(x0: number, y0: number, x1: number, y1: number, h: number): ReactNode {
  const rows = [5, 10];
  return (
    <g stroke="#5E3F55" strokeWidth={0.8} opacity={0.5}>
      {rows.map((z) => (
        <path key={`l${z}`} d={line([W(x0, y1, z), W(x1, y1, z)])} />
      ))}
      {rows.map((z) => (
        <path key={`r${z}`} d={line([W(x1, y1, z), W(x1, y0, z)])} />
      ))}
      <path d={line([W(x0, y1, h), W(x1, y1, h)])} stroke={TONES.stone.top} strokeWidth={2} opacity={0.9} />
    </g>
  );
}

function well(): ReactNode {
  const [sx, sy] = W(150, 0);
  return (
    <g>
      <ellipse cx={n(sx)} cy={n(sy + 2)} rx={18} ry={8} fill="#141A3A" opacity={0.3} />
      <path d={`M${sx - 14},${sy - 12} L${sx - 14},${sy} A14,7 0 0 0 ${sx + 14},${sy} L${sx + 14},${sy - 12}Z`} fill={TONES.stone.left} stroke={TONES.stone.edge} strokeWidth={0.8} strokeOpacity={0.6} />
      <ellipse cx={sx} cy={sy - 12} rx={14} ry={7} fill={TONES.stone.top} />
      <ellipse cx={sx} cy={sy - 12} rx={10} ry={4.6} fill="#1B2B5A" />
      <path d={`M${sx - 12},${sy - 12} L${sx - 12},${sy - 38} M${sx + 12},${sy - 12} L${sx + 12},${sy - 38}`} stroke={TONES.wood.left} strokeWidth={2.4} />
      <path d={`M${sx - 18},${sy - 36} L${sx},${sy - 48} L${sx + 18},${sy - 36}Z`} fill={TONES.roofRed.left} stroke={TONES.roofRed.edge} strokeWidth={0.8} strokeOpacity={0.7} />
      <path d={`M${sx - 12},${sy - 30} L${sx + 12},${sy - 30} M${sx},${sy - 30} L${sx},${sy - 20}`} stroke={INK.rope} strokeWidth={1.1} />
      <path d={`M${sx - 3},${sy - 20} L${sx + 3},${sy - 20} L${sx + 2.5},${sy - 15} L${sx - 2.5},${sy - 15}Z`} fill={TONES.wood.top} />
    </g>
  );
}

function back(c: DCtx): ReactNode {
  const total = c.stages[0] + c.stages[1] + c.stages[2];
  return (
    <g>
      {islandBlock(ISLAND, 0, 50, G, 'island')}
      {groundPoly(
        [
          [-150, -200],
          [-40, -200],
          [-40, -120],
          [-150, -120],
        ],
        '#76628A',
        0,
        { opacity: 0.7 },
      )}
      {groundPoly(
        [
          [60, 20],
          [170, 20],
          [170, 60],
          [60, 60],
        ],
        '#76628A',
        0,
        { opacity: 0.7 },
      )}
      {dBox(-270, -246, 60, -236, 0, 16, TONES.brick, 'wallB')}
      {brickLines(-270, -246, 60, -236, 16)}
      {dBox(-282, -236, -272, 110, 0, 16, TONES.brick, 'wallL')}
      <g stroke="#5E3F55" strokeWidth={0.8} opacity={0.5}>
        {[5, 10].map((z) => (
          <path key={z} d={line([W(-272, 110, z), W(-272, -236, z)])} />
        ))}
      </g>
      {flowers(
        Array.from({ length: 10 }, (_, i) => [-250 + i * 30, -228] as [number, number]),
        'fl1',
      )}
      {dBox(-132, -172, -72, -152, 0, 7, TONES.wood, 'bed')}
      {flowers(
        Array.from({ length: 9 }, (_, i) => [-128 + i * 7, -162 + (i % 2) * 5] as [number, number]),
        'bedfl',
        7,
      )}
      {bush(-270, -150, 1.1, 'b0')}
      {bush(-120, -130, 1, 'b1')}
      {tree(-200, -60, 1.15, 't0')}
      {tree(-60, -222, 1.1, 't1')}
      {bush(60, -40, 1, 'b2', '#4DB59A')}
      {bush(268, -200, 1.1, 'b3')}
      <polygon points={pts(worldBand(LANE, 34))} fill="#7B6A8C" stroke="#A493B5" strokeWidth={1.2} strokeOpacity={0.5} strokeLinejoin="round" />
      {cobbles()}
      {well()}
      {barrel(-182, -200, 'br0')}
      {barrel(-166, -190, 'br1')}
      {barrel(-190, -184, 'br2')}
      {dBox(-140, -228, -118, -206, 0, 14, TONES.wood, 'crate0')}
      {dBox(-136, -224, -122, -210, 14, 24, TONES.sand, 'crate1')}
      {bench(-252, 172, 'bench')}
      {flowers(
        [
          [-262, 150],
          [-240, 150],
          [-230, 160],
          [265, 60],
          [270, 90],
          [262, 30],
          [-60, 160],
          [-40, 170],
          [-50, 150],
        ],
        'fl2',
      )}
      {LAMPS.map(([x, y, th], i) => lampPost(c, x, y, total >= th, i))}
    </g>
  );
}

export const lane: DistrictModule = { back };
