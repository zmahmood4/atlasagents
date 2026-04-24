"""Shared pytest fixtures — in-memory Supabase fake + async Anthropic fake."""

from __future__ import annotations

import os
import sys
import uuid
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import pytest

BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

# Env before importing config.
os.environ.setdefault("ENVIRONMENT", "test")
os.environ.setdefault("ANTHROPIC_API_KEY", "sk-test")
os.environ.setdefault("SUPABASE_URL", "http://test.local")
os.environ.setdefault("SUPABASE_SERVICE_KEY", "test-service")
os.environ.setdefault("SUPABASE_ANON_KEY", "test-anon")
os.environ.setdefault("DASHBOARD_API_KEY", "test-dashboard-key")
os.environ.setdefault("RATE_LIMIT_PER_MINUTE", "5")

from config import get_settings  # noqa: E402

get_settings.cache_clear()


# ---------------------------------------------------------------------------
# Fake Supabase client
# ---------------------------------------------------------------------------

@dataclass
class FakeResponse:
    data: list[dict[str, Any]] = field(default_factory=list)
    count: int | None = None


class FakeQuery:
    _TABLE_DEFAULTS: dict[str, dict[str, Any]] = {
        "task_bus": {"status": "pending", "priority": 5},
        "pending_approvals": {"status": "pending", "urgency": "normal", "payload": {}},
        "experiment_log": {"status": "proposed"},
        "agents": {
            "status": "idle",
            "enabled": True,
            "tokens_used_today": 0,
            "tokens_used_month": 0,
            "cost_usd_today": 0,
            "cost_usd_month": 0,
            "daily_token_cap": 50000,
            "monthly_token_cap": 500000,
        },
        "work_artifacts": {"metadata": {}},
        "knowledge_base": {"tags": []},
        "agent_actions": {"importance": "normal"},
        "agent_runs": {"status": "running", "input_tokens": 0, "output_tokens": 0, "cost_usd": 0, "actions_taken": []},
        "business_metrics": {},
        "shared_memory": {},
        "api_rate_limits": {"requests_count": 0},
    }

    def __init__(self, store: dict[str, list[dict[str, Any]]], table: str):
        self._store = store
        self._table = table
        self._rows = list(store.get(table, []))
        self._op: str | None = None
        self._payload: Any = None
        self._select_count = False
        self._order: list[tuple[str, bool]] = []
        self._range: tuple[int, int] | None = None
        self._limit: int | None = None
        self._upsert_on_conflict: str | None = None

    # ---- filters ----
    def select(self, *cols: str, count: str | None = None):
        self._op = self._op or "select"
        self._select_count = count == "exact"
        return self

    def eq(self, col: str, value: Any):
        self._rows = [r for r in self._rows if r.get(col) == value]
        return self

    def neq(self, col: str, value: Any):
        self._rows = [r for r in self._rows if r.get(col) != value]
        return self

    def in_(self, col: str, values: list[Any]):
        vs = set(values)
        self._rows = [r for r in self._rows if r.get(col) in vs]
        return self

    def gt(self, col: str, value: Any):
        self._rows = [r for r in self._rows if (r.get(col) or "") > value]
        return self

    def gte(self, col: str, value: Any):
        self._rows = [r for r in self._rows if (r.get(col) or "") >= value]
        return self

    def contains(self, col: str, value: Any):
        def _contains(row_val, target):
            if row_val is None:
                return False
            if isinstance(target, list):
                return isinstance(row_val, list) and all(t in row_val for t in target)
            return target in row_val
        self._rows = [r for r in self._rows if _contains(r.get(col), value)]
        return self

    def or_(self, expr: str):
        terms = [t.strip() for t in expr.split(",") if t.strip()]
        keep: list[dict[str, Any]] = []
        for r in self._rows:
            for t in terms:
                parts = t.split(".", 2)
                if len(parts) != 3 or parts[1] not in ("ilike", "like"):
                    continue
                col, _, pattern = parts
                pattern_clean = pattern.strip("%").lower()
                value = str(r.get(col, "")).lower()
                if pattern_clean in value:
                    keep.append(r)
                    break
        self._rows = keep
        return self

    def order(self, col: str, desc: bool = False):
        self._order.append((col, desc))
        return self

    def range(self, start: int, end: int):
        self._range = (start, end)
        return self

    def limit(self, n: int):
        self._limit = n
        return self

    # ---- mutations ----
    def insert(self, payload: Any):
        self._op = "insert"
        self._payload = payload
        return self

    def update(self, payload: dict[str, Any]):
        self._op = "update"
        self._payload = payload
        return self

    def upsert(self, payload: Any, on_conflict: str | None = None):
        self._op = "upsert"
        self._payload = payload
        self._upsert_on_conflict = on_conflict
        return self

    def delete(self):
        self._op = "delete"
        return self

    # ---- execute ----
    def execute(self) -> FakeResponse:
        if self._op == "insert":
            return self._do_insert()
        if self._op == "update":
            return self._do_update()
        if self._op == "upsert":
            return self._do_upsert()
        if self._op == "delete":
            return self._do_delete()
        return self._do_select()

    # ---- internals ----
    def _assign_defaults(self, row: dict[str, Any]) -> dict[str, Any]:
        from datetime import datetime, timezone

        row = dict(row)
        for k, v in self._TABLE_DEFAULTS.get(self._table, {}).items():
            row.setdefault(k, v)
        if "id" not in row and self._table != "shared_memory":
            row["id"] = str(uuid.uuid4())
        row.setdefault("created_at", datetime.now(timezone.utc).isoformat())
        if self._table in {"shared_memory", "experiment_log", "knowledge_base"}:
            row.setdefault("updated_at", datetime.now(timezone.utc).isoformat())
        return row

    def _do_select(self) -> FakeResponse:
        rows = list(self._rows)
        for col, desc in self._order:
            rows.sort(key=lambda r: (r.get(col) is None, r.get(col) or ""), reverse=desc)
        total = len(rows)
        if self._range is not None:
            s, e = self._range
            rows = rows[s : e + 1]
        elif self._limit is not None:
            rows = rows[: self._limit]
        return FakeResponse(data=rows, count=total if self._select_count else None)

    def _do_insert(self) -> FakeResponse:
        payload = self._payload
        rows = payload if isinstance(payload, list) else [payload]
        inserted = [self._assign_defaults(r) for r in rows]
        self._store.setdefault(self._table, []).extend(inserted)
        return FakeResponse(data=inserted)

    def _do_update(self) -> FakeResponse:
        updated: list[dict[str, Any]] = []
        target_keys = []
        for r in self._rows:
            key = r.get("id") if "id" in r else r.get("key")
            target_keys.append(key)
        target_set = set(target_keys)
        for r in self._store.setdefault(self._table, []):
            key = r.get("id") if "id" in r else r.get("key")
            if key in target_set:
                r.update(self._payload)
                updated.append(r)
        return FakeResponse(data=updated)

    def _do_upsert(self) -> FakeResponse:
        payload = self._payload
        rows = payload if isinstance(payload, list) else [payload]
        key_col = self._upsert_on_conflict or ("key" if self._table == "shared_memory" else "id")
        store_rows = self._store.setdefault(self._table, [])
        result: list[dict[str, Any]] = []
        for new in rows:
            key_val = new.get(key_col)
            match = next((r for r in store_rows if r.get(key_col) == key_val), None)
            if match is not None:
                match.update(new)
                result.append(match)
            else:
                inserted = self._assign_defaults(new)
                store_rows.append(inserted)
                result.append(inserted)
        return FakeResponse(data=result)

    def _do_delete(self) -> FakeResponse:
        target_ids = {r.get("id") for r in self._rows}
        store_rows = self._store.setdefault(self._table, [])
        self._store[self._table] = [r for r in store_rows if r.get("id") not in target_ids]
        return FakeResponse(data=list(self._rows))


class FakeSupabase:
    def __init__(self) -> None:
        self.store: dict[str, list[dict[str, Any]]] = {}

    def table(self, name: str) -> FakeQuery:
        return FakeQuery(self.store, name)


@pytest.fixture
def fake_db():
    from database import set_db_override

    client = FakeSupabase()
    set_db_override(client)
    yield client
    set_db_override(None)


# ---------------------------------------------------------------------------
# Scripted async Anthropic client
# ---------------------------------------------------------------------------

@dataclass
class FakeBlock:
    type: str
    text: str | None = None
    id: str | None = None
    name: str | None = None
    input: dict[str, Any] | None = None


@dataclass
class FakeUsage:
    input_tokens: int
    output_tokens: int


@dataclass
class FakeMessage:
    content: list[FakeBlock]
    stop_reason: str
    usage: FakeUsage


class ScriptedAnthropic:
    def __init__(self, responses: list[FakeMessage]):
        self._responses = list(responses)
        self.calls: list[dict[str, Any]] = []

        class _Messages:
            def __init__(inner):
                inner._outer = self

            async def create(inner, **kwargs):
                inner._outer.calls.append(kwargs)
                if not inner._outer._responses:
                    raise RuntimeError("ScriptedAnthropic: no more scripted responses")
                return inner._outer._responses.pop(0)

        self.messages = _Messages()


def text_response(text: str, input_tokens: int = 50, output_tokens: int = 20) -> FakeMessage:
    return FakeMessage(
        content=[FakeBlock(type="text", text=text)],
        stop_reason="end_turn",
        usage=FakeUsage(input_tokens=input_tokens, output_tokens=output_tokens),
    )


def tool_use_response(name: str, inputs: dict[str, Any], block_id: str = "toolu_1") -> FakeMessage:
    return FakeMessage(
        content=[FakeBlock(type="tool_use", id=block_id, name=name, input=inputs)],
        stop_reason="tool_use",
        usage=FakeUsage(input_tokens=40, output_tokens=10),
    )


@pytest.fixture
def fake_anthropic():
    from agents import set_anthropic_override

    def _install(responses: list[FakeMessage]) -> ScriptedAnthropic:
        client = ScriptedAnthropic(responses)
        set_anthropic_override(client)
        return client

    yield _install
    set_anthropic_override(None)


# ---------------------------------------------------------------------------
# FastAPI test client
# ---------------------------------------------------------------------------

@pytest.fixture
def api_client(fake_db):
    from fastapi.testclient import TestClient

    from agents import ALL_AGENTS
    from main import app

    for defn in ALL_AGENTS:
        fake_db.store.setdefault("agents", []).append(
            {
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
        )

    return TestClient(app)
