// Shared TypeScript types — mirrors the Supabase schema (Part 3).

export type AgentStatus = "active" | "idle" | "waiting" | "error" | "paused";
export type Department = "command" | "product" | "engineering" | "gtm" | "ops";

export interface Agent {
  id: string;
  name: string;
  role: string;
  department: Department;
  status: AgentStatus;
  current_task: string | null;
  system_prompt: string;
  schedule_seconds: number;
  daily_token_cap: number;
  monthly_token_cap: number;
  tokens_used_today: number;
  tokens_used_month: number;
  cost_usd_today: number;
  cost_usd_month: number;
  last_run_at: string | null;
  enabled: boolean;
  created_at: string;
}

export interface AgentRun {
  id: string;
  agent_id: string | null;
  agent_name: string;
  started_at: string;
  completed_at: string | null;
  status: string | null;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
  summary: string | null;
  error: string | null;
}

export type ActionType = "decision" | "tool" | "artifact" | "escalation" | "task" | "run_start" | "run_end" | "skip" | "error";
export type Importance = "low" | "normal" | "high" | "critical";

export interface AgentAction {
  id: string;
  agent_id: string | null;
  agent_name: string;
  run_id: string | null;
  action_type: ActionType | string;
  tool_name: string | null;
  tool_input: unknown;
  tool_output: unknown;
  summary: string;
  importance: Importance;
  created_at: string;
}

export type TaskStatus = "pending" | "claimed" | "completed" | "cancelled";

export interface TaskBusRow {
  id: string;
  from_agent: string;
  to_agent: string;
  task_type: string;
  payload: Record<string, unknown>;
  priority: number;
  status: TaskStatus;
  result: Record<string, unknown> | null;
  created_at: string;
  claimed_at: string | null;
  completed_at: string | null;
}

export interface SharedMemoryRow {
  id: string;
  key: string;
  value: Record<string, unknown>;
  category: string;
  written_by: string;
  summary: string | null;
  updated_at: string;
  created_at: string;
}

export type ExperimentStatus = "proposed" | "active" | "measuring" | "closed";

export interface Experiment {
  id: string;
  title: string;
  hypothesis: string;
  success_metric: string;
  owner_agent: string;
  status: ExperimentStatus;
  effort_score: number | null;
  revenue_score: number | null;
  result: string | null;
  learnings: string | null;
  created_at: string;
  updated_at: string;
}

export type ApprovalActionType = "PUBLISH" | "EMAIL" | "DEPLOY" | "SPEND" | "PIVOT" | "OTHER";
export type ApprovalStatus = "pending" | "approved" | "rejected" | "redirected";
export type Urgency = "low" | "normal" | "high" | "critical" | "urgent";

export interface PendingApproval {
  id: string;
  agent_id: string | null;
  agent_name: string;
  action_type: ApprovalActionType;
  title: string;
  description: string;
  reasoning: string;
  payload: Record<string, unknown> | null;
  urgency: Urgency;
  status: ApprovalStatus;
  owner_note: string | null;
  created_at: string;
  resolved_at: string | null;
}

export interface BusinessMetric {
  id: string;
  metric_name: string;
  metric_value: number;
  metric_unit: string | null;
  period_date: string;
  written_by: string;
  created_at: string;
}

export type KnowledgeCategory =
  | "company"
  | "product"
  | "customers"
  | "competitors"
  | "market"
  | "decisions"
  | "other";

export interface KnowledgeEntry {
  id: string;
  category: KnowledgeCategory;
  title: string;
  content: string;
  written_by: string;
  tags: string[] | null;
  updated_at: string;
  created_at: string;
}

export type ArtifactType =
  | "prd"
  | "spec"
  | "code"
  | "report"
  | "content"
  | "research"
  | "analysis"
  | "design"
  | "plan"
  | "note";

export interface WorkArtifact {
  id: string;
  agent_name: string;
  artifact_type: ArtifactType | string;
  title: string;
  content: string;
  metadata: Record<string, unknown>;
  experiment_id: string | null;
  created_at: string;
}

export interface MetricsSummary {
  totals: {
    tokens_today: number;
    tokens_month: number;
    cost_today: number;
    cost_month: number;
    agents_active: number;
    agents_total: number;
  };
  agents: Agent[];
  runs_today: {
    agent_name: string;
    input_tokens: number;
    output_tokens: number;
    cost_usd: number;
    started_at: string;
  }[];
}
