"""Checks the generated voice files by transcribing them with Whisper and comparing with the script text.

Compares toneless pinyin syllables (so simplified/traditional output and homophones do not count as errors) and
fails when any line differs by more than MAX_SYLLABLE_ERROR. It also prints the pinyin Kokoro's text frontend
chose for the polyphonic characters in the script, so readings such as 还(hái) and 着急(zháo) can be checked.

  scripts/.venv/bin/pip install -r scripts/voice/requirements-verify.txt   # once
  scripts/.venv/bin/python scripts/voice/download_model.py --whisper       # once
  scripts/.venv/bin/python scripts/voice/verify.py
"""

from __future__ import annotations

import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np
import soundfile as sf
from pypinyin import Style, lazy_pinyin

ROOT = Path(__file__).resolve().parents[2]
VOICE_DIR = ROOT / 'public' / 'audio' / 'voice'
WHISPER_DIR = ROOT / 'scripts' / 'models' / 'whisper-large-v3-turbo'
MAX_SYLLABLE_ERROR = 0.10


def load_lines() -> dict[str, str]:
    out = subprocess.run(['node', str(ROOT / 'scripts' / 'voice' / 'lines.mjs')], check=True, capture_output=True, text=True)
    return json.loads(out.stdout)


def decode(path: Path) -> np.ndarray:
    with tempfile.TemporaryDirectory() as tmp:
        wav = Path(tmp) / 'line.wav'
        subprocess.run(['afconvert', '-f', 'WAVE', '-d', 'LEI16@16000', '-c', '1', str(path), str(wav)], check=True)
        audio, rate = sf.read(wav, dtype='float32')
    assert rate == 16000
    return audio


def syllables(text: str) -> list[str]:
    hanzi = ''.join(re.findall(r'[\u4e00-\u9fff]', text))
    return lazy_pinyin(hanzi, style=Style.NORMAL)


def edit_distance(a: list[str], b: list[str]) -> int:
    row = list(range(len(b) + 1))
    for i, x in enumerate(a, 1):
        prev, row[0] = row[0], i
        for j, y in enumerate(b, 1):
            prev, row[j] = row[j], min(row[j] + 1, row[j - 1] + 1, prev + (x != y))
    return row[-1]


def main() -> None:
    import torch
    from transformers import pipeline

    lines = load_lines()
    asr = pipeline('automatic-speech-recognition', model=str(WHISPER_DIR), torch_dtype=torch.float32, device='cpu')
    failures = []
    results = {}
    for line_id, text in lines.items():
        path = VOICE_DIR / f'{line_id}.m4a'
        if not path.exists():
            failures.append(f'{line_id}: missing file')
            continue
        audio = decode(path)
        heard = asr(
            {'raw': audio, 'sampling_rate': 16000},
            generate_kwargs={'language': 'zh', 'task': 'transcribe'},
        )['text'].strip()
        expected, got = syllables(text), syllables(heard)
        rate = edit_distance(expected, got) / max(1, len(expected))
        results[line_id] = {'text': text, 'heard': heard, 'syllableError': round(rate, 3), 'seconds': round(len(audio) / 16000, 2)}
        mark = 'ok ' if rate <= MAX_SYLLABLE_ERROR else 'BAD'
        print(f'{mark} {line_id:14} {rate:5.1%}  {heard}')
        if rate > MAX_SYLLABLE_ERROR:
            failures.append(f'{line_id}: {rate:.0%} heard "{heard}"')

    from kokoro import KPipeline

    g2p = KPipeline(lang_code='z', repo_id='hexgrad/Kokoro-82M-v1.1-zh', model=False).g2p
    for phrase in ['还能', '着急', '一个字母一个字母地拼出', '中间', '空格键', '一共', '没关系', '一盏一盏', '颜色']:
        ps, _ = g2p(phrase)
        print(f'frontend  {phrase}: {ps}')

    (ROOT / '.cache').mkdir(exist_ok=True)
    (ROOT / '.cache' / 'voice-verify.json').write_text(json.dumps(results, ensure_ascii=False, indent=1))
    if failures:
        print('\n'.join(['', 'FAILED:', *failures]))
        sys.exit(1)
    print(f'\nall {len(results)} lines match the script (max syllable error {MAX_SYLLABLE_ERROR:.0%})')


if __name__ == '__main__':
    main()
