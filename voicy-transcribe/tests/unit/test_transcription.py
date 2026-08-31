from types import SimpleNamespace

import pytest

from src.core import transcription


def test_transcribe_joins_segments(monkeypatch, tmp_path):
    segments = [SimpleNamespace(text="こんにちは"), SimpleNamespace(text="世界")]

    class FakeModel:
        def transcribe(self, path, language, beam_size):
            return segments, {}

    monkeypatch.setattr(transcription, "_get_model", lambda model_size: FakeModel())
    fake_audio = tmp_path / "a.mp3"
    fake_audio.write_bytes(b"x")

    result = transcription.transcribe(fake_audio)
    assert result == "こんにちは世界"


def test_transcribe_raises_on_empty_result(monkeypatch, tmp_path):
    class FakeModel:
        def transcribe(self, path, language, beam_size):
            return [], {}

    monkeypatch.setattr(transcription, "_get_model", lambda model_size: FakeModel())
    fake_audio = tmp_path / "a.mp3"
    fake_audio.write_bytes(b"x")

    with pytest.raises(transcription.TranscriptionError, match="検出されませんでした"):
        transcription.transcribe(fake_audio)


def test_transcribe_wraps_exceptions(monkeypatch, tmp_path):
    class FakeModel:
        def transcribe(self, path, language, beam_size):
            raise RuntimeError("decode failed")

    monkeypatch.setattr(transcription, "_get_model", lambda model_size: FakeModel())
    fake_audio = tmp_path / "a.mp3"
    fake_audio.write_bytes(b"x")

    with pytest.raises(transcription.TranscriptionError, match="読み込めませんでした"):
        transcription.transcribe(fake_audio)
