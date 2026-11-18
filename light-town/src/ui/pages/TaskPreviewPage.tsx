import { LifeEffect } from '../../art/phase2/LifeScene';
import type { Phase2Language } from '../../config/phase2/content';
import { phase2Item, phase2Task } from '../../config/phase2/content';
import { PHASE2_RULES } from '../../config/phase2/rules';
import { p2StartError, p2TaskTitle } from '../../core/phase2/task';
import type { P2StartRequest } from '../../core/phase2/task';
import { TopBar } from '../components/Chrome';
import { Icon } from '../components/Icon';
import { useAppState, useController } from '../hooks';
import { buildName } from '../text';
import { useTaskStarter } from '../useTaskStarter';

/** P04b 任务预览：建筑、语言、三步故事、固定题量、奖励；开始前有旧任务先三选一。 */
export function TaskPreviewPage({ req }: { req: P2StartRequest }) {
  const c = useController();
  const { save } = useAppState();
  const { begin, dialog, error } = useTaskStarter();

  const story = req.kind === 'story' ? phase2Task(req.taskId) : null;
  // 有未完成任务时仍可点“开始”——点击后出现三选一对话框；其他错误才锁定。
  const startError = p2StartError(save, req);
  const locked = startError !== null && startError !== 'has-active-task';
  const firstReward =
    req.kind === 'story' && story && !save.phase2.storyDone.includes(story.id) ? PHASE2_RULES.rewards.storyFirst : PHASE2_RULES.rewards.repeat;
  const language: Phase2Language = req.kind === 'errand' || req.kind === 'drill' ? req.language : story!.language;

  return (
    <div className="page task-preview">
      <TopBar
        title={p2TaskTitle(req)}
        onBack={() => c.go(req.kind === 'story' ? { name: 'residents-route', language } : req.kind === 'drill' ? { name: 'drills', language } : { name: 'residents' })}
        backLabel={req.kind === 'story' ? '故事任务' : req.kind === 'drill' ? '专项练习' : '居民任务'}
      />
      {error && (
        <p className="notice-line" role="alert">
          {error}
        </p>
      )}

      <div className="card task-preview__card">
        <div className="task-preview__head">
          <span className={`chip chip--lang ${language === 'zh' ? 'chip--zh' : 'chip--en'}`}>{language === 'zh' ? '中文' : '英文'}</span>
          <span className="task-preview__building">{buildName(req.kind === 'story' ? story!.buildingId : 'lamp-house')}</span>
        </div>

        {story ? (
          <>
            <p>{story.intro}</p>
            <ol className="task-intro-steps">
              {story.steps.map((s, i) => (
                <li key={i}>
                  第 {i + 1} 步：{s.title}（{s.targetCount} 题）
                </li>
              ))}
            </ol>
            <p className="task-preview__targets">
              练习目标：
              {story.focusItemIds.map((id) => (
                <span key={id} className="chip">
                  {language === 'zh' ? `${phase2Item(id)?.target}（${phase2Item(id)?.pinyin}）` : phase2Item(id)?.target}
                </span>
              ))}
            </p>
            {story.reviewItemIds.length > 0 && (
              <p className="hint-line">同时会复习之前学过的内容。</p>
            )}
            <p className="hint-line">固定 {story.targetCount} 题，开始后不加题；10–20 分钟只是设计目标，提前完成正常结算。</p>
          </>
        ) : (
          <>
            <p>
              {req.kind === 'errand'
                ? '居民们请你帮忙：把已经学过的内容再练一遍（易错、到期复习和其他已学内容都会出现）。'
                : '只练这一类内容，题目都来自你已经学过的部分。'}
            </p>
            <p className="hint-line">
              {req.kind === 'errand' ? '每轮题数开始时确定：中文最多 36 题（学了词语后 24 题），英文最多 30 题（学了短句后 18 题）。' : '每轮固定 10 题。'}
            </p>
          </>
        )}

        <p className="task-preview__reward">
          <Icon name="coin" size={24} />
          {firstReward === PHASE2_RULES.rewards.storyFirst
            ? `首次完成 ${PHASE2_RULES.rewards.storyFirst} 个灯光币；重玩每次 ${PHASE2_RULES.rewards.repeat} 个`
            : `完整完成 ${PHASE2_RULES.rewards.repeat} 个灯光币`}
        </p>
        <p className="hint-line">奖励不按速度、错误或帮助扣减；这一轮不会推进第一阶段课程或建筑。</p>

        <div className="page-actions">
          {locked ? (
            <button type="button" className="btn btn--large btn--locked" disabled>
              <Icon name="lock" size={22} />
              {startError === 'empty-pool' ? '先完成一个相关故事任务吧' : '还没有开放'}
            </button>
          ) : (
            <button type="button" className="btn btn--primary btn--large" onClick={() => begin(req)}>
              <Icon name="play" size={24} />
              开始任务
            </button>
          )}
        </div>
        <p className="hint-line">开始前如果有未完成任务，会先问“继续原任务 / 放弃并开始 / 取消”。</p>
      </div>

      <div className="task-preview__effect" aria-hidden="true">
        <LifeEffect
          buildingId={req.kind === 'story' ? story!.buildingId : 'lamp-house'}
          theme={save.theme}
          animate={false}
          title="建筑生活场景预览"
          className="life-effect life-effect--preview"
        />
      </div>
      {dialog}
    </div>
  );
}
