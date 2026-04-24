"""Web search tool (Part 8 — gated to research, marketing, sales, ceo, vp_product)."""

from __future__ import annotations

import json
from typing import Any

import httpx

from config import get_settings

TOOLS: list[dict[str, Any]] = [
    {
        "name": "search_web",
        "description": "Live web search via Brave. Returns the top 5 results with title, url, and snippet. Use sparingly — lean on shared_memory and knowledge_base first.",
        "input_schema": {
            "type": "object",
            "properties": {"query": {"type": "string"}},
            "required": ["query"],
        },
    },
]


async def search_web(agent_name: str, query: str) -> str:
    settings = get_settings()
    if not settings.brave_search_api_key:
        return json.dumps(
            {
                "error": "web search unavailable — BRAVE_SEARCH_API_KEY is not set.",
                "hint": "Proceed without web search; rely on shared_memory and your own reasoning.",
            }
        )
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.get(
                "https://api.search.brave.com/res/v1/web/search",
                params={"q": query, "count": 5},
                headers={
                    "Accept": "application/json",
                    "X-Subscription-Token": settings.brave_search_api_key,
                },
            )
        if r.status_code != 200:
            return json.dumps({"error": f"brave search HTTP {r.status_code}"})
        data = r.json()
        results = [
            {
                "title": hit.get("title"),
                "url": hit.get("url"),
                "snippet": hit.get("description"),
            }
            for hit in (data.get("web") or {}).get("results", [])[:5]
        ]
        return json.dumps({"query": query, "results": results})
    except Exception as exc:
        return json.dumps({"error": f"web search error: {exc!s}"})


HANDLERS = {"search_web": search_web}
