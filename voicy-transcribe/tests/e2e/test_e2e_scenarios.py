"""docs/E2E_SCENARIOS.md の各シナリオに対応する自動テスト。

WebUI（素のHTML/JS）はブラウザ自動化を導入するほどの複雑さがないため、
FastAPIのTestClientでAPI層を通した検証を「E2E」として扱う（過剰設計回避）。
tests/integration/test_jobs_api.py の統合テストと一部観点は重なるが、
本ファイルはE2E_SCENARIOS.mdのシナリオIDとの対応関係を明示することを目的とする。

E2E-01, 03, 07, 07bは実際のVoicy音声・faster-whisperモデルを要するため、
`requires_network`/`requires_model`としてCI対象外とし、PROGRESS.mdに手動実行結果を記録する。
"""
import io

import pytest
from fastapi.testclient import TestClient

from src import config
from src.api import jobs as jobs_module
from src.core import summarization
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


def _wait_done(client, job_id, timeout=5):
    import time

    deadline = time.time() + timeout
    while time.time() < deadline:
        job = client.get(f"/api/jobs/{job_id}").json()
        if job["status"] in ("done", "error", "fallback_required"):
            return job
        time.sleep(0.05)
    raise TimeoutError("job did not finish in time")


def test_e2e_02_minimal_short_audio_skips_summary(client, monkeypatch):
    """E2E-02: 短い音声は文字起こしされるが要約はスキップされる。"""
    monkeypatch.setattr(jobs_module.transcription, "transcribe", lambda path, model_size=None: "短い音声")
    # summarizationは実ロジックのまま呼ぶ（config.SUMMARY_MIN_CHARSによりスキップされることを確認）
    resp = client.post(
        "/api/jobs", files={"file": ("short_3sec.wav", io.BytesIO(b"x"), "audio/wav")}
    )
    job = _wait_done(client, resp.json()["job_id"])
    assert job["status"] == "done"
    assert job["summary_text"] is None
    assert job["error_message"] == "要約するには本文が短すぎます"


def test_e2e_04_ollama_down_falls_back_gracefully(client, monkeypatch):
    """E2E-04: Ollamaが起動していない場合、要約は失敗するが文字起こし結果は表示される。

    _call_ollamaはモックせず、実際に到達不能なポートへhttpx経由でアクセスさせて
    接続エラーのハンドリングそのものを検証する。
    """
    monkeypatch.setattr(config, "OLLAMA_HOST", "http://localhost:1")  # 到達不能ポート
    monkeypatch.setattr(config, "OLLAMA_TIMEOUT_SECONDS", 3)
    monkeypatch.setattr(
        jobs_module.transcription, "transcribe", lambda path, model_size=None: "これはテスト用の全文テキストです。" * 5
    )

    resp = client.post(
        "/api/jobs", files={"file": ("standard.mp3", io.BytesIO(b"x"), "audio/mpeg")}
    )
    job = _wait_done(client, resp.json()["job_id"], timeout=10)
    assert job["status"] == "done"
    assert job["summary_text"] is None
    assert "Ollama" in job["error_message"]
    assert job["transcript_text"] is not None


def test_e2e_05_invalid_input_rejected(client):
    """E2E-05: 対応外拡張子は即座に拒否される。"""
    resp = client.post(
        "/api/jobs", files={"file": ("invalid.mov", io.BytesIO(b"data"), "video/quicktime")}
    )
    assert resp.status_code == 400
    assert "対応していない形式です" in resp.json()["detail"]


def test_e2e_06_boundary_filesize(client, monkeypatch):
    """E2E-06: ファイルサイズの境界値。アップロード検証のみを対象とする。"""
    monkeypatch.setattr(config, "MAX_UPLOAD_BYTES", 10)

    ok = client.post(
        "/api/jobs", files={"file": ("ok.mp3", io.BytesIO(b"0123456789"), "audio/mpeg")}
    )
    assert ok.status_code == 200

    too_big = client.post(
        "/api/jobs", files={"file": ("big.mp3", io.BytesIO(b"0123456789A"), "audio/mpeg")}
    )
    assert too_big.status_code == 400
    assert "500MB" in too_big.json()["detail"]


def test_e2e_08_unconfirmed_url_rejected(client, monkeypatch):
    """E2E-08: confirmed=falseの場合、Voicyへのネットワークアクセスが発生しない。"""
    called = {"value": False}

    async def fake_fetch(url, confirmed, job_id):
        called["value"] = True
        return None

    monkeypatch.setattr(jobs_module.voicy_adapter, "fetch", fake_fetch)

    resp = client.post(
        "/api/jobs",
        data={"url": "https://voicy.jp/channel/941/7892642", "confirmed": "false"},
    )
    assert resp.status_code == 400
    assert called["value"] is False


def test_e2e_09_premium_content_rejected(client, monkeypatch):
    """E2E-09: プレミアム/有料コンテンツは取得を拒否される。"""

    async def fake_fetch(url, confirmed, job_id):
        raise jobs_module.voicy_adapter.PremiumContentError(
            "このエピソードは有料/プレミアムコンテンツのため自動取得に対応していません"
        )

    monkeypatch.setattr(jobs_module.voicy_adapter, "fetch", fake_fetch)

    resp = client.post(
        "/api/jobs",
        data={"url": "https://voicy.jp/channel/941/7892642", "confirmed": "true"},
    )
    job = _wait_done(client, resp.json()["job_id"])
    assert job["status"] == "fallback_required"
    assert "有料" in job["error_message"]


@pytest.mark.requires_network
@pytest.mark.requires_model
def test_e2e_01_real_voicy_url_to_transcript(client):
    """E2E-01/E2E-07: 実際のVoicy公開エピソードURLで一連の流れを検証する（CI対象外）。

    faster-whisperの実モデルロードを伴うため時間がかかる。事前に
    `PROGRESS.md`に記録した手動検証（tinyモデルで完走・全文9,266文字生成）で
    代替確認済み。CI高速化のためデフォルトでは実行しない。
    """
    resp = client.post(
        "/api/jobs",
        data={"url": "https://voicy.jp/channel/941/7892642", "confirmed": "true"},
    )
    job = _wait_done(client, resp.json()["job_id"], timeout=900)
    assert job["status"] == "done"
    assert job["transcript_text"]
