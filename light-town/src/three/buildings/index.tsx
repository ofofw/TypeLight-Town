import type { ComponentType } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import { Bakery, LampHouse, PostOffice } from './district0';
import { ClockTower, FlowerHouse, Library } from './district1';
import { MusicHouse, Observatory, Windmill } from './district2';
import { Boathouse, FestivalHall, Lighthouse } from './district3';
import { WARM } from './parts';
import type { BuildingBodyProps } from './parts';

/** 12 座建筑的小样变体（对应 BUILDINGS 0-11 的 id）。 */
export type GreyboxVariant =
  | 'lamp-house'
  | 'bakery'
  | 'post-office'
  | 'flower-house'
  | 'clock-tower'
  | 'library'
  | 'music-house'
  | 'observatory'
  | 'windmill'
  | 'lighthouse'
  | 'boathouse'
  | 'festival-hall';

export interface GreyboxBuildingProps {
  variant: GreyboxVariant;
  /** 已点亮窗数 0..6（STAGES_PER_BUILDING）。 */
  stage: number;
  highlighted?: boolean;
  reducedMotion?: boolean;
  position: [number, number, number];
  rotationY?: number;
  /** 窗光外洒点光源（非聚焦街区关闭以控制全场灯数，默认开）。 */
  spill?: boolean;
  onPick?: () => void;
}

const VARIANTS: Record<GreyboxVariant, ComponentType<BuildingBodyProps>> = {
  'lamp-house': LampHouse,
  bakery: Bakery,
  'post-office': PostOffice,
  'flower-house': FlowerHouse,
  'clock-tower': ClockTower,
  library: Library,
  'music-house': MusicHouse,
  observatory: Observatory,
  windmill: Windmill,
  lighthouse: Lighthouse,
  boathouse: Boathouse,
  'festival-hall': FestivalHall,
};

export function GreyboxBuilding({ variant, stage, highlighted, reducedMotion, position, rotationY = 0, spill = true, onPick }: GreyboxBuildingProps) {
  const Body = VARIANTS[variant];
  function pick(e: ThreeEvent<MouseEvent>) {
    e.stopPropagation();
    onPick?.();
  }
  return (
    <group
      position={position}
      rotation-y={rotationY}
      onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { document.body.style.cursor = ''; }}
      onClick={pick}
    >
      <Body stage={stage} highlighted={highlighted} reducedMotion={reducedMotion} />
      {/* 窗光外洒：点亮的窗越多，门前越亮（对应 2D 版的 spill）。 */}
      {spill && stage > 0 && (
        <pointLight
          position={[0, 1.2, 2.2]}
          color={WARM.glow}
          intensity={stage * 2.4}
          distance={8}
          decay={2}
        />
      )}
    </group>
  );
}
