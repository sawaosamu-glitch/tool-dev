import pytest

from src.core import voicy_adapter as va


@pytest.fixture(autouse=True)
def force_real_path(monkeypatch):
    """このファイルのテストは実通信を内部関数の差し替えで検証するため、
    H1 DRY_RUN（デフォルトtrue）を無効化して実処理パスへ入るようにする。"""
    monkeypatch.setattr(va.config, "DRY_RUN", False)


def test_is_valid_voicy_url_accepts_episode_url():
    assert va.is_valid_voicy_url("https://voicy.jp/channel/941/7892642") is True


def test_is_valid_voicy_url_rejects_other_domain():
    assert va.is_valid_voicy_url("https://example.com/channel/941/7892642") is False


def test_parse_voicy_url_extracts_ids():
    channel_id, story_id = va.parse_voicy_url("https://voicy.jp/channel/941/7892642")
    assert channel_id == "941"
    assert story_id == "7892642"


def test_parse_voicy_url_raises_on_invalid():
    with pytest.raises(ValueError):
        va.parse_voicy_url("https://voicy.jp/channel/")


@pytest.mark.asyncio
async def test_fetch_rejects_unconfirmed_without_network_call(monkeypatch):
    called = False

    async def fake_get_token(client):
        nonlocal called
        called = True
        return "token"

    monkeypatch.setattr(va, "_get_anonymous_token", fake_get_token)

    with pytest.raises(va.ConfirmationRequiredError):
        await va.fetch("https://voicy.jp/channel/941/7892642", confirmed=False, job_id="jobX")

    assert called is False


@pytest.mark.asyncio
async def test_fetch_rejects_premium_content(monkeypatch, tmp_path):
    monkeypatch.setattr(va.config, "WORK_DIR", tmp_path)

    async def fake_get_token(client):
        return "token"

    async def fake_get_metadata(client, channel_id, story_id, token):
        return {"is_premium": True, "is_paystory": False, "chapters": []}

    monkeypatch.setattr(va, "_get_anonymous_token", fake_get_token)
    monkeypatch.setattr(va, "_get_story_metadata", fake_get_metadata)

    with pytest.raises(va.PremiumContentError):
        await va.fetch("https://voicy.jp/channel/941/7892642", confirmed=True, job_id="jobY")


@pytest.mark.asyncio
async def test_fetch_success_downloads_and_concatenates_chapters(monkeypatch, tmp_path):
    monkeypatch.setattr(va.config, "WORK_DIR", tmp_path)

    async def fake_get_token(client):
        return "token"

    async def fake_get_metadata(client, channel_id, story_id, token):
        return {
            "is_premium": False,
            "is_paystory": False,
            "chapters": [
                {"voice": {"file": "https://files.voicy.jp/a/audio_hls_aac.m3u8"}},
                {"voice": {"file": "https://files.voicy.jp/b/audio_hls_aac.m3u8"}},
            ],
        }

    async def fake_download(client, hls_url, dest):
        with dest.open("ab") as f:
            f.write(b"chunk-from-" + hls_url.encode())

    monkeypatch.setattr(va, "_get_anonymous_token", fake_get_token)
    monkeypatch.setattr(va, "_get_story_metadata", fake_get_metadata)
    monkeypatch.setattr(va, "_download_hls_audio", fake_download)

    path = await va.fetch("https://voicy.jp/channel/941/7892642", confirmed=True, job_id="jobZ")
    assert path is not None
    assert path.name == "audio.aac"
    content = path.read_bytes()
    assert b"a/audio_hls_aac.m3u8" in content
    assert b"b/audio_hls_aac.m3u8" in content


@pytest.mark.asyncio
async def test_fetch_returns_none_when_no_chapters(monkeypatch, tmp_path):
    monkeypatch.setattr(va.config, "WORK_DIR", tmp_path)

    async def fake_get_token(client):
        return "token"

    async def fake_get_metadata(client, channel_id, story_id, token):
        return {"is_premium": False, "is_paystory": False, "chapters": []}

    monkeypatch.setattr(va, "_get_anonymous_token", fake_get_token)
    monkeypatch.setattr(va, "_get_story_metadata", fake_get_metadata)

    path = await va.fetch("https://voicy.jp/channel/941/7892642", confirmed=True, job_id="jobW")
    assert path is None


@pytest.mark.asyncio
async def test_fetch_returns_mock_when_dry_run_enabled(monkeypatch, tmp_path):
    monkeypatch.setattr(va.config, "WORK_DIR", tmp_path)
    monkeypatch.setattr(va.config, "DRY_RUN", True)

    called = False

    async def fake_get_token(client):
        nonlocal called
        called = True
        return "token"

    monkeypatch.setattr(va, "_get_anonymous_token", fake_get_token)

    path = await va.fetch("https://voicy.jp/channel/941/7892642", confirmed=True, job_id="jobDry")

    assert called is False
    assert path is not None
    assert path.read_bytes() == b"DRY_RUN mock audio"


@pytest.mark.requires_network
@pytest.mark.asyncio
async def test_fetch_against_real_voicy_free_episode(tmp_path, monkeypatch):
    """技術スパイクで確認した実エピソードに対する実ネットワーク検証（CI対象外）。"""
    monkeypatch.setattr(va.config, "WORK_DIR", tmp_path)
    path = await va.fetch(
        "https://voicy.jp/channel/941/7892642", confirmed=True, job_id="realjob"
    )
    assert path is not None
    assert path.stat().st_size > 0
