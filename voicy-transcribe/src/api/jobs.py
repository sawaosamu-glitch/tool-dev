"""C-02: JobAPI。ジョブ作成・状態照会のHTTPエンドポイント。"""
from __future__ import annotations

import asyncio
import logging
from typing import Literal, Optional

from fastapi import APIRouter, BackgroundTasks, File, Form, HTTPException, UploadFile

from src import config
from src.core import result_store, summarization, transcription, upload_handler, voicy_adapter
from src.core.job_store import Job, JobAlreadyRunningError, JobStore

logger = logging.getLogger(__name__)
router = APIRouter()
job_store = JobStore()


@router.post("/api/jobs")
async def create_job(
    background_tasks: BackgroundTasks,
    file: Optional[UploadFile] = File(None),
    url: Optional[str] = Form(None),
    confirmed: bool = Form(False),
    quality: Optional[str] = Form(None),
):
    # FR-DATA-002-b: 速い/標準/高精度。未知の値や未指定は標準扱いにする
    default_model_size = config.WHISPER_QUALITY_PRESETS[config.WHISPER_QUALITY_DEFAULT]
    model_size = config.WHISPER_QUALITY_PRESETS.get(quality or "", default_model_size)

    input_type: Literal["upload", "url"]
    if url and not file:
        if not voicy_adapter.is_valid_voicy_url(url):
            raise HTTPException(status_code=400, detail="Voicyのエピソードページのみ対応しています")
        if not confirmed:
            # H2承認ゲート: confirmed=falseはVoicyへのネットワークアクセス前に拒否する（F-002対応）
            raise HTTPException(status_code=400, detail="confirmedフラグが必要です")
        input_type, input_ref = "url", url
    elif file:
        input_type, input_ref = "upload", file.filename or "audio"
    else:
        raise HTTPException(status_code=400, detail="fileまたはurlのいずれかを指定してください")

    try:
        job = await job_store.create(input_type, input_ref)
    except JobAlreadyRunningError as exc:
        raise HTTPException(status_code=429, detail="別のジョブが実行中です") from exc

    if input_type == "upload":
        assert file is not None  # elif file: 分岐でのみ input_type=="upload" になる
        try:
            path = await upload_handler.save(file, job.id)
        except upload_handler.ValidationError as exc:
            job_store.update(job.id, status="error", error_message=str(exc))
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        background_tasks.add_task(_run_pipeline_from_file, job.id, path, input_ref, model_size)
    else:
        assert url is not None  # if url and not file: 分岐でのみ input_type=="url" になる
        background_tasks.add_task(
            _run_pipeline_from_url, job.id, url, confirmed, input_ref, model_size
        )

    return {"job_id": job.id, "status": job.status}


@router.get("/api/jobs/{job_id}")
async def get_job(job_id: str):
    job = job_store.get(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="ジョブが見つかりません")
    return _job_to_dict(job)


def _job_to_dict(job: Job) -> dict:
    return {
        "job_id": job.id,
        "status": job.status,
        "error_message": job.error_message,
        "transcript_text": job.transcript_text,
        "summary_text": job.summary_text,
        "output_path": job.output_path,
    }


async def _run_pipeline_from_url(
    job_id: str, url: str, confirmed: bool, input_ref: str, model_size: str
) -> None:
    job_store.update(job_id, status="fetching_audio")
    try:
        path = await voicy_adapter.fetch(url, confirmed, job_id)
    except voicy_adapter.PremiumContentError as exc:
        job_store.update(job_id, status="fallback_required", error_message=str(exc))
        return
    except Exception:
        logger.exception("Voicy音声取得中にエラーが発生しました")
        path = None

    if path is None:
        job_store.update(
            job_id,
            status="fallback_required",
            error_message=(
                "Voicy URLからの自動取得に失敗しました。"
                "音声ファイルを手動でアップロードしてください"
            ),
        )
        return

    await _transcribe_and_summarize(job_id, path, "url", input_ref, model_size)


async def _run_pipeline_from_file(job_id: str, path, input_ref: str, model_size: str) -> None:
    await _transcribe_and_summarize(job_id, path, "upload", input_ref, model_size)


async def _transcribe_and_summarize(
    job_id: str, path, input_type: str, input_ref: str, model_size: str
) -> None:
    job_store.update(job_id, status="transcribing")
    try:
        transcript_text = await asyncio.to_thread(transcription.transcribe, path, model_size)
    except transcription.TranscriptionError as exc:
        job_store.update(job_id, status="error", error_message=str(exc))
        return

    job_store.update(job_id, status="summarizing")
    summary_text = await asyncio.to_thread(summarization.summarize, transcript_text)
    if summary_text is None and len(transcript_text) >= 50:
        error_message = (
            "要約エンジン（Ollama）に接続できません。"
            "ターミナルで `ollama serve` を実行してから、もう一度お試しください"
        )
    elif summary_text is None:
        error_message = "要約するには本文が短すぎます"
    else:
        error_message = None

    output_path = result_store.save(
        source_name=input_ref,
        transcript_text=transcript_text,
        summary_text=summary_text,
        input_type=input_type,
        input_ref=input_ref,
    )

    job_store.update(
        job_id,
        status="done",
        transcript_text=transcript_text,
        summary_text=summary_text,
        error_message=error_message,
        output_path=str(output_path) if output_path else None,
    )
