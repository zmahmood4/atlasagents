"""Supabase client singleton.

The backend uses the service-role key and therefore bypasses RLS. Clients
created here should never be exposed to the browser.
"""

from __future__ import annotations

from functools import lru_cache
from typing import Optional

from supabase import Client, create_client

from config import get_settings


@lru_cache(maxsize=1)
def get_db() -> Client:
    settings = get_settings()
    if not settings.supabase_url or not settings.supabase_service_key:
        raise RuntimeError(
            "SUPABASE_URL and SUPABASE_SERVICE_KEY must be set to use the database."
        )
    return create_client(settings.supabase_url, settings.supabase_service_key)


_override: Optional[Client] = None


def set_db_override(client: Optional[Client]) -> None:
    """Used by tests to inject a mock/stub client."""
    global _override
    _override = client


def db() -> Client:
    """Resolved database client — honors a test-time override."""
    if _override is not None:
        return _override
    return get_db()
