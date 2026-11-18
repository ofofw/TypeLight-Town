import { useId, useState } from 'react';
import { partnerById } from '../../config/shop';
import type { Settings } from '../../core/types';
import { TopBar } from '../components/Chrome';
import { Dialog } from '../components/Dialog';
import { Icon } from '../components/Icon';
import { useAppState, useAudioStatus, useController, useSystemReducedMotion } from '../hooks';
import { STORAGE_NOTES } from '../text';

type Channel = 'music' | 'sfx' | 'voice';
const CHANNELS: { key: Channel; volume: 'musicVolume' | 'sfxVolume' | 'voiceVolume'; label: string }[] = [
  { key: 'music', volume: 'musicVolume', label: '音乐' },
  { key: 'sfx', volume: 'sfxVolume', label: '音效' },
  { key: 'voice', volume: 'voiceVolume', label: '语音' },
];

function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={checked} className="switch" disabled={disabled} onClick={() => onChange(!checked)}>
      <span className="switch__track" aria-hidden="true">
        <span className="switch__thumb" />
      </span>
      <span className="switch__label">{label}</span>
      <span className="switch__state">{checked ? '开' : '关'}</span>
    </button>
  );
}

function ChannelRow({ ch, settings, onChange }: { ch: (typeof CHANNELS)[number]; settings: Settings; onChange: (p: Partial<Settings>) => void }) {
  const id = useId();
  const enabled = settings[ch.key];
  return (
    <div className="setting-row">
      <Switch checked={enabled} label={ch.label} onChange={(v) => onChange({ [ch.key]: v })} disabled={settings.masterMute} />
      <label className="volume" htmlFor={id}>
        <span className="visually-hidden">{ch.label}音量</span>
        <input
          id={id}
          type="range"
          min={0}
          max={100}
          step={5}
          value={Math.round(settings[ch.volume] * 100)}
          disabled={settings.masterMute || !enabled}
          onChange={(e) => onChange({ [ch.volume]: Number(e.target.value) / 100 })}
          aria-valuetext={`${Math.round(settings[ch.volume] * 100)}%`}
        />
        <span className="volume__value" aria-hidden="true">
          {Math.round(settings[ch.volume] * 100)}%
        </span>
      </label>
    </div>
  );
}

/** P12 设置 */
export function SettingsPage() {
  const c = useController();
  const { save, saveIssue, household, selectedId } = useAppState();
  const audio = useAudioStatus();
  const systemReduced = useSystemReducedMotion();
  const [clearStep, setClearStep] = useState<0 | 1 | 2>(0);
  const [clearFailed, setClearFailed] = useState(false);
  const [guideHint, setGuideHint] = useState(false);
  const playerName = household.profiles.find(p => p.profileId === selectedId)?.name ?? '';
  const settings = save.settings;
  const partner = save.partner ? partnerById(save.partner) : null;
  const backTo = save.onboarded ? { name: 'town' as const } : { name: 'home' as const };

  return (
    <div className="page settings">
      <TopBar title="设置" onBack={() => c.go(backTo)} backLabel={save.onboarded ? '小镇' : '首页'} />
      <div className="settings__grid">
        <section className="card" aria-labelledby="s-sound">
          <h2 id="s-sound">声音</h2>
          <div className="setting-row">
            <Switch
              checked={!settings.masterMute}
              label="全部声音"
              onChange={(on) => {
                c.audio.unlock();
                c.setSettings({ masterMute: !on });
              }}
            />
          </div>
          {CHANNELS.map((ch) => (
            <ChannelRow
              key={ch.key}
              ch={ch}
              settings={settings}
              onChange={(p) => {
                c.audio.unlock();
                c.setSettings(p);
              }}
            />
          ))}
          {audio === 'blocked' && <p className="hint-line">浏览器暂时没有放出声音。点一下“全部声音”或页面上的声音按钮再试。</p>}
          {audio === 'failed' && (
            <p className="hint-line">
              有声音文件没有加载成功，游戏照常可以玩。
              <button type="button" className="btn btn--small btn--ghost" onClick={() => c.audio.retry()}>
                <Icon name="retry" size={18} />
                重新加载声音
              </button>
            </p>
          )}
          <p className="hint-line">所有提示都有文字，关掉声音也能正常玩。</p>
        </section>

        <section className="card" aria-labelledby="s-motion">
          <h2 id="s-motion">动画</h2>
          <div className="setting-row">
            <Switch checked={settings.reduceMotion} label="减少动画" onChange={(v) => c.setSettings({ reduceMotion: v })} />
          </div>
          <p className="hint-line">
            {systemReduced
              ? '这台设备已经开启了“减少动态效果”，游戏会一直使用简化动画。'
              : '开启后，庆祝和闪烁会换成简单的淡入，不影响进度和奖励。'}
          </p>
        </section>

        <section className="card" aria-labelledby="s-learn">
          <h2 id="s-learn">指法和小伙伴</h2>
          <div className="setting-actions">
            <button type="button" className="btn" onClick={() => c.go({ name: 'onboarding', replay: true })}>
              <Icon name="replay" size={22} />
              重看指法讲解
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => {
                c.replayP2Guide();
                setGuideHint(true);
              }}
            >
              <Icon name="replay" size={22} />
              重看输入法引导
            </button>
            <button type="button" className="btn" onClick={() => c.go({ name: 'partner', from: 'settings' })}>
              更换小伙伴{partner ? `（现在是${partner.name}）` : ''}
            </button>
          </div>
          {guideHint && <p className="notice-line" role="status">下次进入居民任务的练习时，会重新展示三张输入法引导卡。</p>}
          <p className="hint-line">更换小伙伴不会影响进度、灯光币和已买的饰品。</p>
        </section>

        <section className="card" aria-labelledby="s-storage">
          <h2 id="s-storage">存档</h2>
          <button className="btn btn--primary" onClick={() => c.go({ name: 'backup' })}>备份与恢复</button>
          <ul className="plain-list">
            {STORAGE_NOTES.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
          {saveIssue !== null && <p className="notice-line">现在的进度没有保存在这台设备上，关闭页面后会丢失。</p>}
          <button type="button" className="btn btn--danger" onClick={() => setClearStep(1)}>
            清空{playerName}的游戏进度
          </button>
          {clearFailed && (
            <p className="notice-line" role="alert">
              清除没有成功，原来的进度还在。可以稍后再试。
            </p>
          )}
        </section>
      </div>

      {clearStep === 1 && (
        <Dialog
          title={`要清空${playerName}的游戏进度吗？`}
          tone="warning"
          onClose={() => setClearStep(0)}
          actions={
            <>
              <button type="button" className="btn btn--primary" data-autofocus onClick={() => setClearStep(0)}>
                不清除
              </button>
              <button type="button" className="btn" onClick={() => setClearStep(2)}>
                继续
              </button>
            </>
          }
        >
          <p>清除后，建筑、课程、灯光币、饰品、主题和练习记录都会回到最开始。</p>
        </Dialog>
      )}
      {clearStep === 2 && (
        <Dialog
          title="最后确认"
          tone="warning"
          onClose={() => setClearStep(0)}
          actions={
            <>
              <button type="button" className="btn btn--primary" data-autofocus onClick={() => setClearStep(0)}>
                取消
              </button>
              <button
                type="button"
                className="btn btn--danger"
                onClick={() => {
                  setClearStep(0);
                  setClearFailed(!c.clearProgress());
                }}
              >
                确认清空{playerName}的进度
              </button>
            </>
          }
        >
          <p className="dialog__strong">{playerName}的游戏进度将被删除；另一名玩家不受影响。名字与声音、动画偏好保留。也会删除上次恢复的撤销记录。</p>
        </Dialog>
      )}
    </div>
  );
}
