import { createContext, useContext, useEffect, useState, useSyncExternalStore } from 'react';
import type { AudioStatus } from '../app/audio';
import type { AppController, AppState } from '../app/controller';

export const ControllerContext = createContext<AppController | null>(null);

export function useController(): AppController {
  const c = useContext(ControllerContext);
  if (!c) throw new Error('ControllerContext missing');
  return c;
}

export function useAppState(): AppState {
  const c = useController();
  return useSyncExternalStore(c.subscribe, c.getState, c.getState);
}

export function useAudioStatus(): AudioStatus {
  const c = useController();
  return useSyncExternalStore(c.audio.subscribe, c.audio.getStatus, c.audio.getStatus);
}

function systemReducedMotion(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

export function useSystemReducedMotion(): boolean {
  const [reduced, setReduced] = useState(systemReducedMotion);
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!mq) return;
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

/** Whether decorative animation may run (game setting and the system "reduce motion" preference). */
export function useAnimate(): boolean {
  const { save } = useAppState();
  const systemReduced = useSystemReducedMotion();
  return !save.settings.reduceMotion && !systemReduced;
}

/** Re-render periodically while `active`. */
export function useNow(intervalMs: number, active: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, active]);
  return now;
}
