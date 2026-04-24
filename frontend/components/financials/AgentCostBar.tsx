import { AgentAvatar } from "@/components/ui/Avatar";
import { formatUsd, percent } from "@/lib/utils";
import type { Agent } from "@/lib/types";

export function AgentCostBar({
  agent,
  dayTotal,
}: {
  agent: Agent;
  dayTotal: number;
}) {
  const p = percent(agent.cost_usd_today, Math.max(dayTotal, 0.0001));
  return (
    <div className="flex items-center gap-3">
      <AgentAvatar name={agent.name} department={agent.department} size={22} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between text-xs">
          <span className="font-mono text-[var(--text-secondary)]">{agent.name}</span>
          <span className="font-mono text-[var(--text-primary)]">{formatUsd(agent.cost_usd_today)}</span>
        </div>
        <div className="mt-1 h-1.5 w-full rounded bg-[var(--bg-elevated)]">
          <div
            className="h-1.5 rounded bg-[var(--accent-blue)] transition-all"
            style={{ width: `${p}%` }}
          />
        </div>
      </div>
    </div>
  );
}
