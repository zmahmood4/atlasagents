"""Central configuration loaded from environment variables."""

from __future__ import annotations

from functools import lru_cache
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    # ---- Anthropic ----
    anthropic_api_key: str = Field(default="")
    anthropic_model: str = Field(default="claude-sonnet-4-6")
    anthropic_max_tokens: int = Field(default=4096)

    # Per-million pricing for claude-sonnet-4-6 (USD).
    price_input_per_mtok: float = Field(default=3.00)
    price_output_per_mtok: float = Field(default=15.00)

    # ---- Supabase ----
    supabase_url: str = Field(default="")
    supabase_service_key: str = Field(default="")
    supabase_anon_key: str = Field(default="")

    # ---- Dashboard / frontend ----
    dashboard_api_key: str = Field(default="")
    next_public_frontend_url: str = Field(default="https://atlasagents.onrender.com")
    next_public_api_url: str = Field(default="https://atlasagents.onrender.com")
    # Optional extra CORS allowlist, comma-separated. Used for Cloudflare Pages
    # preview URLs + custom domains.
    frontend_origins: str = Field(default="")

    # ---- Optional external tools ----
    brave_search_api_key: str = Field(default="")

    # ---- Runtime ----
    environment: Literal["development", "production", "test"] = Field(default="development")

    # ---- Rate limiting ----
    rate_limit_per_minute: int = Field(default=60)

    # ---- Agent loop limits ----
    agent_max_tool_iterations: int = Field(default=8)

    @property
    def is_production(self) -> bool:
        return self.environment == "production"

    @property
    def cors_origins(self) -> list[str]:
        origins: list[str] = [
            self.next_public_frontend_url,
            "http://localhost:3000",
            "https://atlasagents.onrender.com",
        ]
        if self.frontend_origins:
            origins.extend(
                o.strip() for o in self.frontend_origins.split(",") if o.strip()
            )
        # Dedupe while preserving order.
        return list(dict.fromkeys(o for o in origins if o))


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
