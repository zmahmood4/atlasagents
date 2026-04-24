"""Knowledge base (Part 9)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field

from database import db
from security import default_rate_limit, require_api_key

router = APIRouter(prefix="/api/knowledge", tags=["knowledge"], dependencies=[Depends(require_api_key)])


class KnowledgeCreate(BaseModel):
    category: str
    title: str
    content: str
    tags: list[str] = Field(default_factory=list)
    written_by: str = "owner"


class KnowledgePatch(BaseModel):
    category: str | None = None
    title: str | None = None
    content: str | None = None
    tags: list[str] | None = None


@router.get("")
@default_rate_limit()
async def list_knowledge(
    request: Request,
    category: str | None = None,
    q: str | None = None,
    limit: int = Query(default=100, ge=1, le=500),
):
    query = db().table("knowledge_base").select("*")
    if category:
        query = query.eq("category", category)
    if q:
        query = query.or_(f"title.ilike.%{q}%,content.ilike.%{q}%")
    res = query.order("created_at", desc=True).limit(limit).execute()
    return {"entries": res.data or []}


@router.post("")
@default_rate_limit()
async def create_knowledge(request: Request, body: KnowledgeCreate):
    res = (
        db()
        .table("knowledge_base")
        .insert(
            {
                "category": body.category,
                "title": body.title,
                "content": body.content,
                "tags": body.tags,
                "written_by": body.written_by,
            }
        )
        .execute()
    )
    return (res.data or [{}])[0]


@router.put("/{entry_id}")
@default_rate_limit()
async def update_knowledge(request: Request, entry_id: str, patch: KnowledgePatch):
    data = patch.model_dump(exclude_unset=True)
    if not data:
        raise HTTPException(status_code=400, detail="no fields to update")
    res = db().table("knowledge_base").update(data).eq("id", entry_id).execute()
    if not (res.data or []):
        raise HTTPException(status_code=404, detail="entry not found")
    return res.data[0]
