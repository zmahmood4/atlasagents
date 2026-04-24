// Typed fetch wrapper for the backend (Part 9 surface).

import type {
  Agent,
  AgentAction,
  BusinessMetric,
  Experiment,
  KnowledgeEntry,
  MetricsSummary,
  PendingApproval,
  WorkArtifact,
} from "./types";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function apiKey(): string {
  const envKey = process.env.NEXT_PUBLIC_DASHBOARD_API_KEY;
  if (envKey) return envKey;
  if (typeof window !== "undefined") {
    return window.localStorage.getItem("dashboard_api_key") || "";
  }
  return "";
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  const key = apiKey();
  if (key) headers.set("X-API-Key", key);

  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });
  if (!res.ok) {
    let detail = "";
    try {
      detail = (await res.json())?.detail ?? "";
    } catch {}
    throw new Error(`API ${res.status}: ${detail || res.statusText}`);
  }
  return (await res.json()) as T;
}

export const api = {
  // ---- health ----
  health: () => request<{ status: string; agents_running: number }>("/api/health"),

  // ---- agents ----
  listAgents: () => request<{ agents: Agent[] }>("/api/agents"),
  getAgent: (id: string) =>
    request<{ agent: Agent; recent_actions: AgentAction[] }>(`/api/agents/${id}`),
  updateAgent: (id: string, patch: Partial<Agent>) =>
    request<Agent>(`/api/agents/${id}`, {
      method: "PUT",
      body: JSON.stringify(patch),
    }),
  triggerAgent: (id: string) =>
    request<{ ok: boolean; agent: string; queued: boolean }>(`/api/agents/${id}/trigger`, {
      method: "POST",
    }),

  // ---- feed ----
  listActions: (q: {
    agent?: string;
    type?: string;
    importance?: string;
    limit?: number;
    offset?: number;
  } = {}) => {
    const p = new URLSearchParams();
    if (q.agent) p.set("agent", q.agent);
    if (q.type) p.set("type", q.type);
    if (q.importance) p.set("importance", q.importance);
    p.set("limit", String(q.limit ?? 50));
    p.set("offset", String(q.offset ?? 0));
    return request<{
      actions: AgentAction[];
      total: number;
      limit: number;
      offset: number;
    }>(`/api/actions?${p.toString()}`);
  },
  streamUrl: () => {
    const key = apiKey();
    return `${BASE_URL}/api/actions/stream${key ? `?api_key=${encodeURIComponent(key)}` : ""}`;
  },

  // ---- approvals ----
  listApprovals: (status?: string) =>
    request<{ approvals: PendingApproval[] }>(
      status ? `/api/approvals?status=${status}` : "/api/approvals",
    ),
  approve: (id: string) =>
    request<PendingApproval>(`/api/approvals/${id}/approve`, { method: "POST" }),
  reject: (id: string) =>
    request<PendingApproval>(`/api/approvals/${id}/reject`, { method: "POST" }),
  redirect: (id: string, note: string) =>
    request<PendingApproval>(`/api/approvals/${id}/redirect`, {
      method: "POST",
      body: JSON.stringify({ note }),
    }),

  // ---- experiments ----
  listExperiments: (status?: string) =>
    request<{ experiments: Experiment[] }>(
      status ? `/api/experiments?status=${status}` : "/api/experiments",
    ),
  createExperiment: (body: {
    title: string;
    hypothesis: string;
    success_metric: string;
    owner_agent?: string;
  }) =>
    request<Experiment>("/api/experiments", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateExperiment: (id: string, patch: Partial<Experiment>) =>
    request<Experiment>(`/api/experiments/${id}`, {
      method: "PUT",
      body: JSON.stringify(patch),
    }),

  // ---- artifacts ----
  listArtifacts: (q: { agent?: string; type?: string; limit?: number; offset?: number } = {}) => {
    const p = new URLSearchParams();
    if (q.agent) p.set("agent", q.agent);
    if (q.type) p.set("type", q.type);
    p.set("limit", String(q.limit ?? 50));
    p.set("offset", String(q.offset ?? 0));
    return request<{
      artifacts: WorkArtifact[];
      total: number;
      limit: number;
      offset: number;
    }>(`/api/artifacts?${p.toString()}`);
  },
  getArtifact: (id: string) => request<WorkArtifact>(`/api/artifacts/${id}`),

  // ---- metrics ----
  listMetrics: (q: { metric?: string; days?: number } = {}) => {
    const p = new URLSearchParams();
    if (q.metric) p.set("metric", q.metric);
    if (q.days) p.set("days", String(q.days));
    return request<{ metrics: BusinessMetric[] }>(`/api/metrics?${p.toString()}`);
  },
  metricsSummary: () => request<MetricsSummary>("/api/metrics/summary"),

  // ---- knowledge ----
  listKnowledge: (q: { category?: string; q?: string } = {}) => {
    const p = new URLSearchParams();
    if (q.category) p.set("category", q.category);
    if (q.q) p.set("q", q.q);
    return request<{ entries: KnowledgeEntry[] }>(`/api/knowledge?${p.toString()}`);
  },
  createKnowledge: (body: {
    category: string;
    title: string;
    content: string;
    tags?: string[];
    written_by?: string;
  }) =>
    request<KnowledgeEntry>("/api/knowledge", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateKnowledge: (id: string, patch: Partial<KnowledgeEntry>) =>
    request<KnowledgeEntry>(`/api/knowledge/${id}`, {
      method: "PUT",
      body: JSON.stringify(patch),
    }),

  // ---- settings ----
  getSettings: () =>
    request<{ agents: Agent[]; business: Record<string, string> }>("/api/settings"),
  updateGlobalSettings: (patch: {
    company_name?: string;
    company_description?: string;
    icp?: string;
    current_product_focus?: string;
    revenue_model?: string;
  }) =>
    request<{ ok: boolean }>("/api/settings/global", {
      method: "PUT",
      body: JSON.stringify(patch),
    }),
  pauseAll: () => request<{ ok: boolean }>("/api/settings/pause-all", { method: "POST" }),
  resumeAll: () => request<{ ok: boolean }>("/api/settings/resume-all", { method: "POST" }),
  resetCaps: () => request<{ ok: boolean }>("/api/settings/reset-caps", { method: "POST" }),
  kickoff: () =>
    request<{ ok: boolean; queued: string[]; message: string }>("/api/settings/kickoff", {
      method: "POST",
    }),
};
