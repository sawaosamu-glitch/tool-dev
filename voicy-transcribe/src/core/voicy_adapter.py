"""C-04: VoicyのURLから音声を取得する（FR-EXT-002, FR-EXT-003）。

実装方式は research/research_v2.md の「技術スパイク結果」（2026-08-25）で確認済み:
1. Firebase匿名認証でidTokenを取得
2. vmedia-player-api.voicy.jp のメタデータAPIをidToken付きで呼ぶ
3. is_premium/is_paystoryを確認し、trueなら拒否する（FR-EXT-003, C-AI-010）
4. chapters[].voice.file のHLS(.m3u8)を取得し、.aacセグメントを結合する

CONSTRAINTS.md C-AI-009: 利用者が都度手動で入力した1件のURLのみを処理対象とする
（チャンネル一覧の自動巡回・バッチ処理は実装しない）。
CONSTRAINTS.md C-AI-011: 匿名認証のみを使用する（実ユーザーのログイン情報は使わない）。
"""
from __future__ import annotations

import re
from pathlib import Path
from urllib.parse import urljoin

import httpx

from src import config

VOICY_URL_RE = re.compile(r"^https://voicy\.jp/channel/(\d+)/(\d+)/?$")

FIREBASE_SIGNUP_URL = "https://identitytoolkit.googleapis.com/v1/accounts:signUp"
VMEDIA_API_BASE = "https://vmedia-player-api.voicy.jp/v1"


class ConfirmationRequiredError(Exception):
    """confirmed=Falseで呼ばれた場合（FR-EXT-002例外、H2承認ゲート）。"""


class PremiumContentError(Exception):
    """有料/プレミアムコンテンツの場合（FR-EXT-003、C-AI-010）。"""


def is_valid_voicy_url(url: str) -> bool:
    return VOICY_URL_RE.match(url.strip()) is not None


def parse_voicy_url(url: str) -> tuple[str, str]:
    m = VOICY_URL_RE.match(url.strip())
    if not m:
        raise ValueError("Voicyのエピソードページのみ対応しています")
    return m.group(1), m.group(2)


async def _get_anonymous_token(client: httpx.AsyncClient) -> str:
    resp = await client.post(
        FIREBASE_SIGNUP_URL,
        params={"key": config.FIREBASE_WEB_API_KEY},
        json={"returnSecureToken": True},
        timeout=15,
    )
    resp.raise_for_status()
    return resp.json()["idToken"]


async def _get_story_metadata(
    client: httpx.AsyncClient, channel_id: str, story_id: str, token: str
) -> dict:
    resp = await client.get(
        f"{VMEDIA_API_BASE}/channels/{channel_id}/stories/{story_id}",
        headers={"Authorization": f"Bearer {token}", "Referer": "https://voicy.jp/"},
        timeout=15,
    )
    resp.raise_for_status()
    return resp.json()


async def _download_hls_audio(client: httpx.AsyncClient, hls_url: str, dest: Path) -> None:
    resp = await client.get(hls_url, timeout=15)
    resp.raise_for_status()
    segment_names = [
        line.strip()
        for line in resp.text.splitlines()
        if line.strip() and not line.startswith("#")
    ]
    with dest.open("ab") as f:
        for name in segment_names:
            seg_url = urljoin(hls_url, name)
            seg_resp = await client.get(seg_url, timeout=30)
            seg_resp.raise_for_status()
            f.write(seg_resp.content)


def _mock_fetch(dest: Path) -> Path:
    """H1 DRY_RUN: 実際のVoicy通信を行わず、ダミー音声ファイルを返す（SDD.md 8章）。"""
    dest.write_bytes(b"DRY_RUN mock audio")
    return dest


async def fetch(url: str, confirmed: bool, job_id: str) -> Path | None:
    if not confirmed:
        raise ConfirmationRequiredError("confirmed=False: ユーザー同意なしにVoicyへアクセスしない")

    channel_id, story_id = parse_voicy_url(url)
    job_dir = config.WORK_DIR / job_id
    job_dir.mkdir(parents=True, exist_ok=True)
    dest = job_dir / "audio.aac"
    dest.unlink(missing_ok=True)

    if config.DRY_RUN:
        return _mock_fetch(dest)

    async with httpx.AsyncClient() as client:
        token = await _get_anonymous_token(client)
        story = await _get_story_metadata(client, channel_id, story_id, token)

        if story.get("is_premium") or story.get("is_paystory"):
            raise PremiumContentError(
                "このエピソードは有料/プレミアムコンテンツのため自動取得に対応していません"
            )

        chapters = story.get("chapters") or []
        if not chapters:
            return None

        try:
            for chapter in chapters:
                voice = chapter.get("voice") or {}
                hls_url = voice.get("file")
                if hls_url:
                    await _download_hls_audio(client, hls_url, dest)
        except httpx.HTTPError:
            dest.unlink(missing_ok=True)
            return None

    if not dest.exists() or dest.stat().st_size == 0:
        return None
    return dest
