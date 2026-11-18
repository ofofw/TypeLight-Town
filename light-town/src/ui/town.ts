import { BUILDING_COUNT, BUILDINGS_PER_DISTRICT, DISTRICTS, STAGES_PER_BUILDING, districtOfBuilding } from '../config/buildings';
import type { SaveData } from '../core/types';

export function districtStages(save: SaveData, district: number): [number, number, number] {
  const base = district * BUILDINGS_PER_DISTRICT;
  return [save.buildings[base] ?? 0, save.buildings[base + 1] ?? 0, save.buildings[base + 2] ?? 0];
}

/** Slot of the current target building inside `district`, or null. */
export function currentSlot(save: SaveData, district: number): number | null {
  if (save.currentBuilding >= BUILDING_COUNT) return null;
  return districtOfBuilding(save.currentBuilding) === district
    ? save.currentBuilding - district * BUILDINGS_PER_DISTRICT
    : null;
}

/** District shown first: the one being lit, or the last one when everything is lit. */
export function focusDistrict(save: SaveData): number {
  return districtOfBuilding(Math.min(save.currentBuilding, BUILDING_COUNT - 1));
}

/** A district opens when every building before it is complete. */
export function districtOpen(save: SaveData, district: number): boolean {
  return save.currentBuilding >= district * BUILDINGS_PER_DISTRICT;
}

export function completedBuildings(save: SaveData): number {
  return save.buildings.filter((s) => s >= STAGES_PER_BUILDING).length;
}

export const DISTRICT_COUNT = DISTRICTS.length;
