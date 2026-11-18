import { useState } from 'react';
import { partnerById } from '../../config/shop';
import { currentOccurrence } from '../../core/phase2/task';
import { useAppState, useController } from '../hooks';
import { Dialog } from './Dialog';
export function PlayerIdentity({ compact = false }: { compact?: boolean }) {
  const c = useController();
  const { household, selectedId, save } = useAppState();
  const [failed, setFailed] = useState(false);
  const [composing, setComposing] = useState(false);
  if (!selectedId) return null;
  const p = household.profiles.find(p => p.profileId === selectedId)!;
  const change = () => { setFailed(!c.switchPlayer()); };
  return <div className="player-identity">{!compact && <span>当前玩家：<strong>{p.name}</strong> · {save.partner ? partnerById(save.partner)?.name : '待选小伙伴'}</span>}
    <button className="btn btn--small" onClick={e => {
      e.currentTarget.focus();
      const slot = c.getState().save.activeTask;
      if (slot?.variant === 'phase2' && currentOccurrence(slot.task)?.occ.compositionActive) { setComposing(true); return; }
      window.dispatchEvent(new Event('lighttown:flush-draft')); change();
    }}>切换玩家</button>
    {composing && <Dialog title="先选好字再切换" onClose={() => setComposing(false)} actions={<><button className="btn" data-autofocus onClick={() => setComposing(false)}>返回选字</button><button className="btn" onClick={() => {
      const slot = c.getState().save.activeTask;
      if (slot?.variant === 'phase2') { const occ = currentOccurrence(slot.task)?.occ; if (occ) c.setP2Composition(occ.occurrenceId, false); }
      setComposing(false); change();
    }}>放弃本次未选定的拼音并切换</button></>}><p>已选好的文字和任务进度会保留，输入法候选窗口不能保存。</p></Dialog>}
    {failed && <Dialog title="尚未保存，关闭页面可能丢失进度" onClose={() => setFailed(false)} actions={<><button className="btn" data-autofocus onClick={() => setFailed(false)}>取消切换</button><button className="btn" onClick={() => { if (c.retrySave()) change(); }}>重试并切换</button><button className="btn" onClick={() => c.exportBackup()}>导出当前内存备份</button><button className="btn" onClick={() => { if (c.switchPlayer(true)) setFailed(false); }}>暂存本次并切换</button></>}><p>暂存只在当前页面有效，请保持页面打开并尽快导出备份。</p></Dialog>}
  </div>;
}
