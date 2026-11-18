export interface DistrictDef {
  index: number;
  id: string;
  name: string;
  description: string;
}

export const DISTRICTS: readonly DistrictDef[] = [
  { index: 0, id: 'warm-lane', name: '暖灯巷', description: '石板小巷，屋檐挨着屋檐。' },
  { index: 1, id: 'creek-street', name: '溪桥街', description: '小溪穿过街道，木桥连着花房和钟楼。' },
  { index: 2, id: 'starlight-slope', name: '星光坡', description: '缓缓的山坡上能看到满天星星。' },
  { index: 3, id: 'moon-bay', name: '月湾港', description: '月亮照着港湾，灯塔守着海面。' },
];

export interface BuildingDef {
  index: number;
  id: string;
  name: string;
  district: number;
  feedback: string;
  effect: string;
}

export const BUILDINGS: readonly BuildingDef[] = [
  { index: 0, id: 'lamp-house', name: '小灯屋', district: 0, feedback: '窗格依次发光', effect: '烟囱冒出暖色小星' },
  { index: 1, id: 'bakery', name: '面包坊', district: 0, feedback: '烤炉灯与橱窗亮起', effect: '招牌轻轻摆动' },
  { index: 2, id: 'post-office', name: '邮局', district: 0, feedback: '信箱与门灯亮起', effect: '纸飞机绕着邮局飞' },
  { index: 3, id: 'flower-house', name: '花房', district: 1, feedback: '花盆光点与温室亮起', effect: '花朵慢慢舒展' },
  { index: 4, id: 'clock-tower', name: '钟楼', district: 1, feedback: '表盘与楼层亮起', effect: '钟摆轻轻摆动' },
  { index: 5, id: 'library', name: '图书馆', district: 1, feedback: '书窗与入口亮起', effect: '书页光影展开' },
  { index: 6, id: 'music-house', name: '音乐屋', district: 2, feedback: '音符窗依次亮起', effect: '音符缓缓上浮' },
  { index: 7, id: 'observatory', name: '观星台', district: 2, feedback: '台阶与穹顶亮起', effect: '天空出现星图' },
  { index: 8, id: 'windmill', name: '风车坊', district: 2, feedback: '塔窗与叶片灯亮起', effect: '风车慢慢转动' },
  { index: 9, id: 'lighthouse', name: '灯塔', district: 3, feedback: '塔层逐段亮起', effect: '柔和的光束扫过海面' },
  { index: 10, id: 'boathouse', name: '船屋', district: 3, feedback: '舷窗与码头亮起', effect: '小船轻轻浮动' },
  { index: 11, id: 'festival-hall', name: '节庆大厅', district: 3, feedback: '拱窗与灯链亮起', effect: '全镇灯光节开启' },
];

export const BUILDING_COUNT = BUILDINGS.length;
export const STAGES_PER_BUILDING = 6;
export const BUILDINGS_PER_DISTRICT = 3;

export function districtOfBuilding(index: number): number {
  return Math.floor(index / BUILDINGS_PER_DISTRICT);
}

export function isDistrictLastBuilding(index: number): boolean {
  return index % BUILDINGS_PER_DISTRICT === BUILDINGS_PER_DISTRICT - 1;
}
