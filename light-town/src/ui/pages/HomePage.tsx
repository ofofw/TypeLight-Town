import { DistrictScene } from '../../art/buildings';
import { BUILDING_COUNT } from '../../config/buildings';
import { GoalCard } from '../components/GoalCard';
import { SoundButton } from '../components/Chrome';
import { Icon } from '../components/Icon';
import { useAppState, useController } from '../hooks';
import { districtName } from '../text';
import { completedBuildings, currentSlot, districtStages, focusDistrict } from '../town';

function activeP2Title(save: { activeTask: unknown }): string | null {
  const slot = save.activeTask as { variant: string; task?: { language: string } } | null;
  if (slot && slot.variant === 'phase2' && slot.task) return slot.task.language === 'zh' ? '中文任务' : '英文任务';
  return null;
}

/** P01 首页 */
export function HomePage() {
  const c = useController();
  const { save } = useAppState();
  const hasSave = save.partner !== null;
  const district = focusDistrict(save);
  const activeP2 = activeP2Title(save);
  return (
    <div className="page home">
      <div className="home__corner">
        <button type="button" className="btn btn--ghost" onClick={() => c.go({ name: 'parent', from: 'home' })}>
          <Icon name="parent" size={22} />
          家长
        </button>
        <SoundButton />
      </div>
      <h1 className="home__title">点亮小镇</h1>
      <p className="home__subtitle">用键盘，把小镇的灯一盏一盏点亮</p>
      <div className="home__preview">
        <DistrictScene
          district={district}
          stages={districtStages(save, district)}
          current={currentSlot(save, district)}
          theme={save.theme}
          animate={false}
          title={`小镇预览：${districtName(district)}`}
        />
      </div>
      <button type="button" className="btn btn--primary btn--huge home__start" onClick={() => c.enter()}>
        <Icon name="star" size={28} />
        {hasSave ? '继续点亮' : '开始点亮'}
      </button>
      {hasSave && (
        <button type="button" className="btn btn--large home__residents" onClick={() => c.go({ name: 'residents' })}>
          <Icon name="route" size={24} />
          居民任务{activeP2 ? '（继续练习）' : ''}
        </button>
      )}
      {hasSave && (
        <p className="home__progress">
          已点亮 {completedBuildings(save)}/{BUILDING_COUNT} 座建筑 · 第 {save.course.stage} 阶课程
        </p>
      )}
      {hasSave && <GoalCard />}
      <p className="home__keyboard-note">需要实体键盘（iPad 请连接外接键盘）</p>
    </div>
  );
}
