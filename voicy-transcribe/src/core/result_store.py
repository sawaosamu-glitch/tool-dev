"""C-07: 文字起こし・要約結果のMarkdown保存（FR-DATA-005）。"""
from __future__ import annotations

import logging
from datetime import datetime
from pathlib import Path
from typing import Optional

from src import config

logger = logging.getLogger(__name__)


def save(
    *,
    source_name: str,
    transcript_text: str,
    summary_text: Optional[str],
    input_type: str,
    input_ref: str,
) -> Optional[Path]:
    config.OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    safe_name = "".join(c for c in Path(source_name).stem if c.isalnum() or c in "-_") or "audio"
    dest = config.OUTPUT_DIR / f"{timestamp}_{safe_name}.md"

    content = (
        f"# 文字起こし結果\n\n"
        f"- 処理日時: {timestamp}\n"
        f"- 入力種別: {input_type}\n"
        f"- 入力元: {input_ref}\n\n"
        f"## 要約\n\n{summary_text or '（要約なし）'}\n\n"
        f"## 全文テキスト\n\n{transcript_text}\n"
    )

    try:
        dest.write_text(content, encoding="utf-8")
    except OSError:
        logger.exception("結果の保存に失敗しました")
        return None
    return dest
