import { RULES } from '../../config/rules';
import type { KV } from './storage';

export const LEASE_KEY = 'lighttown.lease';

export interface Lease {
  owner: string;
  heartbeat: number;
}

export type LeaseStatus = 'mine' | 'free' | 'other';

export function parseLease(raw: string | null): Lease | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Partial<Lease>;
    if (typeof v.owner === 'string' && typeof v.heartbeat === 'number' && Number.isFinite(v.heartbeat)) {
      return { owner: v.owner, heartbeat: v.heartbeat };
    }
  } catch {
    /* treated as no lease */
  }
  return null;
}

/** "other" only while another page's heartbeat is fresher than the timeout; an expired lease is free. */
export function leaseStatus(lease: Lease | null, me: string, now: number): LeaseStatus {
  if (!lease) return 'free';
  if (lease.owner === me) return 'mine';
  return now - lease.heartbeat < RULES.timing.leaseTimeoutMs ? 'other' : 'free';
}

export function readLease(kv: KV): Lease | null {
  try {
    return parseLease(kv.getItem(LEASE_KEY));
  } catch {
    return null;
  }
}

export function writeLease(kv: KV, me: string, now: number): boolean {
  try {
    kv.setItem(LEASE_KEY, JSON.stringify({ owner: me, heartbeat: now } satisfies Lease));
    return true;
  } catch {
    return false;
  }
}

export function releaseLease(kv: KV, me: string): void {
  try {
    if (readLease(kv)?.owner === me) kv.removeItem(LEASE_KEY);
  } catch {
    /* nothing to release */
  }
}
