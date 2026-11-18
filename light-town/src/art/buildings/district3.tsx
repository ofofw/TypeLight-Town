import type { ReactNode } from 'react';
import { ACCENT, DISTRICT_GROUND, SKY } from '../palette';
import { TONES } from './materials';
import { line, n, pts } from './iso';
import type { DCtx, DistrictModule, GroundTone } from './island';
import { W, barrel, bush, dBox, groundPoly, islandBlock, lampPost, localStars, tree, worldBand } from './island';

/** 月湾港 Moon Bay Harbour: moonlit sea, sandy coast, the lighthouse rock and a festival plaza. */

const G = DISTRICT_GROUND[3];
const SEA_Z = -10;
const SEA_TONE: GroundTone = { top: G.top, left: G.left, right: G.right, accent: '#7FB8D8' };
const FULL: [number, number][] = [
  [-300, -240],
  [290, -240],
  [290, 250],
  [-300, 250],
];
const LAND: [number, number][] = [
  [-180, -240],
  [290, -240],
  [290, 100],
  [40, 100],
  [40, 140],
  [-180, 140],
];
const COAST: [number, number][] = [
  [290, 88],
  [50, 88],
  [50, 126],
  [-180, 126],
];
const MOON = { x: 120, y: 125, r: 30 };

function seaDetails(c: DCtx, lit: boolean): ReactNode {
  const streaks = Array.from({ length: 8 }, (_, i) => {
    const y = 345 + i * 12;
    const w = 8 + i * 3.2;
    return <path key={i} d={`M${n(MOON.x + 12 - w)},${y} L${n(MOON.x + 12 + w)},${y}`} stroke="#FFF0C2" strokeWidth={2} strokeLinecap="round" opacity={0.75 - i * 0.06} />;
  });
  const waves: [number, number][] = [
    [-60, 232],
    [10, 196],
    [250, 215],
    [262, 168],
    [-250, -120],
    [-230, 60],
    [-280, 170],
    [-40, 160],
  ];
  const buoy = W(-20, 230, SEA_Z);
  return (
    <g>
      <ellipse cx={MOON.x + 12} cy={392} rx={46} ry={34} fill={c.url('moon')} />
      <g className={c.cls('shimmer')}>{streaks}</g>
      <g fill="none" stroke="#7FB8D8" strokeWidth={1.3} strokeLinecap="round" opacity={0.55}>
        {waves.map(([x, y], i) => {
          const [sx, sy] = W(x, y, SEA_Z);
          return <path key={i} d={`M${n(sx - 10)},${n(sy)} Q${n(sx - 5)},${n(sy - 3)} ${n(sx)},${n(sy)} Q${n(sx + 5)},${n(sy - 3)} ${n(sx + 10)},${n(sy)}`} />;
        })}
      </g>
      <g className={c.cls('drift')}>
        <ellipse cx={n(buoy[0])} cy={n(buoy[1])} rx={9} ry={3.5} fill="#7FB8D8" opacity={0.4} />
        <path d={`M${n(buoy[0] - 6)},${n(buoy[1])} L${n(buoy[0] - 4)},${n(buoy[1] - 14)} L${n(buoy[0] + 4)},${n(buoy[1] - 14)} L${n(buoy[0] + 6)},${n(buoy[1])}Z`} fill={TONES.roofRed.left} />
        <rect x={n(buoy[0] - 5)} y={n(buoy[1] - 9)} width={10} height={4} fill="#E8E2F4" />
        {lit ? <circle cx={n(buoy[0])} cy={n(buoy[1] - 17)} r={9} fill={c.url('halo')} /> : null}
        <circle cx={n(buoy[0])} cy={n(buoy[1] - 17)} r={2.8} fill={lit ? c.L.core : '#1A2450'} stroke={lit ? c.L.glow : '#6A7DB6'} strokeWidth={0.9} />
      </g>
    </g>
  );
}

function moon(): ReactNode {
  return (
    <g>
      <circle cx={MOON.x} cy={MOON.y} r={MOON.r} fill={SKY.moon} />
      <circle cx={MOON.x - 9} cy={MOON.y - 6} r={6} fill="#EADBA8" opacity={0.6} />
      <circle cx={MOON.x + 10} cy={MOON.y + 8} r={4.5} fill="#EADBA8" opacity={0.55} />
      <circle cx={MOON.x + 4} cy={MOON.y - 13} r={3} fill="#EADBA8" opacity={0.5} />
    </g>
  );
}

function plaza(): ReactNode {
  const x0 = 120;
  const x1 = 276;
  const y0 = -210;
  const y1 = -24;
  const lines: ReactNode[] = [];
  for (let x = x0 + 26; x < x1; x += 26) lines.push(<path key={`x${x}`} d={line([W(x, y0), W(x, y1)])} />);
  for (let y = y0 + 31; y < y1; y += 31) lines.push(<path key={`y${y}`} d={line([W(x0, y), W(x1, y)])} />);
  return (
    <g>
      {groundPoly(
        [
          [x0, y0],
          [x1, y0],
          [x1, y1],
          [x0, y1],
        ],
        '#8C7FA0',
        0,
        { stroke: '#B9ACCB' },
      )}
      <g stroke="#6E6286" strokeWidth={1} opacity={0.55}>
        {lines}
      </g>
    </g>
  );
}

function netRack(): ReactNode {
  const a = W(-62, -100);
  const b = W(-18, -100);
  const h = 30;
  const sag = 7;
  const net = `M${n(a[0])},${n(a[1] - h)} Q${n((a[0] + b[0]) / 2)},${n((a[1] + b[1]) / 2 - h + sag)} ${n(b[0])},${n(b[1] - h)} L${n(b[0])},${n(b[1] - 8)} Q${n((a[0] + b[0]) / 2)},${n((a[1] + b[1]) / 2 - 2)} ${n(a[0])},${n(a[1] - 8)}Z`;
  const hatch: string[] = [];
  for (let i = 1; i < 6; i += 1) {
    const t = i / 6;
    const x = a[0] + (b[0] - a[0]) * t;
    const y = a[1] + (b[1] - a[1]) * t;
    hatch.push(`M${n(x)},${n(y - h + sag * 4 * t * (1 - t))} L${n(x)},${n(y - 8)}`);
  }
  return (
    <g>
      <path d={net} fill="#4A6F8E" opacity={0.55} stroke="#9CC4DA" strokeWidth={0.8} strokeOpacity={0.6} />
      <path d={hatch.join(' ')} stroke="#9CC4DA" strokeWidth={0.7} opacity={0.5} />
      {[a, b].map((p, i) => (
        <path key={i} d={`M${n(p[0])},${n(p[1])} L${n(p[0])},${n(p[1] - h - 4)}`} stroke={TONES.darkWood.top} strokeWidth={2.6} strokeLinecap="round" />
      ))}
    </g>
  );
}

/** Plank boardwalk along the coast, a gangplank to the boathouse and a stone path to the plaza. */
function walkways(): ReactNode {
  const planks: string[] = [];
  for (let s = 0; s < COAST.length - 1; s += 1) {
    const [ax, ay] = COAST[s];
    const [bx, by] = COAST[s + 1];
    const len = Math.hypot(bx - ax, by - ay);
    const ux = (bx - ax) / len;
    const uy = (by - ay) / len;
    for (let t = 4; t < len; t += 9) {
      const x = ax + ux * t;
      const y = ay + uy * t;
      const p0 = W(x - uy * 8, y + ux * 8);
      const p1 = W(x + uy * 8, y - ux * 8);
      planks.push(`M${n(p0[0])},${n(p0[1])} L${n(p1[0])},${n(p1[1])}`);
    }
  }
  const gang = [W(143, 96, -2), W(157, 96, -2), W(157, 124, -4), W(143, 124, -4)];
  return (
    <g>
      <polygon points={pts(worldBand(COAST, 30))} fill="#A8977F" opacity={0.9} />
      <polygon points={pts(worldBand(COAST, 17))} fill={TONES.wood.top} stroke={TONES.wood.right} strokeWidth={1} />
      <path d={planks.join(' ')} stroke={TONES.wood.right} strokeWidth={0.8} opacity={0.7} />
      <polygon points={pts(gang)} fill={TONES.wood.top} stroke={TONES.wood.right} strokeWidth={1} />
      <path d={line([W(143, 110, -3), W(157, 110, -3)])} stroke={TONES.wood.right} strokeWidth={0.8} />
      <polygon
        points={pts(
          worldBand(
            [
              [128, 82],
              [128, -22],
            ],
            20,
          ),
        )}
        fill="#8C7FA0"
        stroke="#B9ACCB"
        strokeWidth={1}
        strokeOpacity={0.5}
      />
    </g>
  );
}

function rowboat(): ReactNode {
  const [sx, sy] = W(-30, 116);
  return (
    <g transform={`translate(${n(sx)} ${n(sy)})`}>
      <ellipse cx={0} cy={3} rx={22} ry={6} fill="#141A3A" opacity={0.3} />
      <path d="M-22,-6 L18,14 Q24,10 22,4 L-14,-14 Q-24,-12 -22,-6Z" fill={TONES.wood.left} stroke={TONES.wood.edge} strokeWidth={0.8} strokeOpacity={0.6} />
      <path d="M-18,-8 L16,9 Q19,6 18,3 L-13,-11 Q-19,-11 -18,-8Z" fill={TONES.darkWood.right} />
      <path d="M-8,-7 L4,-1 M2,2 L12,7" stroke={TONES.wood.top} strokeWidth={2.4} />
      <path d="M-26,2 L-6,-2" stroke={TONES.wood.top} strokeWidth={1.6} strokeLinecap="round" />
    </g>
  );
}

function back(c: DCtx): ReactNode {
  const total = c.stages[0] + c.stages[1] + c.stages[2];
  const crossFront = [W(-300, 250, SEA_Z), W(290, 250, SEA_Z), W(290, 250, SEA_Z - 15), W(-300, 250, SEA_Z - 15)];
  const crossRight = [W(290, 250, SEA_Z), W(290, 100, SEA_Z), W(290, 100, SEA_Z - 15), W(290, 250, SEA_Z - 15)];
  return (
    <g>
      {localStars(
        c,
        [
          [260, 92, 4.5],
          [72, 210, 3.6],
          [420, 84, 3.6],
          [980, 100, 5],
          [1120, 170, 4],
          [760, 80, 3.2],
        ],
        'stars',
      )}
      <circle cx={MOON.x} cy={MOON.y} r={80} fill={c.url('moon')} />
      {moon()}
      {islandBlock(FULL, SEA_Z, 48, SEA_TONE, 'base', { topFill: c.url('water'), edgeColor: '#7FB8D8' })}
      <polygon points={pts(crossFront)} fill="#3B86B0" opacity={0.75} />
      <polygon points={pts(crossRight)} fill="#2C6C98" opacity={0.75} />
      <path d={line([W(-300, 250, SEA_Z), W(290, 250, SEA_Z), W(290, 100, SEA_Z)])} fill="none" stroke={ACCENT.tealPale} strokeWidth={1.6} opacity={0.6} />
      {seaDetails(c, total >= 12)}
      {islandBlock(LAND, 0, -SEA_Z, G, 'land', { rocks: false })}
      {walkways()}
      {plaza()}
      {tree(-100, -182, 1.15, 't0', { a: '#4E9C8C', b: '#35796E', c: '#6CC0AC' })}
      {tree(0, -222, 1.05, 't1', { a: '#4E9C8C', b: '#35796E', c: '#6CC0AC' })}
      {bush(-150, -100, 1.1, 'b0')}
      {bush(252, -222, 1.05, 'b1')}
      {netRack()}
      {dBox(-110, 52, -92, 70, 0, 12, TONES.wood, 'crate0')}
      {dBox(-104, 58, -92, 70, 12, 20, TONES.sand, 'crate1')}
      {barrel(-70, 40, 'br0')}
      {barrel(-56, 52, 'br1')}
      {rowboat()}
      {[
        [60, 228],
        [240, 240],
        [-60, 190],
      ].map(([x, y], i) => (
        <g key={i}>{dBox(x - 2, y - 2, x + 2, y + 2, SEA_Z, SEA_Z + 12, TONES.darkWood)}</g>
      ))}
      {lampPost(c, -20, 60, total >= 4, 'l1')}
      {lampPost(c, 120, -20, total >= 10, 'l2')}
      {lampPost(c, 285, -200, total >= 16, 'l3')}
    </g>
  );
}

export const harbour: DistrictModule = { back };
