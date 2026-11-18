"""Generates the phase-2 bundled Chinese audio with the Kokoro-82M-v1.1-zh model (Apache-2.0), fully offline.

Every zh item of spec/phase-2/content.json gets one reading (voiceText, so polyphones are read
in their word context), plus the teaching prompts from src/config/phase2/voice.ts.
Output: public/audio/phase2/voice/<id>.m4a  (item ids and p2-* prompt ids)

Run from light-town/ after setting up scripts/.venv (see README "语音生成"):
  scripts/.venv/bin/python scripts/voice/generate-phase2.py [--only id1,id2]
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import subprocess
import sys
import tempfile
from pathlib import Path

os.environ.setdefault('HF_HUB_OFFLINE', '1')

import numpy as np
import soundfile as sf

ROOT = Path(__file__).resolve().parents[2]
MODEL_DIR = ROOT / 'scripts' / 'models' / 'kokoro-v1.1-zh'
MODEL_FILE = MODEL_DIR / 'kokoro-v1_1-zh.pth'
MODEL_SHA256 = 'b1d8410fa44dfb5c15471fd6c4225ea6b4e9ac7fa03c98e8bea47a9928476e2b'
REPO_ID = 'hexgrad/Kokoro-82M-v1.1-zh'
OUT_DIR = ROOT / 'public' / 'audio' / 'phase2' / 'voice'

DEFAULT_VOICE = 'zf_001'
SAMPLE_RATE = 24_000
BASE_SPEED = 0.92
SENTENCE_PAUSE_S = 0.28
LEAD_IN_S = 0.06
TAIL_S = 0.15
TARGET_RMS_DBFS = -20.0
PEAK_LIMIT_DBFS = -3.0
AAC_BITRATE = 48_000


def load_lines() -> dict[str, dict[str, str]]:
    out = subprocess.run(
        ['node', str(ROOT / 'scripts' / 'voice' / 'phase2-lines.mjs')],
        check=True,
        capture_output=True,
        text=True,
    )
    return json.loads(out.stdout)


def check_model() -> None:
    if not MODEL_FILE.exists():
        sys.exit(f'Model not found at {MODEL_FILE}. Run scripts/voice/download_model.py first.')
    h = hashlib.sha256()
    with MODEL_FILE.open('rb') as f:
        for block in iter(lambda: f.read(1 << 20), b''):
            h.update(block)
    if h.hexdigest() != MODEL_SHA256:
        sys.exit(f'Model checksum mismatch: {h.hexdigest()}')


def speed_for(phoneme_count: int) -> float:
    if phoneme_count <= 83:
        factor = 1.0
    elif phoneme_count < 183:
        factor = 1.0 - (phoneme_count - 83) / 500
    else:
        factor = 0.8
    return BASE_SPEED * factor


def split_sentences(text: str) -> list[str]:
    parts = re.findall(r'[^。！？]+[。！？]?', text)
    return [p.strip() for p in parts if p.strip()]


def trim(wav: np.ndarray, threshold_db: float = -45.0) -> np.ndarray:
    frame = int(0.01 * SAMPLE_RATE)
    if len(wav) < frame:
        return wav
    n = len(wav) // frame
    rms = np.sqrt(np.mean(wav[: n * frame].reshape(n, frame) ** 2, axis=1) + 1e-12)
    loud = np.where(20 * np.log10(rms) > threshold_db)[0]
    if len(loud) == 0:
        return wav
    start = max(0, loud[0] - 1) * frame
    end = min(len(wav), (loud[-1] + 2) * frame)
    return wav[start:end]


def fade(wav: np.ndarray, seconds: float = 0.008) -> np.ndarray:
    n = min(len(wav) // 2, int(seconds * SAMPLE_RATE))
    if n > 0:
        ramp = np.linspace(0.0, 1.0, n)
        wav[:n] *= ramp
        wav[-n:] *= ramp[::-1]
    return wav


def normalize(wav: np.ndarray) -> np.ndarray:
    frame = int(0.02 * SAMPLE_RATE)
    n = len(wav) // frame
    frames = wav[: n * frame].reshape(n, frame)
    rms = np.sqrt(np.mean(frames**2, axis=1))
    voiced = rms[rms > 10 ** (-40 / 20)]
    level = np.sqrt(np.mean(voiced**2)) if len(voiced) else np.sqrt(np.mean(wav**2))
    gain = 10 ** (TARGET_RMS_DBFS / 20) / max(level, 1e-9)
    peak = np.max(np.abs(wav)) * gain
    limit = 10 ** (PEAK_LIMIT_DBFS / 20)
    if peak > limit:
        gain *= limit / peak
    return wav * gain


class Synth:
    def __init__(self) -> None:
        import torch
        from kokoro import KModel, KPipeline

        torch.manual_seed(0)
        self.model = KModel(repo_id=REPO_ID, config=str(MODEL_DIR / 'config.json'), model=str(MODEL_FILE)).eval()
        self.pipeline = KPipeline(lang_code='z', repo_id=REPO_ID, model=self.model)

    def line(self, text: str, voice: str) -> np.ndarray:
        voice_file = str(MODEL_DIR / 'voices' / f'{voice}.pt')
        pieces: list[np.ndarray] = []
        for sentence in split_sentences(text):
            audio = [r.audio.numpy() for r in self.pipeline(sentence, voice=voice_file, speed=speed_for) if r.audio is not None]
            if not audio:
                raise RuntimeError(f'no audio for: {sentence}')
            if pieces:
                pieces.append(np.zeros(int(SENTENCE_PAUSE_S * SAMPLE_RATE), dtype=np.float32))
            pieces.append(trim(np.concatenate(audio).astype(np.float32)))
        wav = fade(normalize(np.concatenate(pieces)))
        lead = np.zeros(int(LEAD_IN_S * SAMPLE_RATE), dtype=np.float32)
        tail = np.zeros(int(TAIL_S * SAMPLE_RATE), dtype=np.float32)
        return np.concatenate([lead, wav, tail]).astype(np.float32)


def to_aac(wav: np.ndarray, target: Path) -> None:
    target.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        src = Path(tmp) / 'line.wav'
        sf.write(src, wav, SAMPLE_RATE, subtype='PCM_16')
        subprocess.run(
            ['afconvert', '-f', 'm4af', '-d', 'aac', '-b', str(AAC_BITRATE), '-q', '127', str(src), str(target)],
            check=True,
        )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument('--voice', default=DEFAULT_VOICE)
    parser.add_argument('--only', default='', help='comma separated line ids')
    args = parser.parse_args()

    check_model()
    lines = load_lines()
    synth = Synth()

    only = {s for s in args.only.split(',') if s}
    todo = [
        (f'{line_id}', text)
        for group in (lines['items'], lines['prompts'])
        for line_id, text in group.items()
    ]
    report = {}
    for line_id, text in todo:
        if only and line_id not in only:
            continue
        wav = synth.line(text, args.voice)
        to_aac(wav, OUT_DIR / f'{line_id}.m4a')
        chars = len(re.findall(r'[\u4e00-\u9fff]', text))
        seconds = len(wav) / SAMPLE_RATE
        report[line_id] = {'seconds': round(seconds, 2), 'chars': chars}
        print(f'{line_id}: {seconds:.2f}s ({text})')
    (ROOT / '.cache').mkdir(exist_ok=True)
    report_path = ROOT / '.cache' / 'phase2-voice-report.json'
    existing = json.loads(report_path.read_text()) if report_path.exists() else {}
    existing.update(report)
    report_path.write_text(json.dumps({'voice': args.voice, 'lines': existing}, ensure_ascii=False, indent=1))
    print(f'{len(report)} files written to {OUT_DIR}')


if __name__ == '__main__':
    main()
