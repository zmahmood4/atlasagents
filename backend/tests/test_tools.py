"""Tool-level unit tests (new spec signatures)."""

from __future__ import annotations

import asyncio
import json
import uuid


def _run(coro):
    return asyncio.run(coro)


def test_write_then_read_memory(fake_db):
    from tools.memory_tools import read_memory, write_memory

    _run(
        write_memory(
            "ceo",
            key="weekly_priorities",
            value={"items": ["ship LP"]},
            category="strategy",
            summary="ship LP",
        )
    )
    res = json.loads(_run(read_memory("ceo", key="weekly_priorities")))
    assert res["entries"][0]["value"] == {"items": ["ship LP"]}
    assert res["entries"][0]["category"] == "strategy"


def test_post_task_and_get_my_tasks(fake_db):
    fake_db.store["agents"] = [
        {
            "id": str(uuid.uuid4()),
            "name": n,
            "role": "x",
            "department": "engineering",
            "enabled": True,
            "status": "idle",
            "system_prompt": "",
            "schedule_seconds": 60,
            "daily_token_cap": 1,
            "monthly_token_cap": 1,
            "tokens_used_today": 0,
            "tokens_used_month": 0,
            "cost_usd_today": 0,
            "cost_usd_month": 0,
        }
        for n in ("ceo", "developer_frontend")
    ]
    from tools.task_tools import get_my_tasks, post_task

    res = json.loads(
        _run(
            post_task(
                "ceo",
                to_agent="developer_frontend",
                task_type="dev_ticket",
                payload={"title": "Ship LP", "acceptance_criteria": ["CTA visible"]},
                priority=2,
            )
        )
    )
    assert res["ok"] is True

    tasks = json.loads(_run(get_my_tasks("developer_frontend")))["tasks"]
    assert len(tasks) == 1
    assert tasks[0]["task_type"] == "dev_ticket"
    assert tasks[0]["payload"]["title"] == "Ship LP"


def test_request_approval_creates_pending(fake_db):
    fake_db.store["agents"] = [
        {"id": str(uuid.uuid4()), "name": "marketing", "role": "x", "department": "gtm",
         "enabled": True, "status": "idle", "system_prompt": "", "schedule_seconds": 60,
         "daily_token_cap": 1, "monthly_token_cap": 1, "tokens_used_today": 0,
         "tokens_used_month": 0, "cost_usd_today": 0, "cost_usd_month": 0}
    ]
    from tools.decision_tools import request_approval

    res = json.loads(
        _run(
            request_approval(
                "marketing",
                action_type="PUBLISH",
                title="Publish landing page",
                description="Go live with LP v1",
                reasoning="Copy approved internally.",
                payload={"artifact_id": "abc"},
            )
        )
    )
    assert res["ok"] is True
    approvals = fake_db.store.get("pending_approvals", [])
    assert len(approvals) == 1
    assert approvals[0]["status"] == "pending"
    assert approvals[0]["action_type"] == "PUBLISH"
    assert approvals[0]["description"] == "Go live with LP v1"


def test_save_and_read_artifact(fake_db):
    from tools.artifact_tools import read_artifacts, save_artifact

    res = json.loads(
        _run(
            save_artifact(
                "marketing",
                artifact_type="content",
                title="Hero v1",
                content="Save 5 minutes a day.",
                metadata={"channel": "landing"},
            )
        )
    )
    assert res["ok"] is True

    got = json.loads(_run(read_artifacts("marketing", artifact_type="content")))
    assert len(got["artifacts"]) == 1
    assert got["artifacts"][0]["title"] == "Hero v1"


def test_create_experiment(fake_db):
    from tools.experiment_tools import create_experiment

    res = json.loads(
        _run(
            create_experiment(
                "ceo",
                title="Founder Digest",
                hypothesis="Founders pay for a daily digest.",
                success_metric="10 paying users in 30 days",
            )
        )
    )
    assert res["ok"] is True
    assert len(fake_db.store.get("experiment_log", [])) == 1


def test_write_metric_and_read(fake_db):
    from tools.metrics_tools import read_metrics, write_metric

    assert json.loads(
        _run(write_metric("analytics", metric_name="signups", metric_value=12, metric_unit="count"))
    )["ok"] is True
    res = json.loads(_run(read_metrics("analytics", metric_name="signups", days=30)))
    assert len(res["samples"]) == 1
    assert res["samples"][0]["metric_value"] == 12


def test_log_decision_writes_agent_action(fake_db):
    from tools.decision_tools import log_decision

    fake_db.store["agents"] = [
        {"id": str(uuid.uuid4()), "name": "ceo", "role": "x", "department": "command",
         "enabled": True, "status": "idle", "system_prompt": "", "schedule_seconds": 60,
         "daily_token_cap": 1, "monthly_token_cap": 1, "tokens_used_today": 0,
         "tokens_used_month": 0, "cost_usd_today": 0, "cost_usd_month": 0}
    ]
    res = json.loads(
        _run(
            log_decision(
                "ceo",
                decision="Kill experiment X",
                reasoning="signal too weak after 7 days",
                confidence=8,
            )
        )
    )
    assert res["ok"] is True
    actions = fake_db.store.get("agent_actions", [])
    assert len(actions) == 1
    assert actions[0]["action_type"] == "decision"
    assert actions[0]["importance"] == "high"


def test_create_ticket_is_post_task_with_dev_ticket_type(fake_db):
    from tools.task_tools import create_ticket

    res = json.loads(
        _run(
            create_ticket(
                "vp_engineering",
                to_agent="developer_backend",
                payload={"title": "API endpoint", "acceptance_criteria": ["200 on happy path"]},
                priority=3,
            )
        )
    )
    assert res["ok"] is True
    tasks = fake_db.store.get("task_bus", [])
    assert len(tasks) == 1
    assert tasks[0]["task_type"] == "dev_ticket"
