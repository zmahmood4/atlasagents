"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Activity } from "lucide-react";
import { AgentAvatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { cn, formatRelative } from "@/lib/utils";
import type { Agent } from "@/lib/types";

export function NowPanel({ agents }: { agents: Agent[] }) {
  const active = agents.filter((a) => a.status === "active");
  const waiting = agents.filter((a) => a.status === "waiting");
  const errored = agents.filter((a) => a.status === "error");

  return (
    <div className="surface relative overflow-hidden rounded-xl p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="relative inline-flex h-6 w-6 items-center justify-center rounded-md bg-[var(--accent-emerald)]/15 text-[var(--accent-emerald)]">
            <Activity className="h-3.5 w-3.5" />
            <span className="status-dot-pulse absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-[var(--accent-emerald)]" />
          </span>
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-tertiary)]">
              Now working
            </div>
            <div className="text-sm font-semibold text-[var(--text-primary)]">
              {active.length} active · {waiting.length} awaiting · {errored.length} errored
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {active.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="rounded-md border border-dashed border-[var(--border)] bg-[var(--bg-base)] p-4 text-center text-xs text-[var(--text-tertiary)]"
          >
            All agents idle — kick off or wait for the next scheduled tick.
          </motion.div>
        ) : (
          <motion.ul layout className="space-y-2">
            {active.map((a) => (
              <ActiveRow key={a.id} agent={a} />
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

function ActiveRow({ agent }: { agent: Agent }) {
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className={cn(
        "flex items-center gap-3 rounded-md border border-[var(--border)] bg-[var(--bg-base)] p-2.5",
      )}
    >
      <AgentAvatar name={agent.name} department={agent.department} size={28} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-semibold text-[var(--text-primary)]">
            {agent.name}
          </span>
          <Badge tone="emerald">ACTIVE</Badge>
          <span className="ml-auto data-mono text-[10px] text-[var(--text-tertiary)]">
            started {formatRelative(agent.last_run_at)}
          </span>
        </div>
        <div className="mt-0.5 flex items-center gap-2 font-mono text-[11px] text-[var(--text-secondary)]">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--accent-emerald)] status-dot-pulse" />
          <span className="truncate">{agent.current_task || "thinking"}</span>
        </div>
      </div>
    </motion.li>
  );
}
