import { useRef, useState } from 'react';
import type { AppController } from '../../app/controller';
import { useAppState, useController } from '../hooks';
import { Dialog } from '../components/Dialog';
import { ProfileSummary } from './PlayersPage';

type Preview = ReturnType<AppController['previewBackup']>;
export function BackupPage() {
  const c = useController();
  const { household, selectedId } = useAppState();
  const [preview, setPreview] = useState<Preview | null>(null);
  const [confirm, setConfirm] = useState<'restore' | 'undo' | null>(null);
  const [message, setMessage] = useState('');
  const loadId = useRef(0);
  return <div className="page backup-page"><header className="topbar"><button className="btn" onClick={() => c.go({ name: selectedId ? 'settings' : 'players' })}>返回</button><h1>备份与恢复</h1></header>
    <section className="card"><h2>保管两个人的进度</h2><p>进度保存在当前浏览器；复制游戏文件不会带走进度，换浏览器或移动使用请导出备份。</p><p>文件包含两人的名字、全部进度和未完成任务。请保管好下载的文件。</p>
      <button className="btn btn--primary" onClick={() => { try { setMessage(c.exportBackup()); } catch (e) { setMessage(e instanceof Error ? e.message : '下载未能发起，请重试。原进度不变。'); } }}>导出两人备份</button>
      {household.lastExportRequestedAt && <p>上次已发起导出：{new Date(household.lastExportRequestedAt).toLocaleString()}</p>}
    </section>
    <section className="card"><h2>从文件恢复两人进度</h2><p>只接受本游戏导出的双人 JSON 备份，最大 20 MiB。先预览，再确认；不会合并金币或进度。</p>
      <label className="backup-file">选择备份文件<input type="file" accept=".json,application/json" onChange={async e => {
        const file = e.target.files?.[0]; e.target.value = ''; const id = ++loadId.current;
        setPreview(null); setMessage('');
        if (!file) return;
        if (file.size > 20 * 1024 * 1024 || !/\.json$/i.test(file.name)) { setMessage('请选择不超过 20 MiB 的 JSON 文件'); return; }
        try { const raw = await file.text(); if (id === loadId.current) setPreview(c.previewBackup(raw)); }
        catch (e) { if (id === loadId.current) setMessage(e instanceof Error ? e.message : '文件无法读取'); }
      }} /></label>
    </section>
    {message && <p className="notice-line" role="status">{message}</p>}
    {preview && <section className="card"><h2>恢复预览</h2><p>备份时间：{new Date(preview.backup.exportedAt).toLocaleString()}</p>
      {Date.parse(preview.backup.exportedAt) < household.updatedAt && <p className="notice-line">这份备份早于当前进度，恢复后会回到备份时的状态。</p>}
      <div className="players-grid"><div><h3>当前两名玩家</h3>{household.profiles.map(p => <ProfileSummary key={p.profileId} profile={p} />)}</div><div><h3>文件中的两名玩家</h3>{preview.backup.profiles.map(p => <ProfileSummary key={p.profileId} profile={p} />)}</div></div>
      <p>将替换两名玩家的全部进度，不合并。可撤销最近一次恢复。</p>
      <button className="btn" onClick={() => setPreview(null)}>取消预览</button> <button className="btn btn--primary" onClick={() => setConfirm('restore')}>恢复这份备份</button>
    </section>}
    {household.undoRestore && <section className="card"><h2>撤销上次恢复</h2><p>恢复到 {new Date(household.undoRestore.capturedAt).toLocaleString()} 覆盖前的两人进度。</p>
      <div className="players-grid">{household.undoRestore.profiles.map(p => <div key={p.profileId}><ProfileSummary profile={p} /></div>)}</div>
      <button className="btn" onClick={() => setConfirm('undo')}>撤销上次恢复</button>
    </section>}
    {confirm && <Dialog title={confirm === 'restore' ? '确认替换两名玩家的全部进度？' : '确认撤销上次恢复？'} tone="warning" onClose={() => setConfirm(null)} actions={<><button className="btn" data-autofocus onClick={() => setConfirm(null)}>取消</button><button className="btn btn--danger" onClick={() => {
      const error = confirm === 'restore' && preview ? c.restoreBackup(preview) : c.undoRestore();
      if (error) setMessage(error); setConfirm(null);
    }}>确认{confirm === 'restore' ? '整体恢复' : '撤销恢复'}</button></>}><p>{confirm === 'restore' ? '当前两人的角色、金币、课程和未完成任务都将替换为备份中的状态。' : '恢复后新玩的进度会丢弃，撤销后不能重做。'}</p></Dialog>}
  </div>;
}
