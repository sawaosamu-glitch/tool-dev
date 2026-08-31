import io

import pytest
from fastapi import UploadFile

from src.core import upload_handler
from src import config


def _make_upload(filename: str, content: bytes) -> UploadFile:
    return UploadFile(filename=filename, file=io.BytesIO(content))


@pytest.mark.asyncio
async def test_save_accepts_valid_extension(tmp_path, monkeypatch):
    monkeypatch.setattr(config, "WORK_DIR", tmp_path)
    upload = _make_upload("standard_5min.mp3", b"fake-audio-bytes")
    dest = await upload_handler.save(upload, job_id="job1")
    assert dest.exists()
    assert dest.read_bytes() == b"fake-audio-bytes"


@pytest.mark.asyncio
async def test_save_rejects_invalid_extension(tmp_path, monkeypatch):
    monkeypatch.setattr(config, "WORK_DIR", tmp_path)
    upload = _make_upload("invalid.mov", b"data")
    with pytest.raises(upload_handler.ValidationError, match="対応していない形式"):
        await upload_handler.save(upload, job_id="job2")


@pytest.mark.asyncio
async def test_save_rejects_oversize_file(tmp_path, monkeypatch):
    monkeypatch.setattr(config, "WORK_DIR", tmp_path)
    monkeypatch.setattr(config, "MAX_UPLOAD_BYTES", 10)
    upload = _make_upload("standard.mp3", b"0123456789ABCDEF")
    with pytest.raises(upload_handler.ValidationError, match="500MB"):
        await upload_handler.save(upload, job_id="job3")
