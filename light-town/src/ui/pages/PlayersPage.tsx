import { useState } from 'react';
import { PartnerArt } from '../../art/partners';
import { partnerById } from '../../config/shop';
import type { Profile } from '../../core/save/profiles';
import { useAppState, useController } from '../hooks';
import { completedBuildings } from '../town';
import { Dialog } from '../components/Dialog';

export function ProfileSummary({ profile }: { profile: Profile }) {
  const s = profile.game;
  return <><h2>{profile.name}</h2><p>{s.partner ? partnerById(s.partner)?.name : '还未选择小伙伴'}</p>
    <p>建筑 {completedBuildings(s)}/12 · 故事 {s.phase2.storyDone.length}/72</p>
    <p>灯光币 {s.coins} · {s.activeTask ? '有未完成任务' : '准备好开始'}</p></>;
}
export function PlayersPage() {
  const c = useController();
  const { household } = useAppState();
  const [editing, setEditing] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  return <div className="page players-page"><h1>今天谁来点亮小镇？</h1><p className="lead">选择自己的名字，小伙伴和进度会各自保留。</p>
    <div className="players-grid">{household.profiles.map(p => <section className="card player-card" key={p.profileId}>
      <div className="player-card__art"><PartnerArt title={`${p.name}的小伙伴`} partner={p.game.partner ?? 'nuannuan'} pose="idle" animate={false} equipped={p.game.equipped} /></div>
      <ProfileSummary profile={p} />
      <button className="btn btn--primary btn--large" onClick={() => c.selectPlayer(p.profileId)}>我是{p.name}</button>
      <button className="btn btn--ghost" onClick={() => { setEditing(p.profileId); setName(p.name); setError(null); }}>修改{p.name}的名字</button>
    </section>)}</div>
    <button className="btn" onClick={() => c.go({ name: 'backup' })}>备份与恢复</button>
    {editing && <Dialog title="修改玩家名字" onClose={() => setEditing(null)} actions={<><button className="btn" onClick={() => setEditing(null)}>取消</button><button className="btn btn--primary" onClick={() => { const e = c.renamePlayer(editing, name); setError(e); if (!e) setEditing(null); }}>保存名字</button></>}>
      <label>玩家名字<input className="profile-name-input" value={name} data-autofocus onChange={e => setName(e.target.value)} /></label><p>1–12 个字，两个人使用不同的名字。</p>{error && <p role="alert">{error}</p>}
    </Dialog>}
  </div>;
}
