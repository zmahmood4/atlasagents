"""13-agent roster per Part 2 of the spec."""

from agents.base import AgentDefinition, run, set_anthropic_override

from agents.ceo import AGENT as CEO
from agents.vp_product import AGENT as VP_PRODUCT
from agents.vp_engineering import AGENT as VP_ENGINEERING
from agents.vp_gtm import AGENT as VP_GTM
from agents.product_manager import AGENT as PRODUCT_MANAGER
from agents.developer_frontend import AGENT as DEVELOPER_FRONTEND
from agents.developer_backend import AGENT as DEVELOPER_BACKEND
from agents.marketing import AGENT as MARKETING
from agents.sales import AGENT as SALES
from agents.support import AGENT as SUPPORT
from agents.finance import AGENT as FINANCE
from agents.research import AGENT as RESEARCH
from agents.analytics import AGENT as ANALYTICS

ALL_AGENTS: list[AgentDefinition] = [
    CEO,
    VP_PRODUCT,
    VP_ENGINEERING,
    VP_GTM,
    PRODUCT_MANAGER,
    DEVELOPER_FRONTEND,
    DEVELOPER_BACKEND,
    MARKETING,
    SALES,
    SUPPORT,
    FINANCE,
    RESEARCH,
    ANALYTICS,
]

AGENTS_BY_NAME: dict[str, AgentDefinition] = {a.name: a for a in ALL_AGENTS}


__all__ = [
    "AgentDefinition",
    "run",
    "set_anthropic_override",
    "ALL_AGENTS",
    "AGENTS_BY_NAME",
    "CEO",
    "VP_PRODUCT",
    "VP_ENGINEERING",
    "VP_GTM",
    "PRODUCT_MANAGER",
    "DEVELOPER_FRONTEND",
    "DEVELOPER_BACKEND",
    "MARKETING",
    "SALES",
    "SUPPORT",
    "FINANCE",
    "RESEARCH",
    "ANALYTICS",
]
