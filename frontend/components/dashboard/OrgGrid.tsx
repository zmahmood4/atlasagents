"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AgentAvatar } from "@/components/ui/Avatar";
import { DEPARTMENT_COLOR, DEPARTMENT_LABEL, cn, formatRelative } from "@/lib/utils";
import type { Agent, Department } from "@/lib/types";

const ORDER: Department[] = ["command", "product", "engineering", "gtm", "ops"];

export function OrgGrid({
  agents,
  onSelect,
}: {
  agents: Agent[];
  onSelect?: (a: Agent) => void;
}) {
  return (
    <div className="surface rounded-xl p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-tertiary)]">
            Organisation
          </div>
          <div className="text-sm font-semibold text-[var(--text-primary)]">
            Live agent roster
          </div>
        </div>
        <div className="data-mono flex items-center gap-3 text-[11px] text-[var(--text-tertiary)]">
          {ORDER.map((d) => (
            <span key={d} className="inline-flex items-center gap-1.5">
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: DEPARTMENT_COLOR[d] }}
              />
              {DEPARTMENT_LABEL[d]}
            </span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {ORDER.flatMap((dep) =>
          agents
            .filter((a) => a.department === dep)
            .map((a) => <OrgTile key={a.id} agent={a} onClick={() => onSelect?.(a)} />),
        )}
      </div>
    </div>
  );
}

function OrgTile({ agent, onClick }: { agent: Agent; onClick?: () => void }) {
  const active = agent.status === "active";
  const error = agent.status === "error";
  const capped = agent.status === "paused";
  const color = DEPARTMENT_COLOR[agent.department];

  return (
    <motion.button
      layout
      whileHover={{ y: -1 }}
      onClick={onClick}
      className={cn(
        "relative flex h-full flex-col items-start gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] p-3 text-left transition",
        active && "halo-active",
        !active && "hover:border-[var(--border-active)]",
      )}
      style={active ? ({ ["--halo-color" as any]: color } as React.CSSProperties) : undefined}
    >
      {!active && !error && !capped ? (
        <div className="radar absolute inset-0 rounded-lg" aria-hidden />
      ) : null}
      <div className="relative flex w-full items-center gap-2">
        <AgentAvatar name={agent.name} department={agent.department} size={24} />
        <div className="min-w-0">
          <div className="truncate font-mono text-[11px] font-semibold text-[var(--text-primary)]">
            {agent.name}
          </div>
          <div className="truncate text-[10px] text-[var(--text-tertiary)]">{agent.role}</div>
        </div>
        <StatusDot status={agent.status} />
      </div>
      <AnimatePresence>
        {active && agent.current_task ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="relative w-full overflow-hidden rounded-md border border-[var(--border)] bg-[var(--bg-base)] px-2 py-1.5 font-mono text-[10px] leading-snug text-[var(--text-secondary)]"
          >
            <span className="mr-1 text-[var(--accent-emerald)]">▶</span>
            {agent.current_task}
          </motion.div>
        ) : null}
      </AnimatePresence>
      <div className="relative flex w-full items-center justify-between text-[9px] font-mono text-[var(--text-tertiary)]">
        <span>{formatRelative(agent.last_run_at)}</span>
        <span>every {agent.schedule_seconds}s</span>
      </div>
    </motion.button>
  );
}

function StatusDot({ status }: { status: Agent["status"] }) {
  const map = {
    active: { cls: "bg-[var(--accent-emerald)] text-[var(--accent-emerald)] status-dot-pulse", label: "ACTIVE" },
    idle: { cls: "bg-[var(--text-tertiary)] text-[var(--text-tertiary)]", label: "IDLE" },
    waiting: { cls: "bg-[var(--accent-amber)] text-[var(--accent-amber)] status-dot-pulse", label: "WAIT" },
    error: { cls: "bg-[var(--accent-red)] text-[var(--accent-red)]", label: "ERR" },
    paused: { cls: "bg-[var(--text-tertiary)] text-[var(--text-tertiary)]", label: "CAP" },
  };
  const m = map[status] ?? map.idle;
  return (
    <span className="ml-auto flex items-center gap-1">
      <span className={cn("h-1.5 w-1.5 rounded-full", m.cls)} />
      <span className={cn("data-mono text-[9px]", m.cls.split(" ")[1])}>{m.label}</span>
    </span>
  );
}
