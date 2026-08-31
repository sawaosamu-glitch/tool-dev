import asyncio

import pytest

from src.core.job_store import JobAlreadyRunningError, JobStore


@pytest.mark.asyncio
async def test_create_and_get_job():
    store = JobStore()
    job = await store.create("upload", "test.mp3")
    assert job.status == "queued"
    assert store.get(job.id) is job


@pytest.mark.asyncio
async def test_create_rejects_second_active_job():
    store = JobStore()
    await store.create("upload", "a.mp3")
    with pytest.raises(JobAlreadyRunningError):
        await store.create("upload", "b.mp3")


@pytest.mark.asyncio
async def test_create_allows_new_job_after_previous_done():
    store = JobStore()
    job1 = await store.create("upload", "a.mp3")
    store.update(job1.id, status="done")
    job2 = await store.create("upload", "b.mp3")
    assert job2.id != job1.id


@pytest.mark.asyncio
async def test_concurrent_create_only_admits_one():
    store = JobStore()
    results = await asyncio.gather(
        _try_create(store, "a.mp3"),
        _try_create(store, "b.mp3"),
        return_exceptions=True,
    )
    successes = [r for r in results if not isinstance(r, Exception)]
    failures = [r for r in results if isinstance(r, Exception)]
    assert len(successes) == 1
    assert len(failures) == 1
    assert isinstance(failures[0], JobAlreadyRunningError)


async def _try_create(store: JobStore, ref: str):
    return await store.create("upload", ref)
