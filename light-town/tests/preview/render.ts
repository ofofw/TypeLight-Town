import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createElement, Fragment, type ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Resvg } from '@resvg/resvg-js';

export const PREVIEW_DIR = fileURLToPath(new URL('../../.cache/preview', import.meta.url));

export interface SheetCell {
  element: ReactElement;
  label?: string;
}

export interface SheetOptions {
  cols: number;
  cellWidth: number;
  cellHeight: number;
  background?: string;
  /** Output width of the PNG in pixels; defaults to the sheet's natural width. */
  pngWidth?: number;
}

const LABEL_HEIGHT = 22;
const GAP = 12;

/** Give a rendered <svg> root explicit size and position inside the sheet. */
function placeSvg(markup: string, x: number, y: number, width: number, height: number): string {
  const open = markup.match(/^<svg\b[^>]*>/);
  if (!open) throw new Error('Preview element must render an <svg> root');
  const attrs = open[0]
    .replace(/^<svg\b/, '')
    .replace(/>$/, '')
    .replace(/\s(width|height|x|y|class|style)="[^"]*"/g, '');
  const ns = attrs.includes('xmlns=') ? '' : ' xmlns="http://www.w3.org/2000/svg"';
  return `<svg${ns}${attrs} x="${x}" y="${y}" width="${width}" height="${height}">` + markup.slice(open[0].length);
}

/**
 * Render all elements in one React tree (so useId values stay unique across cells)
 * and split the output into one top-level <svg> per element.
 */
function renderRoots(elements: ReactElement[]): string[] {
  const markup = renderToStaticMarkup(
    createElement(Fragment, null, ...elements.map((el, i) => createElement(Fragment, { key: i }, el))),
  );
  const roots: string[] = [];
  const token = /<svg\b|<\/svg>/g;
  let depth = 0;
  let start = 0;
  for (let m = token.exec(markup); m; m = token.exec(markup)) {
    if (m[0] === '</svg>') {
      depth -= 1;
      if (depth === 0) roots.push(markup.slice(start, m.index + m[0].length));
    } else {
      if (depth === 0) start = m.index;
      depth += 1;
    }
  }
  if (roots.length !== elements.length) {
    throw new Error(`Expected ${elements.length} <svg> roots, got ${roots.length}`);
  }
  return roots;
}

/** Lay out cells in a grid with labels and save as PNG under .cache/preview/. */
export function saveSheet(name: string, cells: SheetCell[], opts: SheetOptions): string {
  const rows = Math.ceil(cells.length / opts.cols);
  const width = opts.cols * (opts.cellWidth + GAP) + GAP;
  const height = rows * (opts.cellHeight + LABEL_HEIGHT + GAP) + GAP;
  const roots = renderRoots(cells.map((c) => c.element));
  const parts = cells.map((cell, i) => {
    const col = i % opts.cols;
    const row = Math.floor(i / opts.cols);
    const x = GAP + col * (opts.cellWidth + GAP);
    const y = GAP + row * (opts.cellHeight + LABEL_HEIGHT + GAP);
    const label = cell.label
      ? `<text x="${x + opts.cellWidth / 2}" y="${y + opts.cellHeight + 16}" fill="#F7F2E6" font-size="14" font-family="Helvetica, Arial, sans-serif" text-anchor="middle">${escapeXml(cell.label)}</text>`
      : '';
    return placeSvg(roots[i], x, y, opts.cellWidth, opts.cellHeight) + label;
  });
  const sheet =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
    `<rect width="100%" height="100%" fill="${opts.background ?? '#16244F'}"/>` +
    parts.join('') +
    '</svg>';
  const png = new Resvg(sheet, {
    fitTo: { mode: 'width', value: opts.pngWidth ?? width },
    font: { loadSystemFonts: true },
  })
    .render()
    .asPng();
  const out = resolve(PREVIEW_DIR, `${name}.png`);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, png);
  writeFileSync(out.replace(/\.png$/, '.svg'), sheet);
  return out;
}

function escapeXml(s: string): string {
  return s.replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' })[c] as string);
}
