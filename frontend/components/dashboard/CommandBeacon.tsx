"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Crown, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { AgentAvatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import type { Agent } from "@/lib/types";
import { DEPARTMENT_COLOR, DEPARTMENT_LABEL, cn, formatUsd } from "@/lib/utils";

const DEPT_ORDER = ["command", "product", "engineering", "gtm", "ops"] as const;

function useCountdown(lastRunAt: string | null, scheduleSeconds: number): number {
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
  return rem;
}

export function CommandBeacon({ agents }: { agents: Agent[] }) {
  const ceo = agents.find((a) => a.name === "ceo");
  if (!ceo) return null;

  const active = ceo.status === "active";
  const remaining = useCountdown(ceo.last_run_at, ceo.schedule_seconds);
  const pctThrough = 1 - remaining / ceo.schedule_seconds;
  const m = Math.floor(remaining / 60);
  const s = remaining % 60;
  const countdownStr = remaining === 0 ? "DUE NOW" : `${m}:${s.toString().padStart(2, "0")}`;

  return (
    <div className="mb-4 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] overflow-hidden">
      {/* top accent bar — fills as next tick approaches */}
      <div className="h-0.5 w-full bg-[var(--bg-elevated)]">
        <motion.div
          className="h-0.5 bg-[var(--dept-command)]"
          animate={{ width: `${pctThrough * 100}%` }}
          transition={{ duration: 1, ease: "linear" }}
        />
      </div>

      <div className="p-4">
        {/* CEO row */}
        <div className="flex items-start gap-4">
          <div className="relative shrink-0">
            <div
              className={cn(
                "flex h-14 w-14 items-center justify-center rounded-xl text-white",
                active ? "halo-active" : "",
              )}
              style={{
                background: `linear-gradient(135deg, ${DEPARTMENT_COLOR.command}, #4c1d95)`,
                boxShadow: `0 0 32px -8px ${DEPARTMENT_COLOR.command}`,
                ["--halo-color" as string]: DEPARTMENT_COLOR.command,
              } as React.CSSProperties}
            >
              <Crown className="h-6 w-6" />
            </div>
            {active ? (
              <span
                className="status-dot-pulse absolute -right-1 -top-1 h-3.5 w-3.5 rounded-full border-2 border-[var(--bg-surface)] bg-[var(--accent-emerald)]"
                style={{ color: "var(--accent-emerald)" }}
              />
            ) : null}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-base font-bold text-[var(--text-primary)]">CEO</span>
              <span className="text-xs text-[var(--text-tertiary)]">Chief Executive · ATLAS</span>
              {active ? (
                <Badge tone="emerald">ACTIVE</Badge>
              ) : (
                <span className="data-mono inline-flex items-center gap-1 rounded-md border border-[var(--border)] bg-[var(--bg-base)] px-2 py-0.5 text-[10px] text-[var(--text-secondary)]">
                  <Zap className="h-2.5 w-2.5" />
                  next tick in {countdownStr}
                </span>
              )}
              <span className="ml-auto data-mono text-[10px] text-[var(--text-tertiary)]">
                {formatUsd(ceo.cost_usd_today)} today
              </span>
            </div>
            <AnimatePresence mode="wait">
              <motion.div
                key={ceo.current_task || "idle"}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="mt-1 font-mono text-sm text-[var(--text-primary)]"
              >
                {active
                  ? <><span className="mr-2 text-[var(--accent-emerald)]">▶</span>{ceo.current_task || "thinking…"}</>
                  : <span className="text-[var(--text-secondary)]">Idle — strategy loop runs every {Math.floor(ceo.schedule_seconds / 60)} min</span>}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Department rows */}
        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {DEPT_ORDER.filter((d) => d !== "command").map((dept) => {
            const deptAgents = agents.filter((a) => a.department === dept);
            const deptActive = deptAgents.filter((a) => a.status === "active").length;
            const color = DEPARTMENT_COLOR[dept];
            return (
              <div
                key={dept}
                className="rounded-lg border border-[var(--border)] bg-[var(--bg-base)] p-2.5"
                style={deptActive > 0 ? { borderColor: `color-mix(in oklab, ${color} 40%, transparent)`, boxShadow: `0 0 16px -6px ${color}` } : undefined}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className={cn("h-2 w-2 rounded-full", deptActive > 0 ? "status-dot-pulse" : "")} style={{ background: color, color }} />
                    <span className="text-[9px] uppercase tracking-[0.15em]" style={{ color }}>{DEPARTMENT_LABEL[dept]}</span>
                  </div>
                  <span className="data-mono text-[9px] text-[var(--text-tertiary)]">
                    {deptActive}/{deptAgents.length}
                  </span>
                </div>
                <div className="mt-2 space-y-1">
                  {deptAgents.map((a) => (
                    <DeptAgentRow key={a.id} agent={a} color={color} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function DeptAgentRow({ agent, color }: { agent: Agent; color: string }) {
  const isActive = agent.status === "active";
  const isError = agent.status === "error";
  return (
    <div className="flex items-center gap-2 rounded-md px-1 py-0.5">
      <AgentAvatar name={agent.name} department={agent.department} size={18} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span
            className={cn("font-mono text-[10px] font-semibold truncate",
              isActive ? "text-[var(--text-primary)]" : isError ? "text-[var(--accent-red)]" : "text-[var(--text-secondary)]"
            )}
          >
            {agent.name}
          </span>
          {isActive && (
            <span
              className="inline-block h-1.5 w-1.5 shrink-0 rounded-full status-dot-pulse"
              style={{ background: color, color }}
            />
          )}
        </div>
        {isActive && agent.current_task ? (
          <div className="truncate font-mono text-[9px] text-[var(--text-tertiary)]">
            {agent.current_task}
          </div>
        ) : (
          <div className="font-mono text-[9px] text-[var(--text-tertiary)]">{agent.status}</div>
        )}
      </div>
    </div>
  );
}
