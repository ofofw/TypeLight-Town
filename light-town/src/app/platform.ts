import type { KV } from '../core/save/storage';

/** window.localStorage, or null when the browser refuses access (e.g. storage disabled). */
export function browserStorage(): KV | null {
  try {
    return window.localStorage ?? null;
  } catch {
    return null;
  }
}

const TAB_ID_KEY = 'lighttown.tab';

function newTabId(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  return `t-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`;
}

function isReload(): boolean {
  try {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    return nav?.type === 'reload';
  } catch {
    return false;
  }
}

/**
 * Identity of this page for the single-active-page lease. A reload keeps the identity (so refreshing never
 * looks like a second page); a new or duplicated tab gets a new one.
 */
export function pageIdentity(): string {
  try {
    const stored = window.sessionStorage.getItem(TAB_ID_KEY);
    if (stored && isReload()) return stored;
    const id = newTabId();
    window.sessionStorage.setItem(TAB_ID_KEY, id);
    return id;
  } catch {
    return newTabId();
  }
}

export function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/** Running as an app added to the home screen (separate storage from the Safari tab). */
export function isStandalone(): boolean {
  try {
    const nav = navigator as Navigator & { standalone?: boolean };
    return nav.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
  } catch {
    return false;
  }
}
