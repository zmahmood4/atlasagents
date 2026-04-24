"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { cn, formatInt, formatUsd } from "@/lib/utils";
import type { Agent, MetricsSummary } from "@/lib/types";

interface Stat {
  label: string;
  value: string;
  sub?: string;
  pulse?: boolean;
  colour?: string;
}

export function StatsStrip({
  agents,
  summary,
}: {
  agents: Agent[];
  summary: MetricsSummary | null;
}) {
  const [artifactCount, setArtifactCount] = useState<number | null>(null);
  const [experimentCount, setExperimentCount] = useState<number | null>(null);

  useEffect(() => {
    api.listArtifacts({ limit: 1 }).then((r) => setArtifactCount(r.total ?? 0)).catch(() => {});
    api.listExperiments().then((r) =>
      setExperimentCount(r.experiments.filter((e) => e.status === "active" || e.status === "measuring").length)
    ).catch(() => {});
  }, []);

  const activeNow = agents.filter((a) => a.status === "active").length;
  const errored = agents.filter((a) => a.status === "error").length;

  const stats: Stat[] = [
    {
      label: "Agents",
      value: `${agents.length}`,
      sub: `${activeNow} active`,
      pulse: activeNow > 0,
      colour: activeNow > 0 ? "var(--accent-emerald)" : "var(--text-tertiary)",
    },
    {
      label: "Tokens today",
      value: formatInt(summary?.totals.tokens_today ?? 0),
      sub: `${formatInt(summary?.totals.tokens_month ?? 0)} this month`,
    },
    {
      label: "Spend today",
      value: formatUsd(summary?.totals.cost_today ?? 0),
      sub: `${formatUsd(summary?.totals.cost_month ?? 0)} this month`,
      colour: "var(--accent-amber)",
    },
    {
      label: "Artifacts",
      value: artifactCount !== null ? formatInt(artifactCount) : "—",
      sub: "work produced",
      colour: "var(--accent-blue)",
    },
    {
      label: "Experiments",
      value: experimentCount !== null ? formatInt(experimentCount) : "—",
      sub: "active / measuring",
      colour: "var(--accent-purple)",
    },
    ...(errored > 0
      ? [{ label: "Errors", value: `${errored}`, sub: "agents in error", colour: "var(--accent-red)" }]
      : []),
  ];

  return (
    <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
      {stats.map((s, i) => (
        <motion.div
          key={s.label}
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: i * 0.04 }}
          className="surface rounded-lg px-3 py-2.5"
        >
          <div className="flex items-center justify-between">
            <div className="text-[9px] uppercase tracking-[0.2em] text-[var(--text-tertiary)]">
              {s.label}
            </div>
            {s.pulse ? (
              <span
                className="h-1.5 w-1.5 rounded-full status-dot-pulse"
                style={{ background: s.colour, color: s.colour }}
              />
            ) : null}
          </div>
          <div
            className={cn("data-mono mt-0.5 text-lg font-semibold leading-none", "text-[var(--text-primary)]")}
            style={s.colour ? { color: s.colour } : undefined}
          >
            {s.value}
          </div>
          {s.sub ? (
            <div className="mt-0.5 text-[10px] text-[var(--text-tertiary)]">{s.sub}</div>
          ) : null}
        </motion.div>
      ))}
    </div>
  );
}
