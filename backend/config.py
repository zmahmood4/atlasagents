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
    # Haiku 4.5 is ~4x cheaper than Sonnet 4.6.
    # Override via ANTHROPIC_MODEL env var if you want to step up to Sonnet.
    anthropic_model: str = Field(default="claude-haiku-4-5-20251001")
    anthropic_max_tokens: int = Field(default=4096)

    # Per-million token pricing (USD).
    # Haiku 4.5: $0.80 input / $4.00 output
    # Sonnet 4.6: $3.00 input / $15.00 output  (set via env vars to override)
    price_input_per_mtok: float = Field(default=0.80)
    price_output_per_mtok: float = Field(default=4.00)

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

    # ---- Locale ----
    # UK timezone — agent cron jobs and cost resets fire at midnight London time.
    timezone: str = Field(default="Europe/London")
    currency: str = Field(default="GBP")
    currency_symbol: str = Field(default="£")

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
