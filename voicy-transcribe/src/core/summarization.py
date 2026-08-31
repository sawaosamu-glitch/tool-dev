"""C-06: Ollama経由でのテキスト要約（FR-DATA-003）。

長時間音声の全文は数千字を超えうるため、チャンク分割してmap-reduce要約する
（SDD.md「長時間音声の要約設計」参照、F-003対応）。
呼び出し側は `asyncio.to_thread(summarize, text)` で呼ぶこと。
"""
from __future__ import annotations

import httpx

from src import config


def _chunk_text(text: str, chunk_size: int) -> list[str]:
    return [text[i : i + chunk_size] for i in range(0, len(text), chunk_size)]


_MAP_PROMPT = """以下は音声配信の文字起こしの一部です。
日本語の箇条書き3〜6個で要点をまとめてください。
- 相槌・言い直し・雑談的な前置きなど、意味の薄い部分は除く
- 固有名詞・数字・具体的な事例はできるだけ残す
- 今後のビジネスや行動のヒントになりそうな話（アイデア、教訓、成功/失敗事例）があれば優先して残す

文字起こし:
{chunk}"""

_REDUCE_PROMPT = """以下は、ある音声配信を分割して要約した箇条書き群です。重複や重なりを整理し、
日本語で次の3つの見出しに構成し直してください（該当がない見出しは「特になし」と書く）。

## 話の要点
（3〜5行で、何についての話だったか）

## 今後のビジネス・行動のヒント
（具体的なアイデア・教訓・次に試せそうなアクションを箇条書きで）

## その他メモ
（気になった数字・固有名詞・事例など）

分割要約:
{combined}"""


def _call_ollama(prompt: str) -> str | None:
    try:
        resp = httpx.post(
            f"{config.OLLAMA_HOST}/api/generate",
            json={
                "model": config.OLLAMA_MODEL,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "num_ctx": config.OLLAMA_NUM_CTX,
                    "temperature": config.OLLAMA_TEMPERATURE,
                },
            },
            timeout=config.OLLAMA_TIMEOUT_SECONDS,
        )
        resp.raise_for_status()
        return resp.json().get("response", "").strip() or None
    except httpx.HTTPError:
        return None


def summarize(text: str) -> str | None:
    if len(text) < config.SUMMARY_MIN_CHARS:
        return None

    chunks = _chunk_text(text, config.SUMMARY_CHUNK_CHARS)
    chunk_summaries = []
    for chunk in chunks:
        result = _call_ollama(_MAP_PROMPT.format(chunk=chunk))
        if result:
            chunk_summaries.append(result)

    if not chunk_summaries:
        return None
    if len(chunk_summaries) == 1:
        return chunk_summaries[0]

    combined = "\n".join(chunk_summaries)
    if len(combined) <= config.SUMMARY_CHUNK_CHARS:
        final = _call_ollama(_REDUCE_PROMPT.format(combined=combined))
        return final or combined

    # 結合してもチャンクサイズを超える場合は、部分要約の結合をそのまま返す（縮退仕様）
    return combined
