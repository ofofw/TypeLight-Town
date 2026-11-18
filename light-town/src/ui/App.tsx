import { PlayersPage } from './pages/PlayersPage';
import { BackupPage } from './pages/BackupPage';
import { PlayerIdentity } from './components/PlayerIdentity';
import { useEffect, useRef, useState } from 'react';
import type { Blocker, Route } from '../app/controller';
import { Dialog, isDialogOpen } from './components/Dialog';
import { SaveBanner } from './components/Chrome';
import { AlbumPage } from './pages/AlbumPage';
import { DrillPage } from './pages/DrillPage';
import { ResidentsPage } from './pages/ResidentsPage';
import { ResidentsRoutePage } from './pages/ResidentsRoutePage';
import { TaskPracticePage } from './pages/TaskPracticePage';
import { TaskPreviewPage } from './pages/TaskPreviewPage';
import { TaskResultPage } from './pages/TaskResultPage';
import { useAnimate, useAppState, useController } from './hooks';
import { FestivalPage } from './pages/FestivalPage';
import { HomePage } from './pages/HomePage';
import { OnboardingPage } from './pages/OnboardingPage';
import { ParentPage } from './pages/ParentPage';
import { PartnerPage } from './pages/PartnerPage';
import { PracticePage } from './pages/PracticePage';
import { ResultPage } from './pages/ResultPage';
import { RoutePage } from './pages/RoutePage';
import { SettingsPage } from './pages/SettingsPage';
import { SummaryPage } from './pages/SummaryPage';
import { TownPage } from './pages/TownPage';
import { WardrobePage } from './pages/WardrobePage';

function PageFor({ route }: { route: Route }) {
  switch (route.name) {
    case 'players': return <PlayersPage />;
    case 'backup': return <BackupPage />;
    case 'home':
      return <HomePage />;
    case 'partner':
      return <PartnerPage from={route.from} />;
    case 'onboarding':
      return <OnboardingPage replay={route.replay} />;
    case 'town':
      return <TownPage district={route.district} />;
    case 'practice':
      return <PracticePage autoStart={route.autoStart ?? false} />;
    case 'result':
      return <ResultPage />;
    case 'summary':
      return <SummaryPage summary={route.summary} />;
    case 'wardrobe':
      return <WardrobePage />;
    case 'route':
      return <RoutePage />;
    case 'festival':
      return <FestivalPage />;
    case 'parent':
      return <ParentPage from={route.from ?? 'town'} />;
    case 'settings':
      return <SettingsPage />;
    case 'residents':
      return <ResidentsPage />;
    case 'residents-route':
      return <ResidentsRoutePage language={route.language} />;
    case 'task-preview':
      return <TaskPreviewPage req={route.req} />;
    case 'task-practice':
      return <TaskPracticePage autoStart={route.autoStart ?? false} />;
    case 'task-result':
      return <TaskResultPage />;
    case 'drills':
      return <DrillPage language={route.language} />;
    case 'album':
      return <AlbumPage />;
  }
}

function BlockerScreen({ blocker }: { blocker: Blocker }) {
  const c = useController();
  const [confirming, setConfirming] = useState(false);
  let title = '';
  let body: string[] = [];
  let action = '';
  let onAction = () => {};
  switch (blocker.kind) {
    case 'other-tab':
      title = '游戏已在另一个页面打开';
      body = ['为了不弄乱进度，同一时间只能在一个页面里玩。', '可以回到原来的页面继续，或者在这里接着玩。'];
      action = '在这里继续玩';
      onAction = () => (c.otherPageActive() ? setConfirming(true) : c.takeOver());
      break;
    case 'conflict':
      title = '进度在别处更新了';
      body = ['另一个页面刚刚保存了新的进度。为了不覆盖它，请先导出本页备份，再重新载入。'];
      action = '导出本页备份并重新载入';
      onAction = () => { c.exportBackup(); c.reloadAfterConflict(); };
      break;
    case 'corrupt':
      title = '存档无法读取';
      body = ['这台设备上的存档和备份都损坏了，可能是浏览器数据被意外修改。', '可以选择重新开始：损坏的存档会被新的存档替换。'];
      action = '重新开始';
      onAction = () => setConfirming(true);
      break;
    case 'incompatible':
      title = '存档来自更新的版本';
      body = [
        `这台设备上的存档由更新版本的点亮小镇保存（存档版本 ${blocker.version}），当前版本无法读取。`,
        '为了保护它，本页面不会写入存档。请使用最新版本打开；也可以先临时玩一会儿，但不会保存任何进度。',
      ];
      action = '临时游玩（不保存）';
      onAction = () => c.playWithoutSaving();
      break;
  }
  return (
    <main className="page blocker" tabIndex={-1}>
      <div className="blocker__card">
        <h1>{title}</h1>
        {body.map((p) => (
          <p key={p}>{p}</p>
        ))}
        {blocker.kind === 'corrupt' && <button className="btn" onClick={() => c.go({ name: 'backup' })}>从备份文件恢复</button>}
        {(blocker.kind === 'conflict' || blocker.kind === 'other-tab') && <button className="btn" onClick={() => c.exportBackup()}>导出本页备份</button>}
        <button type="button" className="btn btn--primary btn--large" onClick={onAction}>
          {action}
        </button>
      </div>
      {confirming && blocker.kind === 'other-tab' && (
        <Dialog
          title="在这里继续玩？"
          onClose={() => setConfirming(false)}
          actions={
            <>
              <button type="button" className="btn" onClick={() => setConfirming(false)}>
                取消
              </button>
              <button
                type="button"
                className="btn btn--primary"
                data-autofocus
                onClick={() => {
                  setConfirming(false);
                  c.takeOver();
                }}
              >
                在这里继续
              </button>
            </>
          }
        >
          <p>另一个页面会立即暂停，之后要回到那里玩需要再次确认。</p>
        </Dialog>
      )}
      {confirming && blocker.kind === 'corrupt' && (
        <Dialog
          title="确定重新开始吗？"
          tone="warning"
          onClose={() => setConfirming(false)}
          actions={
            <>
              <button type="button" className="btn" data-autofocus onClick={() => setConfirming(false)}>
                取消
              </button>
              <button
                type="button"
                className="btn btn--danger"
                onClick={() => {
                  setConfirming(false);
                  c.startOverAfterCorrupt();
                }}
              >
                重新开始
              </button>
            </>
          }
        >
          <p>损坏的存档会被新的存档替换，无法恢复。</p>
        </Dialog>
      )}
    </main>
  );
}

export function App() {
  const state = useAppState();
  const c = useController();
  const animate = useAnimate();
  const mainRef = useRef<HTMLElement>(null);
  const routeKey = state.route.name;

  useEffect(() => {
    document.documentElement.dataset.motion = animate ? 'full' : 'reduced';
  }, [animate]);

  useEffect(() => {
    document.documentElement.dataset.theme = state.save.theme;
  }, [state.save.theme]);

  useEffect(() => {
    window.scrollTo(0, 0);
    const main = mainRef.current;
    if (main && !isDialogOpen() && !main.contains(document.activeElement)) main.focus({ preventScroll: true });
  }, [routeKey]);

  if (state.blocker && !(state.blocker.kind === 'corrupt' && state.route.name === 'backup')) return <BlockerScreen blocker={state.blocker} />;

  return (
    <>
      <SaveBanner />
      <PlayerIdentity key={state.generation} />
      <main ref={mainRef} key={`${routeKey}:${state.generation}`} className={`route route--${routeKey}`} tabIndex={-1}>
        <PageFor route={state.route} />
      </main>
      {state.notice === 'restored-backup' && (
        <Dialog
          title="存档已从备份恢复"
          onClose={() => c.dismissNotice()}
          actions={
            <button type="button" className="btn btn--primary" data-autofocus onClick={() => c.dismissNotice()}>
              知道了
            </button>
          }
        >
          <p>主存档无法读取，已经用上一份完好的备份恢复了进度。最近一两步的进度可能没有保留下来。</p>
        </Dialog>
      )}
    </>
  );
}
