export function localDateKey(ms: number): string {
  const d = new Date(ms);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

function nextLocalMidnight(ms: number): number {
  const d = new Date(ms);
  d.setHours(24, 0, 0, 0);
  return d.getTime();
}

/** Split [from, to) into per-local-day durations. */
export function splitByLocalDay(from: number, to: number): [string, number][] {
  const out: [string, number][] = [];
  let t = from;
  while (t < to) {
    const end = Math.min(to, nextLocalMidnight(t));
    out.push([localDateKey(t), end - t]);
    t = end;
  }
  return out;
}

/** Local date keys of today and the previous `days - 1` days, newest first. */
export function recentDateKeys(now: number, days: number): string[] {
  const keys: string[] = [];
  const d = new Date(now);
  d.setHours(12, 0, 0, 0);
  for (let i = 0; i < days; i++) {
    keys.push(localDateKey(d.getTime()));
    d.setDate(d.getDate() - 1);
  }
  return keys;
}

export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    return `${hours} 小时 ${minutes % 60} 分`;
  }
  if (minutes === 0) return `${seconds} 秒`;
  return `${minutes} 分 ${seconds} 秒`;
}
