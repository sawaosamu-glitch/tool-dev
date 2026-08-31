"""環境変数からの設定値読み込み。CC-03: ハードコード禁止。"""
from __future__ import annotations

import os
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent

WORK_DIR = PROJECT_ROOT / "work"
OUTPUT_DIR = PROJECT_ROOT / "output"
LOG_DIR = PROJECT_ROOT / "logs"

WHISPER_MODEL = os.environ.get("WHISPER_MODEL", "medium")
WHISPER_DEVICE = os.environ.get("WHISPER_DEVICE", "cpu")
# CPUはfloat16非対応で未指定だとfloat32に自動変換され遅い。int8量子化で高速化（FR-DATA-002-b）
WHISPER_COMPUTE_TYPE = os.environ.get("WHISPER_COMPUTE_TYPE", "int8")

# FR-DATA-002-b: ブラウザから選べる文字起こし速度/精度の3段階プリセット
WHISPER_QUALITY_PRESETS = {"fast": "base", "standard": "small", "accurate": "medium"}
WHISPER_QUALITY_DEFAULT = "standard"

OLLAMA_HOST = os.environ.get("OLLAMA_HOST", "http://localhost:11434")
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "qwen3:8b")
OLLAMA_NUM_CTX = int(os.environ.get("OLLAMA_NUM_CTX", "8192"))
OLLAMA_TIMEOUT_SECONDS = int(os.environ.get("OLLAMA_TIMEOUT_SECONDS", "120"))
# 要約の一貫性重視で低め（ユーザー要望：Claudeの要約と比べて分かりにくいとの指摘への対応）
OLLAMA_TEMPERATURE = float(os.environ.get("OLLAMA_TEMPERATURE", "0.3"))

# Voicy Web版が匿名認証に使う公開Web APIキー。秘密情報ではないが、CC-03に従い環境変数化する。
FIREBASE_WEB_API_KEY = os.environ.get(
    "FIREBASE_WEB_API_KEY", "AIzaSyC5Rg-sxiYu6ySD8V-f6Eljwll8gHvgUK4"
)

MAX_UPLOAD_BYTES = 500 * 1024 * 1024  # 500MB, FR-DATA-001
ALLOWED_EXTENSIONS = {".mp3", ".m4a", ".wav"}

SUMMARY_MIN_CHARS = 50  # これ未満は要約をスキップ（FR-DATA-003）
# チャンク分割の目安文字数（SDD「長時間音声の要約設計」）。分割しすぎると文脈が
# 途切れて要約が支離滅裂になるため、OLLAMA_NUM_CTX拡大に合わせて大きめにする
SUMMARY_CHUNK_CHARS = 6000

# H1: VoicyURLAdapterはデフォルトでモック応答（安全側）。実際にVoicyへアクセスするには
# `export DRY_RUN=false` を明示する（harness/HARNESS.md H1、README.md参照）
DRY_RUN = os.environ.get("DRY_RUN", "true").lower() == "true"


def ensure_dirs() -> None:
    for d in (WORK_DIR, OUTPUT_DIR, LOG_DIR):
        d.mkdir(parents=True, exist_ok=True)
