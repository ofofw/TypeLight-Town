"""Downloads the pinned models into scripts/models/ (not committed).

  download_model.py            Kokoro-82M-v1.1-zh (Apache-2.0), used to generate the voice files
  download_model.py --whisper  Whisper large-v3-turbo (MIT), used only by verify.py to check the files
"""

import sys
from pathlib import Path

from huggingface_hub import snapshot_download

ROOT = Path(__file__).resolve().parents[2]
MODELS = ROOT / 'scripts' / 'models'

if __name__ == '__main__':
    if '--whisper' in sys.argv:
        path = snapshot_download(
            'openai/whisper-large-v3-turbo',
            revision='41f01f3fe87f28c78e2fbf8b568835947dd65ed9',
            local_dir=MODELS / 'whisper-large-v3-turbo',
            allow_patterns=['*.json', '*.txt', 'model.safetensors'],
        )
    else:
        path = snapshot_download(
            'hexgrad/Kokoro-82M-v1.1-zh',
            revision='01e7505bd6a7a2ac4975463114c3a7650a9f7218',
            local_dir=MODELS / 'kokoro-v1.1-zh',
            allow_patterns=['config.json', 'kokoro-v1_1-zh.pth', 'README.md', 'voices/z*.pt'],
        )
    print(path)
