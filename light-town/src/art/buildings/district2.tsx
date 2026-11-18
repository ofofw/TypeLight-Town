import type { ReactNode } from 'react';
import { DISTRICT_GROUND } from '../palette';
import { TONES } from './materials';
import { n, pts } from './iso';
import type { DCtx, DistrictModule, GroundTone } from './island';
import { W, bench, dBox, islandBlock, lampPost, localStars, pine, worldBand } from './island';

/** 星光坡 Starlight Slope: a terraced hillside climbing to the windmill under a starry sky. */

const G = DISTRICT_GROUND[2];
const L1: GroundTone = { top: '#5A55A3', left: '#433F86', right: '#35326E', accent: G.accent };
const L2: GroundTone = { top: '#6560B0', left: '#4A4690', right: '#3A3778', accent: G.accent };
const BASE: [number, number][] = [
  [-300, -240],
  [280, -240],
  [280, 250],
  [-300, 250],
];
const TERRACE1: [number, number][] = [
  [-60, -240],
  [280, -240],
  [280, 120],
  [-60, 120],
];
const TERRACE2: [number, number][] = [
  [100, -240],
  [280, -240],
  [280, -30],
  [100, -30],
];
const Z1 = 36;
const Z2 = 72;
const STEP = { stone: TONES.stone };

function stairs(x0: number, x1: number, yTop: number, z0: number, key: string): ReactNode {
  const out: ReactNode[] = [];
  for (let i = 3; i >= 0; i -= 1) {
    const ya = yTop + 10 * (3 - i);
    out.push(<g key={i}>{dBox(x0, ya, x1, ya + 10, z0, z0 + 9 * (i + 1), STEP.stone)}</g>);
  }
  return <g key={key}>{out}</g>;
}

function starFlowers(spots: readonly (readonly [number, number, number])[], key: string): ReactNode {
  return (
    <g key={key}>
      {spots.map(([x, y, z], i) => {
        const [sx, sy] = W(x, y, z);
        return (
          <g key={i}>
            <path d={`M${n(sx)},${n(sy)} L${n(sx)},${n(sy - 6)}`} stroke="#4DB59A" strokeWidth={1} />
            <path d={`M${n(sx)},${n(sy - 11)} L${n(sx + 1.4)},${n(sy - 7.4)} L${n(sx + 4)},${n(sy - 7)} L${n(sx + 1.6)},${n(sy - 5.6)} L${n(sx)},${n(sy - 3.4)} L${n(sx - 1.6)},${n(sy - 5.6)} L${n(sx - 4)},${n(sy - 7)} L${n(sx - 1.4)},${n(sy - 7.4)}Z`} fill={G.accent} />
          </g>
        );
      })}
    </g>
  );
}

const PATH0: [number, number][] = [
  [-48, 215],
  [-25, 215],
  [-25, 162],
];
const PATH1: [number, number][] = [
  [-25, 120],
  [-25, 108],
  [50, 108],
];
const PATH1B: [number, number][] = [
  [135, 112],
  [135, 12],
];
const PATH2: [number, number][] = [
  [135, -30],
  [135, -62],
  [165, -62],
];

function back(c: DCtx): ReactNode {
  const total = c.stages[0] + c.stages[1] + c.stages[2];
  return (
    <g>
      {localStars(
        c,
        [
          [140, 150, 7],
          [232, 96, 4.5],
          [382, 78, 5],
          [700, 82, 3.6],
          [1004, 112, 6],
          [1094, 196, 4.5],
          [1152, 92, 3.6],
          [80, 262, 4],
          [520, 120, 3.2],
        ],
        'stars',
      )}
      {islandBlock(BASE, 0, 50, G, 'base')}
      {pine(-250, -150, 1.2, 'p0')}
      {pine(-200, -40, 1, 'p1')}
      {pine(-290, 160, 0.95, 'p2')}
      {starFlowers(
        [
          [-230, -200, 0],
          [-160, -120, 0],
          [-260, 10, 0],
          [-140, 60, 0],
          [-240, 200, 0],
        ],
        'sf0',
      )}
      <polygon points={pts(worldBand(PATH0, 26))} fill="#6D67B4" stroke="#9C95DE" strokeWidth={1} strokeOpacity={0.45} strokeLinejoin="round" />
      {islandBlock(TERRACE1, Z1, Z1, L1, 't1', { rocks: false })}
      {pine(100, 200, 1.05, 'p3')}
      {pine(222, 190, 1.15, 'p4')}
      {starFlowers(
        [
          [40, 170, 0],
          [160, 150, 0],
          [250, 225, 0],
        ],
        'sf1',
      )}
      {stairs(-40, -10, 120, 0, 's1')}
      {lampPost(c, -54, 135, total >= 3, 'l1')}
      {pine(-20, -180, 1.05, 'p5', Z1)}
      {pine(40, -122, 0.9, 'p6', Z1)}
      <polygon points={pts(worldBand(PATH1, 26, Z1))} fill="#7570BE" stroke="#A39CE6" strokeWidth={1} strokeOpacity={0.45} strokeLinejoin="round" />
      <polygon points={pts(worldBand(PATH1B, 26, Z1))} fill="#7570BE" stroke="#A39CE6" strokeWidth={1} strokeOpacity={0.45} strokeLinejoin="round" />
      {starFlowers(
        [
          [-40, -60, Z1],
          [10, -20, Z1],
          [-30, 20, Z1],
          [70, -200, Z1],
        ],
        'sf2',
      )}
      {bench(-42, 40, 'bench', Z1)}
      {islandBlock(TERRACE2, Z2, Z2 - Z1, L2, 't2', { rocks: false })}
      {stairs(120, 150, -30, Z1, 's2')}
      {lampPost(c, 162, 16, total >= 9, 'l2', 46, Z1)}
      <polygon points={pts(worldBand(PATH2, 22, Z2))} fill="#807ACA" stroke="#ABA4EC" strokeWidth={1} strokeOpacity={0.45} strokeLinejoin="round" />
      {pine(250, -220, 1, 'p7', Z2)}
      {starFlowers(
        [
          [120, -200, Z2],
          [230, -200, Z2],
          [130, -150, Z2],
        ],
        'sf3',
      )}
      {lampPost(c, 178, -45, total >= 15, 'l3', 46, Z2)}
    </g>
  );
}

export const slope: DistrictModule = { back };
