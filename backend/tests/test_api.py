"""End-to-end API tests (Part 9 surface)."""

from __future__ import annotations

HEADERS = {"X-API-Key": "test-dashboard-key"}


def test_list_agents_returns_13(api_client):
    r = api_client.get("/api/agents", headers=HEADERS)
    assert r.status_code == 200
    assert len(r.json()["agents"]) == 13


def test_get_actions_paginated(api_client, fake_db):
    fake_db.store["agent_actions"] = [
        {
            "id": f"{i}",
            "agent_name": "ceo",
            "action_type": "tool",
            "summary": f"Action {i}",
            "importance": "normal",
            "tool_name": None,
            "tool_input": None,
            "tool_output": None,
            "created_at": f"2026-04-{i:02d}",
        }
        for i in range(1, 31)
    ]
    r = api_client.get("/api/actions?limit=10&offset=0", headers=HEADERS)
    assert r.status_code == 200
    body = r.json()
    assert len(body["actions"]) == 10
    assert body["total"] == 30


def test_approve_changes_status(api_client, fake_db):
    fake_db.store["pending_approvals"] = [
        {
            "id": "a1",
            "agent_name": "marketing",
            "action_type": "PUBLISH",
            "title": "Launch LP",
            "description": "Go live",
            "reasoning": "ready",
            "urgency": "normal",
            "status": "pending",
            "payload": {},
            "created_at": "2026-04-23",
        }
    ]
    r = api_client.post("/api/approvals/a1/approve", headers=HEADERS)
    assert r.status_code == 200
    assert r.json()["status"] == "approved"


def test_reject_changes_status(api_client, fake_db):
    fake_db.store["pending_approvals"] = [
        {
            "id": "a2",
            "agent_name": "sales",
            "action_type": "EMAIL",
            "title": "Send outreach",
            "description": "Cold",
            "reasoning": "cold",
            "urgency": "normal",
            "status": "pending",
            "payload": {},
            "created_at": "2026-04-23",
        }
    ]
    r = api_client.post("/api/approvals/a2/reject", headers=HEADERS)
    assert r.status_code == 200
    assert r.json()["status"] == "rejected"


def test_redirect_creates_task(api_client, fake_db):
    fake_db.store["pending_approvals"] = [
        {
            "id": "a3",
            "agent_name": "marketing",
            "action_type": "PUBLISH",
            "title": "Publish blog",
            "description": "Post",
            "reasoning": "ready",
            "urgency": "normal",
            "status": "pending",
            "payload": {},
            "created_at": "2026-04-23",
        }
    ]
    r = api_client.post(
        "/api/approvals/a3/redirect",
        headers=HEADERS,
        json={"note": "Tone is too hype — trim."},
    )
    assert r.status_code == 200
    assert r.json()["status"] == "redirected"
    tasks = fake_db.store.get("task_bus", [])
    assert len(tasks) == 1
    assert tasks[0]["to_agent"] == "marketing"
    assert tasks[0]["task_type"] == "owner_redirect"


def test_list_artifacts(api_client, fake_db):
    fake_db.store["work_artifacts"] = [
        {
            "id": "art1",
            "agent_name": "marketing",
            "artifact_type": "content",
            "title": "Hero v1",
            "content": "...",
            "metadata": {},
            "experiment_id": None,
            "created_at": "2026-04-23",
        }
    ]
    r = api_client.get("/api/artifacts", headers=HEADERS)
    assert r.status_code == 200
    assert len(r.json()["artifacts"]) == 1


def test_update_agent_config(api_client, fake_db):
    agent_id = fake_db.store["agents"][0]["id"]
    r = api_client.put(
        f"/api/agents/{agent_id}",
        headers=HEADERS,
        json={"daily_token_cap": 5000},
    )
    assert r.status_code == 200
    assert r.json()["daily_token_cap"] == 5000


def test_settings_pause_and_resume(api_client, fake_db):
    r = api_client.post("/api/settings/pause-all", headers=HEADERS)
    assert r.status_code == 200
    assert all(a["enabled"] is False for a in fake_db.store["agents"])

    r = api_client.post("/api/settings/resume-all", headers=HEADERS)
    assert r.status_code == 200
    assert all(a["enabled"] is True for a in fake_db.store["agents"])


def test_metrics_summary(api_client):
    r = api_client.get("/api/metrics/summary", headers=HEADERS)
    assert r.status_code == 200
    body = r.json()
    assert body["totals"]["agents_total"] == 13


def test_experiment_crud(api_client, fake_db):
    r = api_client.post(
        "/api/experiments",
        headers=HEADERS,
        json={"title": "Test", "hypothesis": "H", "success_metric": "M"},
    )
    assert r.status_code == 200
    exp_id = r.json()["id"]
    r = api_client.put(
        f"/api/experiments/{exp_id}",
        headers=HEADERS,
        json={"status": "active", "effort_score": 3, "revenue_score": 8},
    )
    assert r.status_code == 200
    assert r.json()["status"] == "active"


def test_knowledge_crud(api_client, fake_db):
    r = api_client.post(
        "/api/knowledge",
        headers=HEADERS,
        json={"category": "company", "title": "Mission", "content": "x"},
    )
    assert r.status_code == 200
    entry_id = r.json()["id"]
    r = api_client.put(
        f"/api/knowledge/{entry_id}",
        headers=HEADERS,
        json={"content": "y"},
    )
    assert r.status_code == 200
    assert r.json()["content"] == "y"


def test_trigger_agent(api_client, fake_db):
    agent_id = fake_db.store["agents"][0]["id"]
    r = api_client.post(f"/api/agents/{agent_id}/trigger", headers=HEADERS)
    assert r.status_code == 200
    assert r.json()["queued"] is True


def test_settings_get(api_client):
    r = api_client.get("/api/settings", headers=HEADERS)
    assert r.status_code == 200
    assert len(r.json()["agents"]) == 13
