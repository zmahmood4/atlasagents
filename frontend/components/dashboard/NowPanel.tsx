"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Activity, AlertTriangle, Clock } from "lucide-react";
import { useEffect, useState } from "react";
import { AgentAvatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { cn, formatRelative, percent } from "@/lib/utils";
import type { Agent } from "@/lib/types";

function useElapsed(since: string | null): string {
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    if (!since) return;
    const start = new Date(since).getTime();
    const tick = () => setSecs(Math.max(0, Math.floor((Date.now() - start) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [since]);
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function useCountdown(lastRunAt: string | null, scheduleSeconds: number): string {
  const [rem, setRem] = useState(0);
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
  if (rem <= 0) return "due now";
  const m = Math.floor(rem / 60);
  const s = rem % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export function NowPanel({ agents }: { agents: Agent[] }) {
  const active = agents.filter((a) => a.status === "active");
  const errored = agents.filter((a) => a.status === "error");
  const waiting = agents.filter((a) => a.status === "waiting");
  const totalIdle = agents.filter((a) => a.status === "idle").length;

  return (
    <div className="surface relative flex flex-col overflow-hidden rounded-xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "relative inline-flex h-6 w-6 items-center justify-center rounded-md",
              active.length > 0
                ? "bg-[var(--accent-emerald)]/15 text-[var(--accent-emerald)]"
                : "bg-[var(--bg-elevated)] text-[var(--text-tertiary)]",
            )}
          >
            <Activity className="h-3.5 w-3.5" />
            {active.length > 0 ? (
              <span className="status-dot-pulse absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-[var(--accent-emerald)]" />
            ) : null}
          </span>
          <div>
            <div className="text-[9px] uppercase tracking-[0.2em] text-[var(--text-tertiary)]">
              Live agent activity
            </div>
            <div className="text-sm font-semibold text-[var(--text-primary)]">
              {active.length > 0
                ? `${active.length} agent${active.length > 1 ? "s" : ""} running`
                : "All agents idle"}
            </div>
          </div>
        </div>
        <div className="flex gap-2 text-[10px]">
          {waiting.length > 0 && (
            <Badge tone="amber">{waiting.length} waiting</Badge>
          )}
          {errored.length > 0 && (
            <Badge tone="red">{errored.length} error</Badge>
          )}
          <span className="data-mono text-[var(--text-tertiary)]">
            {totalIdle} idle
          </span>
        </div>
      </div>

      {/* Active agents */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence initial={false}>
          {active.length === 0 && errored.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-4 text-center text-xs text-[var(--text-tertiary)]"
            >
              Waiting for next scheduled tick.
            </motion.div>
          ) : (
            <>
              {active.map((a) => (
                <ActiveRow key={a.id} agent={a} />
              ))}
              {errored.map((a) => (
                <ErrorRow key={a.id} agent={a} />
              ))}
            </>
          )}
        </AnimatePresence>
      </div>

      {/* Footer — next-to-tick preview */}
      <IdleQueue agents={agents.filter((a) => a.status === "idle")} />
    </div>
  );
}

function ActiveRow({ agent }: { agent: Agent }) {
  const elapsed = useElapsed(agent.last_run_at);
  const tokenPct = percent(agent.tokens_used_today, agent.daily_token_cap);
  return (
    <motion.div
      layout
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.18 }}
      className="border-b border-[var(--border)] px-4 py-3"
    >
      <div className="flex items-start gap-3">
        <AgentAvatar name={agent.name} department={agent.department} size={30} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-semibold text-[var(--text-primary)]">
              {agent.name}
            </span>
            <Badge tone="emerald">RUNNING</Badge>
            <span className="ml-auto data-mono text-[10px] text-[var(--accent-emerald)]">
              {elapsed}
            </span>
          </div>
          <div className="mt-1 rounded-md border border-[var(--border)] bg-[var(--bg-base)] px-2 py-1.5 font-mono text-[10px] leading-snug text-[var(--text-secondary)]">
            <span className="mr-1.5 text-[var(--accent-emerald)]">▶</span>
            {agent.current_task || "processing…"}
          </div>
          {/* Token burn bar */}
          <div className="mt-1.5 flex items-center gap-2">
            <div className="h-1 flex-1 overflow-hidden rounded bg-[var(--bg-elevated)]">
              <motion.div
                className="h-1 rounded bg-[var(--accent-blue)]"
                animate={{ width: `${tokenPct}%` }}
                transition={{ duration: 0.8 }}
              />
            </div>
            <span className="data-mono text-[9px] text-[var(--text-tertiary)]">
              {tokenPct.toFixed(0)}% daily cap
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function ErrorRow({ agent }: { agent: Agent }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="border-b border-[var(--accent-red)]/20 bg-[color:color-mix(in_oklab,var(--accent-red)_4%,transparent)] px-4 py-3"
    >
      <div className="flex items-center gap-3">
        <AlertTriangle className="h-4 w-4 shrink-0 text-[var(--accent-red)]" />
        <div>
          <span className="font-mono text-xs font-semibold text-[var(--accent-red)]">{agent.name}</span>
          <div className="text-[10px] text-[var(--text-secondary)]">error — check Render logs</div>
        </div>
      </div>
    </motion.div>
  );
}

function IdleQueue({ agents }: { agents: Agent[] }) {
  // Show the 3 agents next-to-run based on countdown
  const sorted = agents
    .filter((a) => a.enabled && a.last_run_at)
    .map((a) => ({
      agent: a,
      remaining: Math.max(
        0,
        a.schedule_seconds - Math.floor((Date.now() - new Date(a.last_run_at!).getTime()) / 1000),
      ),
    }))
    .sort((x, y) => x.remaining - y.remaining)
    .slice(0, 3);

  if (sorted.length === 0) return null;

  return (
    <div className="border-t border-[var(--border)] bg-[var(--bg-base)] px-4 py-2">
      <div className="mb-1 text-[9px] uppercase tracking-[0.2em] text-[var(--text-tertiary)]">
        Next to run
      </div>
      <div className="space-y-1">
        {sorted.map(({ agent }) => (
          <IdleRow key={agent.id} agent={agent} />
        ))}
      </div>
    </div>
  );
}

function IdleRow({ agent }: { agent: Agent }) {
  const countdown = useCountdown(agent.last_run_at, agent.schedule_seconds);
  return (
    <div className="flex items-center gap-2">
      <AgentAvatar name={agent.name} department={agent.department} size={16} />
      <span className="font-mono text-[10px] text-[var(--text-secondary)]">{agent.name}</span>
      <span className="ml-auto flex items-center gap-1 data-mono text-[10px] text-[var(--text-tertiary)]">
        <Clock className="h-2.5 w-2.5" />
        {countdown}
      </span>
    </div>
  );
}
