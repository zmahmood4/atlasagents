"use client";

import { motion } from "framer-motion";
import { AgentAvatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import type { Agent, Experiment } from "@/lib/types";

export function ExperimentCard({
  experiment,
  agents,
  onClick,
}: {
  experiment: Experiment;
  agents: Agent[];
  onClick?: () => void;
}) {
  const owner = agents.find((a) => a.name === experiment.owner_agent);
  const daysRunning =
    experiment.status === "active"
      ? Math.max(
          0,
          Math.floor((Date.now() - new Date(experiment.created_at).getTime()) / 86_400_000),
        )
      : null;

  return (
    <motion.button
      layout
      whileHover={{ y: -1 }}
      onClick={onClick}
      className="w-full rounded-md border border-[var(--border)] bg-[var(--bg-surface)] p-3 text-left transition hover:border-[var(--border-active)]"
    >
      <div className="text-sm font-semibold text-[var(--text-primary)]">{experiment.title}</div>
      <div className="mt-1 line-clamp-2 text-xs text-[var(--text-secondary)]">{experiment.hypothesis}</div>

      {experiment.effort_score || experiment.revenue_score ? (
        <div className="mt-3 space-y-1.5">
          <ScoreBar label="Effort" value={experiment.effort_score ?? 0} tone="red" />
          <ScoreBar label="Revenue" value={experiment.revenue_score ?? 0} tone="emerald" />
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
        {owner ? <AgentAvatar name={owner.name} department={owner.department} size={20} /> : null}
        <span className="font-mono text-[var(--text-tertiary)]">{experiment.owner_agent}</span>
        {daysRunning !== null ? (
          <Badge tone="blue">{daysRunning}d running</Badge>
        ) : null}
        {experiment.result === "winner" ? <Badge tone="emerald">WINNER</Badge> : null}
        {experiment.result === "killed" ? <Badge tone="red">KILLED</Badge> : null}
      </div>
    </motion.button>
  );
}

function ScoreBar({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "red" | "emerald";
}) {
  const bar = tone === "red" ? "bg-[var(--accent-red)]/80" : "bg-[var(--accent-emerald)]/80";
  return (
    <div>
      <div className="flex items-center justify-between text-[10px] font-mono text-[var(--text-tertiary)]">
        <span>{label}</span>
        <span>{value}/10</span>
      </div>
      <div className="h-1 w-full rounded bg-[var(--bg-elevated)]">
        <div className={`h-1 rounded ${bar}`} style={{ width: `${(value / 10) * 100}%` }} />
      </div>
    </div>
  );
}
