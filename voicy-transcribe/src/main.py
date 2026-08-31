"""FastAPIエントリポイント。"""
from __future__ import annotations

import logging
from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from src import config
from src.api.jobs import router as jobs_router

config.ensure_dirs()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
    handlers=[
        logging.FileHandler(config.LOG_DIR / "app.log", encoding="utf-8"),
        logging.StreamHandler(),
    ],
)

app = FastAPI(title="voicy-transcribe")
app.include_router(jobs_router)

STATIC_DIR = Path(__file__).parent / "static"
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


@app.get("/")
async def index():
    return FileResponse(STATIC_DIR / "index.html")


@app.get("/health")
async def health():
    return {"status": "ok"}
