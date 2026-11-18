"""Phase-2 音频核对（自动化部分）：

1. 读音链核对：pypinyin（词典/短语级）对 content.json 的 zh item 逐项给出词语读音，
   与 content.json 的 pinyin 字段比对——验证「多音字按词确定读音」的数据链。
2. 音频文件核对：每个 zh item 与 p2-* 提示都有对应 m4a；时长与字数相称、
   不静默、不削波（解码为 PCM 后检查 RMS/峰值）。
3. ASR 交叉核对（可选 --asr）：whisper-large-v3-turbo 转写每个读音，比较转写文本的
   拼音音节与目标拼音——覆盖「目标与读音一致、多音字读音正确」的机器可验证部分。

真人逐项试听仍需人工完成（见 docs/验收记录）。输出 .cache/phase2-voice-verify.json。

运行（light-town/）：
  scripts/.venv/bin/python scripts/voice/verify-phase2.py            # 1+2
  scripts/.venv/bin/python scripts/voice/verify-phase2.py --asr     # 1+2+3
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np
import soundfile as sf

ROOT = Path(__file__).resolve().parents[2]
CONTENT = json.loads((ROOT / 'src' / 'config' / 'phase2' / 'content.json').read_text())
VOICE_DIR = ROOT / 'public' / 'audio' / 'phase2' / 'voice'
OUT = ROOT / '.cache' / 'phase2-voice-verify.json'

PROMPTS = {
    'p2Intro1': '坐稳，让双手回到键盘中间。',
    'p2Intro2': '英文切英文输入，中文选择系统拼音输入法，家长可帮助设置。',
    'p2Intro3': '照着目标输入，选字后再确认。',
    'p2Select': '输入拼音，选出目标汉字，再点确认。',
    'p2Paging': '如果没有看到目标字，使用输入法候选栏的翻页按钮。',
    'p2Polyphone': '同一个字在不同词里读音可能不同，看看上面的拼音。',
    'p2Umlaut': '常见全拼用 v 输入 ü，例如绿灯可试 lv deng；按输入法选出目标字词。',
    'p2Uppercase': '按住 Shift，再按字母键。',
    'p2Question': '在常见英文键盘上按住 Shift，再按问号键。',
    'p2Period': '输入英文句号。',
    'p2Space': '两个单词之间按一次空格。',
    'p2Wrong': '再看一眼标出的地方，改好后确认。',
    'p2ConfirmIme': '选好字后，点确认。',
    'p2Paste': '检测到粘贴，请用键盘输入。粘贴不计入错误。',
    'p2ExitIme': '还没选定的拼音不会保存。先选好字，或退出后重新输入。',
    'p2Rest': '已经练习一会儿了，休息一下吧。进度会保存。',
}


def decode_m4a(path: Path) -> tuple[np.ndarray, int]:
    with tempfile.TemporaryDirectory() as tmp:
        wav = Path(tmp) / 'x.wav'
        subprocess.run(['afconvert', '-f', 'WAVE', '-d', 'LEI16', str(path), str(wav)], check=True)
        data, sr = sf.read(wav, dtype='float32')
        return data, sr


def audio_checks(line_id: str, text: str) -> dict:
    path = VOICE_DIR / f'{line_id}.m4a'
    if not path.exists():
        return {'exists': False, 'ok': False}
    wav, sr = decode_m4a(path)
    seconds = len(wav) / sr
    peak = float(np.max(np.abs(wav)))
    rms = float(np.sqrt(np.mean(wav**2)))
    chars = len([c for c in text if '\u4e00' <= c <= '\u9fff'])
    # 时长：汉字部分每字 0.18–1.5s；含拉丁字母的提示读得更快，按下限放宽。
    per_char = seconds / max(chars, 1)
    duration_ok = 0.17 <= per_char <= 1.5 and seconds >= 0.3
    silence_ok = rms > 0.01
    clipping_ok = peak <= 0.99
    return {
        'exists': True,
        'ok': duration_ok and silence_ok and clipping_ok,
        'seconds': round(seconds, 2),
        'chars': chars,
        'perChar': round(per_char, 2),
        'peak': round(peak, 3),
        'rms': round(rms, 3),
    }


def pinyin_check(items: list[dict]) -> tuple[dict, int]:
    from pypinyin import lazy_pinyin, Style

    def strip_tone(syllable: str) -> str:
        import unicodedata
        return ''.join(ch for ch in unicodedata.normalize('NFD', syllable) if unicodedata.category(ch) != 'Mn')

    report = {}
    fails = 0
    for item in items:
        text = item.get('voiceText') or item['target']
        expected = item['pinyin'].split()
        got = lazy_pinyin(text, style=Style.TONE)
        # content.json 按规范轻声不标声调：无调号的音节只比较声母韵母（本调可能不同）。
        ok = len(got) == len(expected) and all(
            g == e or (strip_tone(e) == e and strip_tone(g) == strip_tone(e))
            for g, e in zip(got, expected)
        )
        if not ok:
            fails += 1
        report[item['id']] = {'target': text, 'expected': expected, 'pypinyin': got, 'ok': ok}
    return report, fails


def tone_to_number(syllable: str) -> str:
    # 带调拼音 → 数字调（用于与 whisper 转写的拼音比对；轻声记为 5）。
    tones = {'ā': 1, 'á': 2, 'ǎ': 3, 'à': 4, 'ē': 1, 'é': 2, 'ě': 3, 'è': 4, 'ī': 1, 'í': 2, 'ǐ': 3, 'ì': 4,
             'ō': 1, 'ó': 2, 'ǒ': 3, 'ò': 4, 'ū': 1, 'ú': 2, 'ǔ': 3, 'ù': 4, 'ǖ': 1, 'ǘ': 2, 'ǚ': 3, 'ǜ': 4, 'ü': 0}
    tone = 5
    for ch, n in tones.items():
        if ch in syllable:
            tone = n if n else 5
            break
    base = ''.join(c for c in syllable if c not in tones)
    return f'{base}:{tone}'


def asr_check(items: list[dict]) -> tuple[dict, int]:
    import torch  # noqa: F401
    from transformers import pipeline
    from pypinyin import lazy_pinyin, Style

    model_dir = ROOT / 'scripts' / 'models' / 'whisper-large-v3-turbo'
    if not (model_dir / 'model.safetensors').exists():
        sys.exit('whisper model not downloaded; run download first')
    asr = pipeline('automatic-speech-recognition', model=str(model_dir), torch_dtype='float32')
    report = {}
    fails = 0
    with tempfile.TemporaryDirectory() as tmp:
        for item in items:
            lid = item['id']
            path = VOICE_DIR / f'{lid}.m4a'
            wav = Path(tmp) / 'x.wav'
            subprocess.run(['afconvert', '-f', 'WAVE', '-d', 'LEI16', str(path), str(wav)], check=True)
            result = asr(str(wav), generate_kwargs={'language': 'zh', 'task': 'transcribe'})
            transcript = (result.get('text') or '').strip().replace(' ', '').replace('。', '').replace('，', '')
            expected_syllables = [tone_to_number(s) for s in item['pinyin'].split()]
            got_syllables = sorted(tone_to_number(s) for s in lazy_pinyin(transcript, style=Style.TONE)) if transcript else []
            ok = transcript != '' and sorted(expected_syllables) == got_syllables and len(transcript) == len(item['target'])
            if not ok:
                fails += 1
            report[lid] = {'target': item['target'], 'expected': expected_syllables, 'transcript': transcript, 'got': got_syllables, 'ok': ok}
            print(f"{lid}: {transcript!r} {'OK' if ok else 'FAIL'}")
    return report, fails


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument('--asr', action='store_true')
    args = parser.parse_args()

    zh_items = [i for i in CONTENT['items'] if i['language'] == 'zh']

    # 1) 读音链
    pinyin_report, pinyin_fails = pinyin_check(zh_items)

    # 2) 音频文件
    audio_report = {}
    for item in zh_items:
        audio_report[item['id']] = audio_checks(item['id'], item.get('voiceText') or item['target'])
    for pid, text in PROMPTS.items():
        audio_report[pid] = audio_checks(pid, text)
    missing = [k for k, v in audio_report.items() if not v.get('exists')]
    bad_audio = [k for k, v in audio_report.items() if v.get('exists') and not v['ok']]

    # 3) ASR
    asr_report, asr_fails = (None, None)
    if args.asr:
        # 只对 item 读音做 ASR（多音字与读音一致性是重点）。
        asr_report, asr_fails = asr_check(zh_items)

    summary = {
        'date': subprocess.run(['date', '+%Y-%m-%d %H:%M %z'], capture_output=True, text=True).stdout.strip(),
        'zhItems': len(zh_items),
        'prompts': len(PROMPTS),
        'pinyinFails': pinyin_fails,
        'missingFiles': missing,
        'badAudio': bad_audio,
        'asrFails': asr_fails,
        'pinyin': pinyin_report,
        'audio': {k: {kk: vv for kk, vv in v.items()} for k, v in audio_report.items()},
        'asr': asr_report,
    }
    OUT.write_text(json.dumps(summary, ensure_ascii=False, indent=1))
    print(json.dumps({k: summary[k] for k in ['date', 'zhItems', 'prompts', 'pinyinFails', 'missingFiles', 'badAudio', 'asrFails']}, ensure_ascii=False, indent=1))
    print(f'report -> {OUT}')


if __name__ == '__main__':
    main()
