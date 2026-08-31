from src.core import summarization


def test_summarize_skips_short_text():
    assert summarization.summarize("短い") is None


def test_summarize_single_chunk_calls_ollama_once(monkeypatch):
    calls = []

    def fake_call(prompt):
        calls.append(prompt)
        return "要約結果"

    monkeypatch.setattr(summarization, "_call_ollama", fake_call)
    text = "あ" * 100
    result = summarization.summarize(text)
    assert result == "要約結果"
    assert len(calls) == 1


def test_summarize_returns_none_when_ollama_unreachable(monkeypatch):
    monkeypatch.setattr(summarization, "_call_ollama", lambda prompt: None)
    text = "あ" * 100
    assert summarization.summarize(text) is None


def test_summarize_chunks_long_text_and_reduces(monkeypatch):
    monkeypatch.setattr(summarization.config, "SUMMARY_CHUNK_CHARS", 100)
    calls = []

    def fake_call(prompt):
        calls.append(prompt)
        return "chunk-summary"

    monkeypatch.setattr(summarization, "_call_ollama", fake_call)
    text = "あ" * 350  # 4チャンクに分割される想定
    result = summarization.summarize(text)
    assert result is not None
    assert len(calls) >= 4  # 各チャンク分 + 結合要約


def test_chunk_text_splits_evenly():
    chunks = summarization._chunk_text("abcdefghij", 3)
    assert chunks == ["abc", "def", "ghi", "j"]
