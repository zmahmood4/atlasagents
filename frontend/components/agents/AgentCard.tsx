"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { AgentAvatar } from "@/components/ui/Avatar";
import { StatusBadge } from "./StatusBadge";
import { DEPARTMENT_COLOR, cn, formatUsd, percent } from "@/lib/utils";
import type { Agent } from "@/lib/types";

function useNextTick(lastRunAt: string | null, scheduleSeconds: number): string {
  const [rem, setRem] = useState(scheduleSeconds);
  useEffect(() => {
    const tick = () => {
      if (!lastRunAt) { setRem(scheduleSeconds); return; }
      const elapsed = Math.floor((Date.now() - new Date(lastRunAt).getTime()) / 1000);
      setRem(Math.max(0, scheduleSeconds - elapsed));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [lastRunAt, scheduleSeconds]);
  if (rem <= 0) return "due";
  const h = Math.floor(rem / 3600);
  const m = Math.floor((rem % 3600) / 60);
  const s = rem % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function AgentCard({
  agent,
  onClick,
}: {
  agent: Agent;
  onClick?: () => void;
}) {
  const nextTick = useNextTick(agent.last_run_at, agent.schedule_seconds);
  const tokenPct = percent(agent.tokens_used_today, agent.daily_token_cap);
  const isActive = agent.status === "active";
  const isError = agent.status === "error";
  const color = DEPARTMENT_COLOR[agent.department];

  return (
    <motion.button
      layout
      whileHover={{ y: -2, scale: 1.005 }}
      transition={{ duration: 0.15 }}
      onClick={onClick}
      className={cn(
        "relative flex w-full flex-col gap-0 overflow-hidden rounded-lg border bg-[var(--bg-surface)] text-left transition-all",
        isActive ? "border-[var(--border-active)]" : "border-[var(--border)] hover:border-[var(--border-active)]",
        isError ? "border-[var(--accent-red)]/40" : "",
      )}
      style={
        isActive
          ? {
              ["--halo-color" as string]: color,
              boxShadow: `0 0 20px -8px ${color}`,
            } as React.CSSProperties
          : undefined
      }
    >
      {/* colour stripe at top */}
      <div
        className="h-0.5 w-full transition-all"
        style={{ background: isActive ? color : "var(--border)" }}
      />

      <div className="flex flex-col gap-3 p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <AgentAvatar name={agent.name} department={agent.department} size={28} />
            <div>
              <div className="font-mono text-sm font-semibold text-[var(--text-primary)]">
                {agent.name}
              </div>
              <div className="text-[10px] text-[var(--text-tertiary)] leading-none mt-0.5">
                {agent.role.split(" — ")[0]}
              </div>
            </div>
          </div>
          <StatusBadge status={agent.status} />
        </div>

        {/* Current task — shown when active */}
        {agent.current_task ? (
          <div className="rounded-md border border-[var(--border)] bg-[var(--bg-base)] px-2 py-1.5 font-mono text-[10px] leading-snug text-[var(--text-secondary)]">
            <span className="mr-1" style={{ color }}>▶</span>
            <span className="line-clamp-2">{agent.current_task}</span>
          </div>
        ) : null}

        {/* Token bar */}
        <div>
          <div className="mb-1 flex items-center justify-between text-[9px] font-mono text-[var(--text-tertiary)]">
            <span>tokens today</span>
            <span>
              {tokenPct.toFixed(0)}% of {(agent.daily_token_cap / 1000).toFixed(0)}k cap
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-elevated)]">
            <motion.div
              className="h-1.5 rounded-full transition-all"
              animate={{ width: `${Math.min(tokenPct, 100)}%` }}
              style={{
                background:
                  tokenPct >= 95 ? "var(--accent-red)" : tokenPct >= 80 ? "var(--accent-amber)" : color,
              }}
              transition={{ duration: 0.8 }}
            />
          </div>
        </div>

        {/* Footer row */}
        <div className="flex items-center justify-between text-[10px] font-mono text-[var(--text-tertiary)]">
          <span className={cn("flex items-center gap-1", isActive && "text-[var(--accent-emerald)]")}>
            {isActive ? (
              <>
                <span className="h-1.5 w-1.5 rounded-full status-dot-pulse" style={{ background: "var(--accent-emerald)", color: "var(--accent-emerald)" }} />
                running
              </>
            ) : (
              `next: ${nextTick}`
            )}
          </span>
          <span>{formatUsd(agent.cost_usd_today)}</span>
        </div>
      </div>
    </motion.button>
  );
}
