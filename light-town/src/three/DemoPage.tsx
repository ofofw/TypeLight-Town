import { useEffect, useRef, useState } from 'react';
import { BUILDINGS, BUILDINGS_PER_DISTRICT, DISTRICTS } from '../config/buildings';
import { TownScene } from './TownScene';
import type { TownBuildingSpec } from './TownScene';
import './demo.css';

/** 阶段 1 全镇舞台（dev-only）：12 座程序化建筑 + 四街区运镜 + 锁区/动效开关。 */
export function Town3DDemo() {
  const [stages, setStages] = useState<number[]>(() => BUILDINGS.map((_, i) => (i < 3 ? 6 : 0)));
  const [focusDistrict, setFocusDistrict] = useState(0);
  const [focusSlot, setFocusSlot] = useState<number | null>(null);
  const [highlighted, setHighlighted] = useState<number | null>(null);
  const [lockedPreview, setLockedPreview] = useState(false);
  const [reduced, setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [playing, setPlaying] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);

  const buildings: readonly TownBuildingSpec[] = BUILDINGS.map((b, i) => ({
    variant: b.id as TownBuildingSpec['variant'],
    name: b.name,
    stage: stages[i] ?? 0,
    highlighted: i === highlighted,
  }));

  function stepBuilding(i: number, delta: number) {
    setStages((s) => s.map((v, k) => (k === i ? (v + delta + 7) % 7 : v)));
  }

  function stopPlay() {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    setPlaying(false);
  }

  /** 逐窗点亮演示：本街区 3 座建筑按顺序一盏一盏点亮（reduce-motion 时直接全亮）。 */
  function playSequence() {
    if (playing) { stopPlay(); return; }
    if (reduced) {
      setStages((s) => s.map((v, k) => (Math.floor(k / BUILDINGS_PER_DISTRICT) === focusDistrict ? 6 : v)));
      return;
    }
    setPlaying(true);
    const base = focusDistrict * BUILDINGS_PER_DISTRICT;
    let step = 0;
    timer.current = setInterval(() => {
      const b = base + Math.floor(step / 6);
      const lit = (step % 6) + 1;
      setStages((s) => s.map((v, k) => (k === b ? lit : v)));
      step += 1;
      if (step >= 18) stopPlay();
    }, 420);
  }

  function goDistrict(d: number) {
    setFocusDistrict(d);
    setFocusSlot(null);
  }

  const districtOpen = lockedPreview ? [true, false, false, false] : undefined;

  return (
    <div className="demo3d">
      <header className="demo3d__header">
        <h1>点亮小镇 · 3D 全镇舞台</h1>
        <p>
          四街区连续场景：糖果程序化建筑 ×12，窗灯按灯档点亮。街区按钮运镜切换，点 3D 建筑点亮下一盏窗，
          下方焦点层验证键盘可达性；「锁定街区预览」检查未开放街区的雾罩与路牌。
          {reduced && '（已检测到系统「减少动态效果」，动画即时应用）'}
        </p>
      </header>

      <section className="demo3d__panel" aria-label="小镇全景">
        <h2>小镇全景</h2>
        <div className="demo3d__canvas demo3d__canvas--wide">
          <TownScene
            buildings={buildings}
            focusDistrict={focusDistrict}
            focusSlot={focusSlot}
            districtOpen={districtOpen}
            reducedMotion={reduced}
            onPick={(i) => stepBuilding(i, 1)}
          />
        </div>
      </section>

      <fieldset className="demo3d__controls">
        <legend>舞台控制</legend>
        <div className="demo3d__districts" role="group" aria-label="街区跳转（运镜）">
          {DISTRICTS.map((d) => (
            <button
              key={d.id}
              type="button"
              className={`demo3d__district${d.index === focusDistrict ? ' demo3d__district--on' : ''}`}
              aria-pressed={d.index === focusDistrict}
              onClick={() => goDistrict(d.index)}
            >
              {lockedPreview && d.index > 0 ? '🔒 ' : ''}{d.name}
            </button>
          ))}
        </div>
        <button type="button" className="demo3d__play" onClick={playSequence}>
          {playing ? '停止' : '连放本街区'}
        </button>
        <button type="button" className="demo3d__reset" onClick={() => setStages(BUILDINGS.map(() => 6))}>全部点亮</button>
        <button type="button" className="demo3d__reset" onClick={() => setStages(BUILDINGS.map(() => 0))}>全部熄灭</button>
        <label className="demo3d__toggle">
          <input type="checkbox" checked={lockedPreview} onChange={(e) => setLockedPreview(e.target.checked)} />
          锁定街区预览
        </label>
        <label className="demo3d__toggle">
          <input type="checkbox" checked={reduced} onChange={(e) => { stopPlay(); setReduced(e.target.checked); }} />
          reduce-motion
        </label>
      </fieldset>

      <div className="demo3d__district-list">
        {DISTRICTS.map((d) => (
          <fieldset key={d.id} className="demo3d__rows">
            <legend>{d.name}</legend>
            {BUILDINGS.slice(d.index * BUILDINGS_PER_DISTRICT, (d.index + 1) * BUILDINGS_PER_DISTRICT).map((b) => {
              const i = b.index;
              const slot = i % BUILDINGS_PER_DISTRICT;
              return (
                <div className="demo3d__row" key={b.id}>
                  <button
                    type="button"
                    className="demo3d__focusbtn"
                    onFocus={() => setHighlighted(i)}
                    onBlur={() => setHighlighted((f) => (f === i ? null : f))}
                    onClick={() => { setFocusDistrict(d.index); setFocusSlot(slot); setHighlighted(i); }}
                    aria-label={`${b.name}，已点亮 ${stages[i] ?? 0} 盏窗`}
                  >
                    {b.name}
                  </button>
                  <span className="demo3d__stage" aria-hidden="true">
                    {'●'.repeat(stages[i] ?? 0)}{'○'.repeat(6 - (stages[i] ?? 0))}
                  </span>
                  <button type="button" className="demo3d__step" onClick={() => stepBuilding(i, -1)} aria-label={`${b.name} 减少一盏`}>−</button>
                  <button type="button" className="demo3d__step" onClick={() => stepBuilding(i, 1)} aria-label={`${b.name} 点亮一盏`}>＋</button>
                </div>
              );
            })}
          </fieldset>
        ))}
      </div>
    </div>
  );
}
