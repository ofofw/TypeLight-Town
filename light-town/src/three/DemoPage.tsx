import { useEffect, useRef, useState } from 'react';
import { TownScene } from './TownScene';
import type { TownBuildingSpec } from './TownScene';
import './demo.css';

/** 里程碑 0 风格门验收页：暖灯巷灰盒样 + 窗灯点亮机制演示。 */
export function Town3DDemo() {
  const [stages, setStages] = useState<[number, number, number]>([2, 4, 0]);
  const [focused, setFocused] = useState<number | null>(null);
  const [reduced, setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [playing, setPlaying] = useState(false);
  const seqRef = useRef<number>(0);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  function stepBuilding(i: number, delta: number) {
    setStages((prev) => {
      const next = [...prev] as [number, number, number];
      next[i] = (next[i] + delta + 7) % 7;
      return next;
    });
  }

  /** 逐窗点亮演示：按 建筑0→2 的顺序一盏一盏点亮（reduce-motion 时直接全亮）。 */
  function playSequence() {
    if (reduced) {
      setStages([6, 6, 6]);
      return;
    }
    if (playing) return;
    setPlaying(true);
    seqRef.current = 0;
    const timer = window.setInterval(() => {
      const step = seqRef.current++;
      if (step >= 18) {
        window.clearInterval(timer);
        setPlaying(false);
        return;
      }
      const b = Math.floor(step / 6);
      setStages((prev) => {
        const next = [...prev] as [number, number, number];
        next[b] = Math.min(6, step - b * 6 + 1);
        return next;
      });
    }, 420);
  }

  const buildings: TownBuildingSpec[] = [
    { variant: 'lamp-house', name: '小灯屋', stage: stages[0], highlighted: focused === 0 },
    { variant: 'bakery', name: '面包坊', stage: stages[1], highlighted: focused === 1 },
    { variant: 'post-office', name: '邮局', stage: stages[2], highlighted: focused === 2 },
  ];

  return (
    <div className="demo3d">
      <header className="demo3d__header">
        <h1>点亮小镇 · 3D 里程碑 0（风格门验收）</h1>
        <p>
          暖灯巷灰盒样：拖拽旋转 / 滚轮缩放 / 点击建筑点亮下一盏窗。下方按钮可用键盘 Tab + Enter 操作（焦点层可达性验证）。
          {reduced && '（已检测到系统「减少动态效果」，动画即时应用）'}
        </p>
      </header>

      <div className="demo3d__panels">
        <section className="demo3d__panel" aria-label="灰盒版">
          <h2>灰盒版（程序化）</h2>
          <div className="demo3d__canvas">
            <TownScene
              buildings={buildings}
              reducedMotion={reduced}
              onPick={(i) => stepBuilding(i, 1)}
            />
          </div>
        </section>
        <section className="demo3d__panel" aria-label="Tripo 样模版">
          <h2>Tripo 样模版（AI 生成）</h2>
          <div className="demo3d__canvas demo3d__canvas--placeholder">
            <p>待 Tripo 小样生成后替换</p>
            <p className="demo3d__hint">（b00 小灯屋 / b01 面包坊 / b02 邮局 + 1 道具）</p>
          </div>
        </section>
      </div>

      <fieldset className="demo3d__controls">
        <legend>建筑控制（键盘可达焦点层）</legend>
        <div className="demo3d__rows">
          {buildings.map((b, i) => (
            <div className="demo3d__row" key={b.variant}>
              <button
                type="button"
                onFocus={() => setFocused(i)}
                onBlur={() => setFocused((f) => (f === i ? null : f))}
                onClick={() => stepBuilding(i, 1)}
                aria-label={`${b.name}，已点亮 ${stages[i]} 盏窗，回车点亮下一盏`}
                className="demo3d__focusbtn"
              >
                {b.name}
              </button>
              <span className="demo3d__stage" aria-hidden="true">{'●'.repeat(stages[i])}{'○'.repeat(6 - stages[i])}</span>
              <button type="button" className="demo3d__step" onClick={() => stepBuilding(i, -1)} aria-label={`${b.name} 减少一盏`}>−</button>
              <button type="button" className="demo3d__step" onClick={() => stepBuilding(i, 1)} aria-label={`${b.name} 点亮一盏`}>＋</button>
            </div>
          ))}
        </div>
        <button type="button" className="demo3d__play" onClick={playSequence} disabled={playing}>
          {playing ? '点亮中…' : '演示：逐窗点亮'}
        </button>
        <button type="button" className="demo3d__reset" onClick={() => setStages([0, 0, 0])}>全部熄灭</button>
      </fieldset>
    </div>
  );
}
