import { FINGER_NAMES, KEY_FINGER, SPACE, newKeysForStage, stageDef } from '../../config/keys';
import { keyCapName } from '../text';
import { Keyboard } from './Keyboard';

/** New keys of a course stage: where they are and which finger presses them. */
export function StageKeys({ stage }: { stage: number }) {
  const keys = newKeysForStage(stage);
  return (
    <div className="stage-keys">
      <Keyboard target={null} marked={keys} label={`键盘示意图：第 ${stage} 阶的新按键 ${keys.map(keyCapName).join('、')}`} />
      <ul className="stage-keys__list">
        {keys.map((k) => (
          <li key={k}>
            <span className={`keycap${k === SPACE ? ' keycap--space' : ''}`}>{keyCapName(k)}</span>
            <span>
              用{k === SPACE ? '拇指（默认右手拇指）' : FINGER_NAMES[KEY_FINGER[k]]}
            </span>
          </li>
        ))}
      </ul>
      <p className="stage-keys__tip">{stageDef(stage).tip}</p>
    </div>
  );
}
