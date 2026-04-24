"""Async agent base loop + tool dispatch + cost tracking + cap enforcement."""

from __future__ import annotations

import asyncio
import uuid


def _seed_agent(fake_db, defn, **overrides) -> None:
    row = {
        "id": str(uuid.uuid4()),
        "name": defn.name,
        "role": defn.role,
        "department": defn.department,
        "enabled": True,
        "status": "idle",
        "system_prompt": defn.system_prompt,
        "schedule_seconds": defn.schedule_seconds,
        "daily_token_cap": defn.daily_token_cap,
        "monthly_token_cap": defn.monthly_token_cap,
        "tokens_used_today": 0,
        "tokens_used_month": 0,
        "cost_usd_today": 0,
        "cost_usd_month": 0,
    }
    row.update(overrides)
    fake_db.store.setdefault("agents", []).append(row)


def test_loop_completes_without_tool_use(fake_db, fake_anthropic):
    from agents import CEO, run
    from tests.conftest import text_response

    _seed_agent(fake_db, CEO)
    fake_anthropic([text_response("Nothing to do this tick.")])

    result = asyncio.run(run(CEO))
    assert result["ok"] is True
    assert result.get("tool_calls", 0) == 0


def test_loop_dispatches_tool_calls(fake_db, fake_anthropic):
    from agents import CEO, run
    from tests.conftest import text_response, tool_use_response

    _seed_agent(fake_db, CEO)
    fake_anthropic(
        [
            tool_use_response(
                "write_memory",
                {
                    "key": "weekly_priorities",
                    "value": {"items": ["ship LP"]},
                    "category": "strategy",
                    "summary": "ship LP",
                },
            ),
            text_response("Priorities updated."),
        ]
    )

    result = asyncio.run(run(CEO))
    assert result["ok"] is True
    assert result["tool_calls"] == 1
    mem = fake_db.store.get("shared_memory", [])
    assert any(r["key"] == "weekly_priorities" for r in mem)


def test_cost_tracking_increments(fake_db, fake_anthropic):
    from agents import CEO, run
    from tests.conftest import text_response

    _seed_agent(fake_db, CEO)
    fake_anthropic([text_response("done", input_tokens=1000, output_tokens=500)])

    asyncio.run(run(CEO))
    agent_row = next(r for r in fake_db.store["agents"] if r["name"] == CEO.name)
    assert agent_row["tokens_used_today"] == 1500
    assert agent_row["tokens_used_month"] == 1500
    assert float(agent_row["cost_usd_today"]) > 0


def test_cap_enforcement_stops_before_calling_claude(fake_db, fake_anthropic):
    from agents import CEO, run

    _seed_agent(fake_db, CEO, daily_token_cap=100, tokens_used_today=500)
    scripted = fake_anthropic([])  # should never be called
    result = asyncio.run(run(CEO))
    assert result.get("skipped") is True
    assert scripted.calls == []


def test_error_path_sets_status_error(fake_db):
    from agents import CEO, run, set_anthropic_override

    _seed_agent(fake_db, CEO)

    class Boom:
        class messages:
            @staticmethod
            async def create(**_):
                raise RuntimeError("anthropic down")

    set_anthropic_override(Boom())
    try:
        result = asyncio.run(run(CEO))
    finally:
        set_anthropic_override(None)

    assert result["ok"] is False
    agent_row = next(r for r in fake_db.store["agents"] if r["name"] == CEO.name)
    assert agent_row["status"] == "error"


def test_tool_gating_ceo_has_search_and_experiments(fake_db):
    from tools.registry import tool_specs_for

    names = {t["name"] for t in tool_specs_for("ceo")}
    assert "search_web" in names
    assert "create_experiment" in names
    # ticket tools only for engineering
    assert "create_ticket" not in names


def test_tool_gating_developer_has_tickets(fake_db):
    from tools.registry import tool_specs_for

    names = {t["name"] for t in tool_specs_for("developer_frontend")}
    assert "create_ticket" in names
    assert "get_tickets" in names
    assert "search_web" not in names


def test_tool_gating_support_has_base_only(fake_db):
    from tools.registry import tool_specs_for

    names = {t["name"] for t in tool_specs_for("support")}
    assert "save_artifact" in names
    assert "request_approval" in names
    assert "search_web" not in names
    assert "create_experiment" not in names
    assert "write_metric" not in names
