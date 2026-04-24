"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ChevronRight, Zap, Target, Flag, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";
import { cn, formatRelative } from "@/lib/utils";

interface SprintBrief {
  active: boolean;
  experiment_title: string;
  hypothesis: string;
  success_metric: string;
  day: number;
  days_remaining: number;
  current_phase: number;
  phase_name: string;
  phase_description: string;
  phase_leads: string[];
  start_date: string;
  recent_artifacts?: { agent_name: string; artifact_type: string; title: string; created_at: string }[];
  open_tasks?: { from_agent: string; to_agent: string; task_type: string; status: string }[];
}

const PHASE_COLOURS = [
  "var(--accent-purple)",
  "var(--accent-blue)",
  "var(--accent-cyan)",
  "var(--accent-amber)",
  "var(--accent-emerald)",
];

export function SprintProgress() {
  const [data, setData] = useState<{ active: boolean; brief?: SprintBrief; recent_artifacts?: any[]; open_tasks?: any[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/api/sprint/status`,
        {
          headers: {
            "X-API-Key":
              (typeof window !== "undefined" && window.localStorage.getItem("dashboard_api_key")) || "",
          },
          cache: "no-store",
        },
      );
      if (res.ok) setData(await res.json());
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 15_000);
    return () => clearInterval(id);
  }, [refresh]);

  if (loading) return null;
  if (!data?.active) {
    return (
      <div className="surface mb-4 flex items-center justify-between rounded-xl p-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-tertiary)]">Sprint</div>
          <div className="mt-0.5 text-sm font-semibold text-[var(--text-primary)]">
            No active sprint
          </div>
          <div className="text-xs text-[var(--text-tertiary)]">Start a sprint from the Experiments page to give the team a direction.</div>
        </div>
        <Button variant="primary" onClick={() => router.push("/experiments")}>
          Start Sprint →
        </Button>
      </div>
    );
  }

  const brief = data.brief!;
  const artifacts = data.recent_artifacts ?? [];
  const tasks = data.open_tasks ?? [];
  const phaseColour = PHASE_COLOURS[(brief.current_phase ?? 1) - 1] ?? PHASE_COLOURS[0];
  const progress = Math.round((brief.day / 14) * 100);

  return (
    <div className="surface mb-4 overflow-hidden rounded-xl">
      {/* Phase progress bar */}
      <div className="h-1 w-full bg-[var(--bg-elevated)]">
        <motion.div
          className="h-1 rounded-r"
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.8 }}
          style={{ background: phaseColour, boxShadow: `0 0 8px ${phaseColour}` }}
        />
      </div>

      <div className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[9px] uppercase tracking-[0.2em] text-[var(--text-tertiary)]">
                Active Sprint · Day {brief.day}/14
              </span>
              <Badge tone="blue">{brief.phase_name}</Badge>
              <span
                className="data-mono text-[10px]"
                style={{ color: brief.days_remaining <= 3 ? "var(--accent-red)" : "var(--text-tertiary)" }}
              >
                {brief.days_remaining}d remaining
              </span>
            </div>
            <div className="mt-1 font-display text-base font-bold text-[var(--text-primary)] sm:text-lg">
              {brief.experiment_title}
            </div>
            <div className="mt-0.5 flex items-center gap-2 text-[11px] text-[var(--text-secondary)]">
              <Target className="h-3 w-3 shrink-0 text-[var(--accent-emerald)]" />
              <span>{brief.success_metric}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => router.push("/experiments")}>
              Details
            </Button>
          </div>
        </div>

        {/* Phase description */}
        <div className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--bg-base)] px-3 py-2 text-xs text-[var(--text-secondary)]">
          <span className="mr-2 font-mono" style={{ color: phaseColour }}>Phase {brief.current_phase}:</span>
          {brief.phase_description}
        </div>

        {/* Phase leads */}
        {brief.phase_leads?.length > 0 ? (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="text-[9px] uppercase tracking-wide text-[var(--text-tertiary)]">Leads:</span>
            {brief.phase_leads.map((l) => (
              <span key={l} className="data-mono rounded border border-[var(--border)] bg-[var(--bg-elevated)] px-2 py-0.5 text-[10px] text-[var(--text-secondary)]">
                {l}
              </span>
            ))}
          </div>
        ) : null}

        {/* Recent artifacts */}
        {artifacts.length > 0 ? (
          <div className="mt-3">
            <div className="mb-1 text-[9px] uppercase tracking-wide text-[var(--text-tertiary)]">
              Recent deliverables
            </div>
            <div className="flex flex-wrap gap-2">
              {artifacts.slice(0, 4).map((a: any, i: number) => (
                <span key={i} className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] bg-[var(--bg-base)] px-2 py-1 text-[10px]">
                  <Flag className="h-2.5 w-2.5 text-[var(--accent-blue)]" />
                  <span className="text-[var(--text-secondary)]">{a.agent_name}</span>
                  <span className="text-[var(--text-tertiary)]">·</span>
                  <span className="max-w-[120px] truncate text-[var(--text-primary)]">{a.title}</span>
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {/* Open tasks */}
        {tasks.length > 0 ? (
          <div className="mt-2 text-[10px] text-[var(--text-tertiary)]">
            <Zap className="mr-1 inline h-3 w-3 text-[var(--accent-amber)]" />
            {tasks.length} task{tasks.length === 1 ? "" : "s"} in flight — {tasks.slice(0, 3).map((t: any) => `${t.to_agent}`).join(", ")}
            {tasks.length > 3 ? ` +${tasks.length - 3} more` : ""}
          </div>
        ) : null}
      </div>
    </div>
  );
}
