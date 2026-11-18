import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { DISTRICT_SLOTS, DISTRICT_VIEWBOX, DistrictScene } from '../../art/buildings';
import { PartnerArt } from '../../art/partners';
import { BUILDINGS, BUILDING_COUNT, BUILDINGS_PER_DISTRICT, DISTRICTS, STAGES_PER_BUILDING } from '../../config/buildings';
import { partnerById } from '../../config/shop';
import { allBuildingsDone, p1Level, remainingBuildings } from '../../core/game';
import { residentBuildings } from '../../core/phase2/story';
import { CoinBadge, SoundButton } from '../components/Chrome';
import { Icon } from '../components/Icon';
import { useAnimate, useAppState, useController } from '../hooks';
import { buildingName, levelHeading, stageNewKeysText, stageProgressText } from '../text';
import { DISTRICT_COUNT, currentSlot, districtOpen, districtStages, focusDistrict } from '../town';
import { useStarter } from '../useStarter';

/** P04 小镇 */
export function TownPage({ district }: { district?: number }) {
  const c = useController();
  const { save } = useAppState();
  const animate = useAnimate();
  const [index, setIndex] = useState(() => district ?? focusDistrict(save));
  const { begin, dialog, error } = useStarter();
  const scroller = useRef<HTMLDivElement>(null);
  const indexRef = useRef(index);
  indexRef.current = index;

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    el.scrollLeft = indexRef.current * el.clientWidth;
    const onResize = () => {
      el.scrollLeft = indexRef.current * el.clientWidth;
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const goTo = (i: number) => {
    const el = scroller.current;
    const next = Math.max(0, Math.min(DISTRICT_COUNT - 1, i));
    setIndex(next);
    el?.scrollTo({ left: next * el.clientWidth, behavior: animate ? 'smooth' : 'auto' });
  };

  const onScroll = () => {
    const el = scroller.current;
    if (!el || el.clientWidth === 0) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    if (i !== indexRef.current) setIndex(i);
  };

  const done = allBuildingsDone(save);
  const active = p1Level(save);
  const p2slot = save.activeTask;
  const activeP2 = p2slot && p2slot.variant === 'phase2' ? p2slot.task : null;
  const partner = save.partner ? partnerById(save.partner) : null;
  const current = save.currentBuilding;
  // 居民入住（2026-11-17）：中英文 6 个故事全完成的建筑，在地图上亮一扇新居民窗（纯派生）。
  const residents = residentBuildings(save.phase2.storyDone);

  return (
    <div className="page town">
      <header className="topbar topbar--town">
        <h1 className="topbar__title">点亮小镇</h1>
        <nav className="town-nav" aria-label="小镇菜单">
          <button type="button" className="icon-btn" onClick={() => c.go({ name: 'wardrobe' })}>
            <Icon name="hanger" />
            <span className="icon-btn__label">衣柜</span>
          </button>
          <button type="button" className="icon-btn" onClick={() => c.go({ name: 'route' })}>
            <Icon name="route" />
            <span className="icon-btn__label">学习路线</span>
          </button>
          <button type="button" className="icon-btn" onClick={() => c.go({ name: 'residents' })}>
            <Icon name="home" />
            <span className="icon-btn__label">居民任务</span>
          </button>
          <button type="button" className="icon-btn" onClick={() => c.go({ name: 'festival' })}>
            <Icon name="star" />
            <span className="icon-btn__label">灯光节</span>
          </button>
          <button type="button" className="icon-btn" onClick={() => c.go({ name: 'parent' })}>
            <Icon name="parent" />
            <span className="icon-btn__label">家长</span>
          </button>
          <button type="button" className="icon-btn" onClick={() => c.go({ name: 'settings' })}>
            <Icon name="gear" />
            <span className="icon-btn__label">设置</span>
          </button>
        </nav>
        <div className="topbar__actions">
          <CoinBadge />
          <SoundButton />
        </div>
      </header>

      {active && (
        <div className="resume-banner" role="status">
          <span>
            还有一关没有完成：{levelHeading(active)}（已完成 {active.pos}/{active.targets.length}）
          </span>
          <span className="resume-banner__actions">
            <button type="button" className="btn btn--primary" onClick={() => c.continueActive()}>
              继续上次
            </button>
            <button type="button" className="btn" onClick={() => c.restartActive()}>
              重新开始
            </button>
          </span>
        </div>
      )}
      {activeP2 && (
        <div className="resume-banner" role="status">
          <span>
            居民任务还没完成：{activeP2.title}（已完成 {activeP2.items.filter((o) => o.completed).length}/{activeP2.items.length}）
          </span>
          <span className="resume-banner__actions">
            <button type="button" className="btn btn--primary" onClick={() => c.continueActive()}>
              继续练习
            </button>
          </span>
        </div>
      )}

      <div className="town__layout">
        <section className="town__map" aria-label="小镇地图">
          <div className="district-tabs" role="group" aria-label="切换街区">
            <button type="button" className="icon-btn" disabled={index === 0} onClick={() => goTo(index - 1)} aria-label="上一个街区">
              <Icon name="left" />
            </button>
            {DISTRICTS.map((d) => (
              <button
                key={d.id}
                type="button"
                className={`district-tab${d.index === index ? ' district-tab--on' : ''}`}
                aria-pressed={d.index === index}
                onClick={() => goTo(d.index)}
              >
                {!districtOpen(save, d.index) && <Icon name="lock" size={18} />}
                {d.name}
              </button>
            ))}
            <button
              type="button"
              className="icon-btn"
              disabled={index === DISTRICT_COUNT - 1}
              onClick={() => goTo(index + 1)}
              aria-label="下一个街区"
            >
              <Icon name="right" />
            </button>
          </div>
          <div className="district-scroller" ref={scroller} onScroll={onScroll}>
            {DISTRICTS.map((d) => {
              const open = districtOpen(save, d.index);
              return (
                <section key={d.id} className="district" aria-label={`${d.name}：${d.description}`}>
                  <div className="district__scene" style={{ aspectRatio: `${DISTRICT_VIEWBOX.width} / ${DISTRICT_VIEWBOX.height}` }}>
                    <DistrictScene
                      district={d.index}
                      stages={districtStages(save, d.index)}
                      current={currentSlot(save, d.index)}
                      theme={save.theme}
                      animate={animate && d.index === index}
                      title={`${d.name}街区`}
                      className="district__svg"
                    />
                    {open &&
                      DISTRICT_SLOTS[d.index].map((slot, s) => {
                        const b = d.index * BUILDINGS_PER_DISTRICT + s;
                        const stage = save.buildings[b];
                        const hasResident = residents.includes(BUILDINGS[b].id);
                        const style: CSSProperties = {
                          left: `${(slot.x / DISTRICT_VIEWBOX.width) * 100}%`,
                          top: `${((slot.y + 14) / DISTRICT_VIEWBOX.height) * 100}%`,
                        };
                        if (b < current) {
                          return (
                            <button key={b} type="button" className="building-chip building-chip--done" style={style} onClick={() => begin({ entry: 'replay', building: b })}>
                              <span className="building-chip__name">
                                {BUILDINGS[b].name}
                                {hasResident && (
                                  <span className="building-chip__resident">
                                    <Icon name="resident" size={14} />
                                    新居民
                                  </span>
                                )}
                              </span>
                              <span className="building-chip__state">
                                <Icon name="check" size={16} />
                                已点亮 · 重练
                              </span>
                            </button>
                          );
                        }
                        if (b === current) {
                          return (
                            <button key={b} type="button" className="building-chip building-chip--current" style={style} onClick={() => begin({ entry: 'light' })}>
                              <span className="building-chip__name">
                                {BUILDINGS[b].name}
                                {hasResident && (
                                  <span className="building-chip__resident">
                                    <Icon name="resident" size={14} />
                                    新居民
                                  </span>
                                )}
                              </span>
                              <span className="building-chip__state">
                                {stageProgressText(stage)} · 继续点亮
                              </span>
                            </button>
                          );
                        }
                        return (
                          <div key={b} className="building-chip building-chip--later" style={style}>
                            <span className="building-chip__name">
                              {BUILDINGS[b].name}
                              {hasResident && (
                                  <span className="building-chip__resident">
                                    <Icon name="resident" size={14} />
                                    新居民
                                  </span>
                                )}
                            </span>
                            <span className="building-chip__state">
                              <Icon name="lock" size={16} />
                              点亮{BUILDINGS[b - 1].name}后开放
                            </span>
                          </div>
                        );
                      })}
                    {!open && (
                      <div className="district__locked">
                        <Icon name="lock" size={32} />
                        <p>
                          {d.name}还没开放
                          <br />
                          点亮{DISTRICTS[d.index - 1]?.name}的 3 座建筑后，这里就会亮起来。
                        </p>
                      </div>
                    )}
                  </div>
                </section>
              );
            })}
          </div>
          <p className="hint-line town__scroll-hint">可以左右滑动地图，或点上面的街区名字切换。</p>
        </section>

        <aside className="town__side">
          {partner && save.partner && (
            <div className="town__partner">
              <PartnerArt partner={save.partner} pose="idle" equipped={save.equipped} animate={animate} title={`${partner.name}在等你`} className="town__partner-art" />
              <p className="town__partner-name">{partner.name}</p>
            </div>
          )}
          {!done ? (
            <div className="card town__goal">
              <h2>现在点亮：{buildingName(current)}</h2>
              <p className="town__goal-progress">{stageProgressText(save.buildings[current])}</p>
              <p>
                下一个目标：第 {save.buildings[current] + 1} 盏灯。每完成一关点亮 1 盏，点亮 {STAGES_PER_BUILDING} 盏后这座建筑就完成了。
              </p>
              <button type="button" className="btn btn--primary btn--large btn--block" onClick={() => begin({ entry: 'light' })}>
                <Icon name="star" size={24} />
                继续点亮
              </button>
            </div>
          ) : (
            <div className="card town__goal">
              <h2>{BUILDING_COUNT} 座建筑全部点亮啦！</h2>
              <p>灯光节已经开放。也可以继续学习新的按键课程。</p>
              <button type="button" className="btn btn--primary btn--large btn--block" onClick={() => begin({ entry: 'learn' })}>
                继续学习
              </button>
              <button type="button" className="btn btn--block" onClick={() => c.go({ name: 'festival' })}>
                <Icon name="star" size={22} />
                去灯光节
              </button>
            </div>
          )}
          <div className="card town__course">
            <h2>
              {save.course.allComplete ? '全部按键课程已完成' : `课程：第 ${save.course.stage} 阶`}
            </h2>
            {!save.course.allComplete && <p>这一阶的新按键：{stageNewKeysText(save.course.stage)}</p>}
            {!save.course.allComplete && save.course.lastQualifying && <p className="soft-note">再完成一关准确率 90% 以上的本阶练习，就能学新按键。</p>}
            {!done && <p className="hint-line">还有 {remainingBuildings(save)} 座建筑等你点亮。</p>}
          </div>
          {save.session && (
            <button type="button" className="btn btn--block" onClick={() => c.endSessionNow()}>
              结束本次，看看成果
            </button>
          )}
        </aside>
      </div>

      {error && (
        <p className="notice-line town__error" role="alert">
          {error}
        </p>
      )}
      {dialog}
    </div>
  );
}
