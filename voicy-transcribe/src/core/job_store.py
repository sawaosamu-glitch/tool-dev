"""C-08: ジョブ状態のインメモリ管理。ADR-004参照（DB不使用）。"""
from __future__ import annotations

import asyncio
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import ClassVar, Literal, Optional

Status = Literal[
    "queued",
    "fetching_audio",
    "transcribing",
    "summarizing",
    "done",
    "fallback_required",
    "error",
]


@dataclass
class Job:
    id: str
    status: Status
    input_type: Literal["upload", "url"]
    input_ref: str
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    error_message: Optional[str] = None
    transcript_text: Optional[str] = None
    summary_text: Optional[str] = None
    output_path: Optional[str] = None


class JobAlreadyRunningError(Exception):
    """他のジョブが実行中のときに新規ジョブ作成を拒否する（F-005対応）。"""


class JobStore:
    """C-CODE-005: asyncio.Lockでジョブ作成を排他制御する。"""

    _ACTIVE_STATUSES: ClassVar[set[str]] = {
        "queued",
        "fetching_audio",
        "transcribing",
        "summarizing",
    }

    def __init__(self) -> None:
        self._jobs: dict[str, Job] = {}
        self._lock = asyncio.Lock()

    async def create(self, input_type: Literal["upload", "url"], input_ref: str) -> Job:
        async with self._lock:
            if any(j.status in self._ACTIVE_STATUSES for j in self._jobs.values()):
                raise JobAlreadyRunningError("別のジョブが実行中です")
            job = Job(
                id=str(uuid.uuid4()),
                status="queued",
                input_type=input_type,
                input_ref=input_ref,
            )
            self._jobs[job.id] = job
            return job

    def get(self, job_id: str) -> Optional[Job]:
        return self._jobs.get(job_id)

    def update(self, job_id: str, **fields: object) -> None:
        job = self._jobs.get(job_id)
        if job is None:
            return
        for key, value in fields.items():
            setattr(job, key, value)
