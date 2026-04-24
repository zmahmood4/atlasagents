"""API key auth + rate limiting + per-agent cap enforcement."""

from __future__ import annotations

import asyncio
import uuid


def test_missing_api_key_returns_401(api_client):
    r = api_client.get("/api/agents")
    assert r.status_code == 401


def test_wrong_api_key_returns_401(api_client):
    r = api_client.get("/api/agents", headers={"X-API-Key": "nope"})
    assert r.status_code == 401


def test_correct_api_key_returns_200(api_client):
    r = api_client.get("/api/agents", headers={"X-API-Key": "test-dashboard-key"})
    assert r.status_code == 200
    assert len(r.json()["agents"]) == 13


def test_health_unauth_returns_200(api_client):
    r = api_client.get("/api/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_rate_limit_triggers_429(api_client):
    from security import limiter

    limiter.reset()
    headers = {"X-API-Key": "test-dashboard-key"}
    last = 0
    for _ in range(15):
        last = api_client.get("/api/agents", headers=headers).status_code
        if last == 429:
            break
    assert last == 429


def test_capped_agent_is_skipped(fake_db):
    from agents import CEO, run

    agent_id = str(uuid.uuid4())
    fake_db.store["agents"] = [
        {
            "id": agent_id,
            "name": CEO.name,
            "role": CEO.role,
            "department": CEO.department,
            "enabled": True,
            "status": "idle",
            "system_prompt": CEO.system_prompt,
            "schedule_seconds": CEO.schedule_seconds,
            "daily_token_cap": 1000,
            "monthly_token_cap": 10000,
            "tokens_used_today": 2000,
            "tokens_used_month": 5000,
            "cost_usd_today": 0,
            "cost_usd_month": 0,
        }
    ]
    result = asyncio.run(run(CEO))
    assert result["ok"] is True
    assert result.get("skipped") is True
    assert "cap" in (result.get("reason") or "").lower()
