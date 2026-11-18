import { createRng, deriveSeed } from '../rng';

/**
 * 题单排列（spec/phase-2/RULES.md）：
 * - 每步题数固定；优先放置剩余次数最多且不同于上一项的项目，并列按种子随机。
 * - 只有单项池才允许相邻相同；配额产生的相邻重复在排列时以同池其他项替换（排除上一项）。
 */
export function arrangePlan(counts: Readonly<Record<string, number>>, seed: number, salt: number): string[] {
  const rng = createRng(deriveSeed(seed, salt));
  const rem = new Map(Object.entries(counts).filter(([, n]) => n > 0));
  const total = [...rem.values()].reduce((a, b) => a + b, 0);
  const out: string[] = [];
  let last: string | null = null;
  for (let i = 0; i < total; i++) {
    let candidates = [...rem.entries()].filter(([id, n]) => n > 0 && id !== last);
    if (candidates.length === 0) candidates = [...rem.entries()].filter(([, n]) => n > 0);
    if (candidates.length === 0) break;
    const max = Math.max(...candidates.map(([, n]) => n));
    const top = candidates.filter(([, n]) => n === max);
    const pick = top[Math.floor(rng() * top.length)]![0];
    out.push(pick);
    last = pick;
    rem.set(pick, (rem.get(pick) ?? 0) - 1);
  }
  return out;
}
