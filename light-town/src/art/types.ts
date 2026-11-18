import type { FingerId } from '../config/keys';
import type { AccessorySlot, PartnerId, ThemeId } from '../config/shop';

/**
 * Building drawn as an SVG <g> in local coordinates: origin at the centre of the
 * footprint on the ground, building rising towards negative y. The body must stay
 * inside BUILDING_BOX; effects may reach the edge of BUILDING_VIEWBOX.
 */
export interface BuildingArtProps {
  /** 0-based index into BUILDINGS (config/buildings.ts). */
  index: number;
  /** Permanent lit stage, 0..6. */
  stage: number;
  /**
   * Temporary light points of the level in progress (0..pendingMax), drawn at the
   * next stage's element. Must read as temporary (small dots, dashed outline), never
   * as a permanently lit element. Ignored when stage >= 6.
   */
  pending?: number;
  /** Defaults to 24. */
  pendingMax?: number;
  theme: ThemeId;
  /** false = reduced motion: no looping or one-shot animation; lit state stays obvious. */
  animate: boolean;
  /** Play the one-shot completion celebration (at most 2 s). */
  celebrate?: boolean;
}

export interface BuildingSvgProps extends BuildingArtProps {
  /** Accessible name, e.g. "面包坊，已点亮 2/6". */
  title: string;
  className?: string;
}

export interface DistrictSceneProps {
  /** 0..3, index into DISTRICTS. */
  district: number;
  /** Permanent stage of the district's three buildings, in slot order. */
  stages: readonly [number, number, number];
  /** Slot (0..2) of the building that is the current target, if it is in this district. */
  current?: number | null;
  /** Slot (0..2) that should play its completion celebration. */
  celebrateSlot?: number | null;
  theme: ThemeId;
  animate: boolean;
  title: string;
  className?: string;
}

export interface DistrictSlot {
  /** Anchor (footprint centre) in DISTRICT_VIEWBOX coordinates. */
  x: number;
  y: number;
  scale: number;
}

export interface TownCelebrationProps {
  theme: ThemeId;
  animate: boolean;
}

export interface DemoWindowProps {
  /** Number of lit panes, 0..4. */
  lit: number;
  animate: boolean;
  title: string;
  className?: string;
}

export type PartnerPose = 'idle' | 'encourage' | 'celebrate' | 'guide';

export interface PartnerArtProps {
  partner: PartnerId;
  pose: PartnerPose;
  equipped: Partial<Record<AccessorySlot, string | null>>;
  animate: boolean;
  title: string;
  className?: string;
}

export interface AccessoryIconProps {
  /** Accessory id from ACCESSORIES, or null for the slot's "no accessory" icon. */
  id: string | null;
  slot: AccessorySlot;
  title: string;
  className?: string;
}

export interface HandsArtProps {
  /** Finger to highlight, or null for none. */
  finger: FingerId | null;
  /** Stronger highlight with a fingertip marker (enhanced hint). */
  emphasis: boolean;
  /** Show home-row key caps under the fingertips (a s d f / j k l ;) with F/J bumps. */
  showHomeKeys?: boolean;
  animate: boolean;
  title: string;
  className?: string;
}
