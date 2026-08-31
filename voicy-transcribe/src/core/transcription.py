"""C-05: faster-whisperによる音声→全文テキスト変換（FR-DATA-002）。

呼び出し側（src/api/jobs.py）は必ず `asyncio.to_thread(transcribe, path)` で呼ぶこと。
本モジュール自体は同期関数として実装する（イベントループをブロックしないための
オフロードは呼び出し側の責務。F-001対応）。
"""
from __future__ import annotations

from pathlib import Path

from src import config


class TranscriptionError(Exception):
    """音声のデコード・文字起こしに失敗した場合に送出する。"""


_models: dict[str, object] = {}


def _get_model(model_size: str):
    if model_size not in _models:
        from faster_whisper import WhisperModel

        _models[model_size] = WhisperModel(
            model_size, device=config.WHISPER_DEVICE, compute_type=config.WHISPER_COMPUTE_TYPE
        )
    return _models[model_size]


def transcribe(path: Path, model_size: str | None = None) -> str:
    """NFR-REL-001: beam_size等を固定し、再実行時の出力を安定させる。

    model_size未指定時はWHISPER_MODEL（既定medium）を使う。FR-DATA-002-bで
    ブラウザから「速い/標準/高精度」を選ぶと、対応するモデルサイズが渡される。
    """
    try:
        model = _get_model(model_size or config.WHISPER_MODEL)
        segments, _info = model.transcribe(str(path), language="ja", beam_size=5)
        text = "".join(segment.text for segment in segments).strip()
    except Exception as exc:  # faster-whisper/PyAVの例外を統一的にラップする
        raise TranscriptionError(f"音声ファイルを読み込めませんでした: {exc}") from exc

    if not text:
        raise TranscriptionError("音声データが検出されませんでした")
    return text
