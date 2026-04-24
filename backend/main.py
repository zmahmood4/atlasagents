"""FastAPI application entry point (Part 10)."""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

from config import get_settings
from routers import (
    actions,
    agents,
    approvals,
    artifacts,
    experiments,
    health,
    knowledge,
    metrics,
    settings as settings_router,
)
from scheduler import start_scheduler, stop_scheduler
from security import install_security

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s :: %(message)s",
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    cfg = get_settings()
    if cfg.environment != "test":
        start_scheduler()
        # Cold-start: fire CEO → VPs cascade 3s after boot so the team has moved
        # by the time the owner lands on the dashboard. Honours caps + scheduler.
        import asyncio as _asyncio

        async def _boot_kickoff():
            try:
                await _asyncio.sleep(3)
                from agents import AGENTS_BY_NAME, run as _run
                for n in ("ceo", "vp_product", "vp_engineering", "vp_gtm"):
                    d = AGENTS_BY_NAME.get(n)
                    if d is None:
                        continue
                    _asyncio.create_task(_run(d))
                    await _asyncio.sleep(2)
            except Exception:
                logging.getLogger(__name__).exception("boot kickoff failed")

        _asyncio.create_task(_boot_kickoff())
    try:
        yield
    finally:
        stop_scheduler()


app = FastAPI(
    title="ATLAS Autonomous AI Company",
    version="1.0.0",
    description="Owner dashboard API for 13 collaborating AI agents.",
    lifespan=lifespan,
)

install_security(app)

app.include_router(health.router)
app.include_router(agents.router)
app.include_router(actions.router)
app.include_router(artifacts.router)
app.include_router(experiments.router)
app.include_router(approvals.router)
app.include_router(knowledge.router)
app.include_router(metrics.router)
app.include_router(settings_router.router)
