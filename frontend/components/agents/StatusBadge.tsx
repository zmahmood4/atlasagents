import { cn } from "@/lib/utils";
import type { AgentStatus } from "@/lib/types";

const MAP: Record<AgentStatus, { label: string; dot: string; text: string; pulse: boolean }> = {
  active: {
    label: "ACTIVE",
    dot: "bg-[var(--accent-emerald)]",
    text: "text-[var(--accent-emerald)]",
    pulse: true,
  },
  idle: {
    label: "IDLE",
    dot: "bg-[var(--text-tertiary)]",
    text: "text-[var(--text-secondary)]",
    pulse: false,
  },
  waiting: {
    label: "AWAITING APPROVAL",
    dot: "bg-[var(--accent-amber)]",
    text: "text-[var(--accent-amber)]",
    pulse: true,
  },
  error: {
    label: "ERROR",
    dot: "bg-[var(--accent-red)]",
    text: "text-[var(--accent-red)]",
    pulse: false,
  },
  paused: {
    label: "CAP REACHED",
    dot: "bg-[var(--text-tertiary)]",
    text: "text-[var(--text-tertiary)]",
    pulse: false,
  },
};

export function StatusBadge({ status }: { status: AgentStatus }) {
  const m = MAP[status] ?? MAP.idle;
  return (
    <span className={cn("inline-flex items-center gap-1.5 font-mono text-[10px]", m.text)}>
      <span className={cn("h-2 w-2 rounded-full", m.dot, m.pulse && "status-dot-pulse")} />
      {m.label}
    </span>
  );
}
