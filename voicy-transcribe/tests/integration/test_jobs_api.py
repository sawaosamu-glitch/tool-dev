import io
import time

import pytest
from fastapi.testclient import TestClient

from src import config
from src.api import jobs as jobs_module
from src.main import app


@pytest.fixture(autouse=True)
def isolate_dirs(tmp_path, monkeypatch):
    monkeypatch.setattr(config, "WORK_DIR", tmp_path / "work")
    monkeypatch.setattr(config, "OUTPUT_DIR", tmp_path / "output")
    config.ensure_dirs()
    jobs_module.job_store._jobs.clear()
    yield


@pytest.fixture
def client():
    return TestClient(app)


def test_health(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


def test_reject_invalid_extension(client):
    resp = client.post(
        "/api/jobs", files={"file": ("bad.mov", io.BytesIO(b"data"), "video/quicktime")}
    )
    assert resp.status_code == 400
    assert "対応していない形式" in resp.json()["detail"]


def test_reject_url_without_confirmation(client):
    resp = client.post(
        "/api/jobs",
        data={"url": "https://voicy.jp/channel/941/7892642", "confirmed": "false"},
    )
    assert resp.status_code == 400
    assert "confirmed" in resp.json()["detail"]


def test_reject_non_voicy_url(client):
    resp = client.post(
        "/api/jobs", data={"url": "https://example.com/foo", "confirmed": "true"}
    )
    assert resp.status_code == 400


def test_upload_pipeline_end_to_end(client, monkeypatch):
    monkeypatch.setattr(
        jobs_module.transcription, "transcribe", lambda path, model_size=None: "テスト用の全文テキストです。"
    )
    monkeypatch.setattr(jobs_module.summarization, "summarize", lambda text: "テスト要約")

    resp = client.post(
        "/api/jobs", files={"file": ("standard.mp3", io.BytesIO(b"fake-mp3-bytes"), "audio/mpeg")}
    )
    assert resp.status_code == 200
    job_id = resp.json()["job_id"]

    job = _wait_for_terminal_status(client, job_id)
    assert job["status"] == "done"
    assert job["transcript_text"] == "テスト用の全文テキストです。"
    assert job["summary_text"] == "テスト要約"
    assert job["output_path"] is not None


@pytest.mark.parametrize(
    "quality,expected_model_size",
    [("fast", "base"), ("standard", "small"), ("accurate", "medium"), (None, "small")],
)
def test_quality_selects_expected_model_size(client, monkeypatch, quality, expected_model_size):
    received = {}

    def fake_transcribe(path, model_size=None):
        received["model_size"] = model_size
        return "全文テキスト"

    monkeypatch.setattr(jobs_module.transcription, "transcribe", fake_transcribe)
    monkeypatch.setattr(jobs_module.summarization, "summarize", lambda text: None)

    data = {"quality": quality} if quality else {}
    resp = client.post(
        "/api/jobs",
        data=data,
        files={"file": ("q.mp3", io.BytesIO(b"fake-mp3-bytes"), "audio/mpeg")},
    )
    assert resp.status_code == 200
    _wait_for_terminal_status(client, resp.json()["job_id"])
    assert received["model_size"] == expected_model_size


def test_second_job_rejected_while_first_running(client):
    # JobStoreのasyncio.Lock自体の排他は tests/unit/test_job_store.py で直接検証済み。
    # ここではAPI層がJobAlreadyRunningErrorを429に正しくマッピングすることを確認する
    # （TestClientはBackgroundTaskの実行タイミングを制御できないため、事前に
    # アクティブなジョブをJobStoreへ直接投入して決定論的に再現する）。
    import asyncio

    asyncio.run(jobs_module.job_store.create("upload", "a.mp3"))

    resp2 = client.post(
        "/api/jobs", files={"file": ("b.mp3", io.BytesIO(b"data"), "audio/mpeg")}
    )
    assert resp2.status_code == 429


def test_url_pipeline_success(client, monkeypatch, tmp_path):
    fake_audio = tmp_path / "audio.aac"
    fake_audio.write_bytes(b"fake-audio")

    async def fake_fetch(url, confirmed, job_id):
        return fake_audio

    monkeypatch.setattr(jobs_module.voicy_adapter, "fetch", fake_fetch)
    monkeypatch.setattr(jobs_module.transcription, "transcribe", lambda path, model_size=None: "URL経由の全文テキスト")
    monkeypatch.setattr(jobs_module.summarization, "summarize", lambda text: "URL要約")

    resp = client.post(
        "/api/jobs",
        data={"url": "https://voicy.jp/channel/941/7892642", "confirmed": "true"},
    )
    assert resp.status_code == 200
    job = _wait_for_terminal_status(client, resp.json()["job_id"])
    assert job["status"] == "done"
    assert job["transcript_text"] == "URL経由の全文テキスト"


def test_url_pipeline_premium_content_falls_back(client, monkeypatch):
    async def fake_fetch(url, confirmed, job_id):
        raise jobs_module.voicy_adapter.PremiumContentError("有料コンテンツです")

    monkeypatch.setattr(jobs_module.voicy_adapter, "fetch", fake_fetch)

    resp = client.post(
        "/api/jobs",
        data={"url": "https://voicy.jp/channel/941/7892642", "confirmed": "true"},
    )
    assert resp.status_code == 200
    job = _wait_for_terminal_status(client, resp.json()["job_id"])
    assert job["status"] == "fallback_required"
    assert "有料" in job["error_message"]


def test_url_pipeline_fetch_failure_falls_back(client, monkeypatch):
    async def fake_fetch(url, confirmed, job_id):
        return None

    monkeypatch.setattr(jobs_module.voicy_adapter, "fetch", fake_fetch)

    resp = client.post(
        "/api/jobs",
        data={"url": "https://voicy.jp/channel/941/7892642", "confirmed": "true"},
    )
    job = _wait_for_terminal_status(client, resp.json()["job_id"])
    assert job["status"] == "fallback_required"
    assert "手動でアップロード" in job["error_message"]


def _wait_for_terminal_status(client, job_id, timeout=5):
    deadline = time.time() + timeout
    while time.time() < deadline:
        job = client.get(f"/api/jobs/{job_id}").json()
        if job["status"] in ("done", "error", "fallback_required"):
            return job
        time.sleep(0.05)
    raise TimeoutError("job did not reach terminal status in time")
