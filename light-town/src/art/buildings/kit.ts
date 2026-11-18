import type { ReactNode } from 'react';
import type { LightPalette } from '../palette';
import type { Mat, Pt } from './iso';

/** Per-render drawing context handed to every building module. */
export interface Kit {
  /** Unique prefix for ids and animation class names. */
  u: string;
  stage: number;
  /** stage >= 6: completion effect is shown. */
  done: boolean;
  animate: boolean;
  L: LightPalette;
  /** Is light element i (0..5) permanently lit? */
  lit(i: number): boolean;
  id(name: string): string;
  url(name: string): string;
  /** Animation class name, only when animate is on. */
  cls(name: string): string | undefined;
}

/** Outline of a light element in local coordinates, optionally mapped by a matrix onto a face. */
export type Shape =
  | { k: 'rect'; x: number; y: number; w: number; h: number; r?: number; m?: Mat }
  | { k: 'ell'; cx: number; cy: number; rx: number; ry: number; m?: Mat }
  | { k: 'arch'; x: number; y: number; w: number; h: number; m?: Mat }
  | { k: 'path'; d: string; box: readonly [number, number, number, number]; m?: Mat };

/** Where the temporary light dots go (screen/local building coordinates). */
export type DotPath =
  | { k: 'ring'; cx: number; cy: number; rx: number; ry: number }
  | { k: 'line'; p: readonly Pt[]; closed?: boolean };

export interface ElemSpec {
  s: Shape;
  dots?: DotPath;
}

export interface BuildingModule {
  /** The six light elements, in stage order. */
  elems: readonly ElemSpec[];
  draw(k: Kit): ReactNode;
  /** Extra keyframes (class names prefixed with the uid). */
  css?(u: string): string;
  /** Ground light spill shown at completion. */
  spill: { cx: number; cy: number; rx: number; ry: number };
  /** Centre of the one-shot celebration burst. */
  burst: Pt;
  /** Highest point of the body (most negative y), used for district markers. */
  top: number;
}
