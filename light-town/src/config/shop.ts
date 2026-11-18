export type AccessorySlot = 'head' | 'scarf' | 'lamp';

export const SLOT_NAMES: Record<AccessorySlot, string> = {
  head: '头饰',
  scarf: '围巾',
  lamp: '随行灯',
};

export interface AccessoryDef {
  id: string;
  slot: AccessorySlot;
  name: string;
  price: number;
}

/** 价格 2026-11-16 整体下调（原 30/60/90、主题 80），让灯光币更早换成看得见的奖励。 */
export const ACCESSORIES: readonly AccessoryDef[] = [
  { id: 'leaf-hat', slot: 'head', name: '小叶帽', price: 15 },
  { id: 'star-hat', slot: 'head', name: '星星帽', price: 30 },
  { id: 'moon-crown', slot: 'head', name: '月亮冠', price: 45 },
  { id: 'scarf-orange', slot: 'scarf', name: '暖橙围巾', price: 15 },
  { id: 'scarf-mint', slot: 'scarf', name: '薄荷围巾', price: 30 },
  { id: 'scarf-night', slot: 'scarf', name: '星夜围巾', price: 45 },
  { id: 'lamp-firefly', slot: 'lamp', name: '萤火灯', price: 15 },
  { id: 'lamp-flower', slot: 'lamp', name: '花朵灯', price: 30 },
  { id: 'lamp-planet', slot: 'lamp', name: '星球灯', price: 45 },
];

export type ThemeId = 'warm' | 'mint' | 'berry';

export interface ThemeDef {
  id: ThemeId;
  name: string;
  price: number;
}

export const THEMES: readonly ThemeDef[] = [
  { id: 'warm', name: '暖金', price: 0 },
  { id: 'mint', name: '薄荷星光', price: 40 },
  { id: 'berry', name: '莓果晚霞', price: 40 },
];

export const DEFAULT_THEME: ThemeId = 'warm';

export function accessoryById(id: string): AccessoryDef | undefined {
  return ACCESSORIES.find((a) => a.id === id);
}

export function themeById(id: string): ThemeDef | undefined {
  return THEMES.find((t) => t.id === id);
}

export type PartnerId = 'nuannuan' | 'manman' | 'tiaotiao';

export interface PartnerDef {
  id: PartnerId;
  name: string;
  species: string;
  intro: string;
}

export const PARTNERS: readonly PartnerDef[] = [
  { id: 'nuannuan', name: '暖暖', species: '灯尾狐', intro: '尾巴尖上有一盏小灯，最喜欢给窗户点灯。' },
  { id: 'manman', name: '慢慢', species: '背灯龟', intro: '背上驮着一盏圆灯，做事慢慢来、稳稳的。' },
  { id: 'tiaotiao', name: '跳跳', species: '星耳兔', intro: '耳朵上长着星星，一高兴就会发光。' },
];

export function partnerById(id: string): PartnerDef | undefined {
  return PARTNERS.find((p) => p.id === id);
}
