"""C-03: 音声ファイルのアップロード検証・保存（FR-DATA-001）。"""
from __future__ import annotations

from pathlib import Path

from fastapi import UploadFile

from src import config


class ValidationError(Exception):
    """アップロードされたファイルが規約を満たさない場合に送出する。"""


async def save(upload_file: UploadFile, job_id: str) -> Path:
    filename = upload_file.filename or "audio"
    ext = Path(filename).suffix.lower()
    if ext not in config.ALLOWED_EXTENSIONS:
        raise ValidationError("対応していない形式です（mp3/m4a/wavのみ対応）")

    job_dir = config.WORK_DIR / job_id
    job_dir.mkdir(parents=True, exist_ok=True)
    dest = job_dir / filename

    size = 0
    with dest.open("wb") as f:
        while chunk := await upload_file.read(1024 * 1024):
            size += len(chunk)
            if size > config.MAX_UPLOAD_BYTES:
                f.close()
                dest.unlink(missing_ok=True)
                raise ValidationError("ファイルサイズが上限（500MB）を超えています")
            f.write(chunk)

    return dest
