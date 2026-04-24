"use client";

import { motion } from "framer-motion";
import { Crown } from "lucide-react";
import type { Agent } from "@/lib/types";
import { DEPARTMENT_COLOR, formatRelative } from "@/lib/utils";

export function CommandBeacon({ agents }: { agents: Agent[] }) {
  const ceo = agents.find((a) => a.name === "ceo");
  const vps = agents.filter((a) => a.department !== "command" && (a.name.startsWith("vp_") || a.role.toLowerCase().startsWith("vp")));
  if (!ceo) return null;
  const active = ceo.status === "active";

  return (
    <div
      className="surface relative overflow-hidden rounded-xl p-4"
      style={active ? ({ ["--halo-color" as string]: DEPARTMENT_COLOR.command } as React.CSSProperties) : undefined}
    >
      {active ? (
        <motion.span
          layoutId="beacon-halo"
          className="halo-active absolute inset-0 rounded-xl"
          aria-hidden
        />
      ) : null}
      <div className="relative flex items-start gap-3">
        <div
          className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-lg text-white"
          style={{
            background: `linear-gradient(135deg, ${DEPARTMENT_COLOR.command}, #5b21b6)`,
            boxShadow: `0 0 24px -4px ${DEPARTMENT_COLOR.command}`,
          }}
        >
          <Crown className="h-5 w-5" />
          {active ? (
            <span
              className="status-dot-pulse absolute -right-1 -top-1 h-3 w-3 rounded-full bg-[var(--accent-emerald)]"
              style={{ color: "var(--accent-emerald)" }}
            />
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-tertiary)]">
              Command · ceo
            </span>
            <span className="data-mono text-[10px] text-[var(--text-tertiary)]">
              tick every {ceo.schedule_seconds}s · last {formatRelative(ceo.last_run_at)}
            </span>
          </div>
          <div className="mt-0.5 truncate text-base font-semibold text-[var(--text-primary)]">
            {active
              ? ceo.current_task || "thinking…"
              : "Awaiting next tick. Owner: kick off to cascade ideas down the team."}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {vps.map((v) => (
              <VpChip key={v.id} agent={v} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function VpChip({ agent }: { agent: Agent }) {
  const active = agent.status === "active";
  const color = DEPARTMENT_COLOR[agent.department];
  return (
    <span
      className="data-mono inline-flex items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--bg-base)] px-2 py-1 text-[10px]"
      style={{ boxShadow: active ? `0 0 12px -4px ${color}` : undefined }}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${active ? "status-dot-pulse" : ""}`}
        style={{ background: color, color }}
      />
      {agent.name}
      <span className="text-[var(--text-tertiary)]">·</span>
      <span className="text-[var(--text-secondary)]">
        {active ? (agent.current_task?.slice(0, 40) || "working") : agent.status}
      </span>
    </span>
  );
}
