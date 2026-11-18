import type { BuildingModule } from './kit';
import { cottage } from './b00-cottage';
import { bakery } from './b01-bakery';
import { postOffice } from './b02-post';
import { flowerHouse } from './b03-flower';
import { clockTower } from './b04-clock';
import { library } from './b05-library';
import { musicHouse } from './b06-music';
import { observatory } from './b07-observatory';
import { windmill } from './b08-windmill';
import { lighthouse } from './b09-lighthouse';
import { boathouse } from './b10-boathouse';
import { festivalHall } from './b11-festival';

/** Building art modules in BUILDINGS index order. */
export const BUILDING_MODULES: readonly BuildingModule[] = [
  cottage,
  bakery,
  postOffice,
  flowerHouse,
  clockTower,
  library,
  musicHouse,
  observatory,
  windmill,
  lighthouse,
  boathouse,
  festivalHall,
];
