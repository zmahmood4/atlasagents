"use client";

import { motion } from "framer-motion";
import { AgentAvatar } from "@/components/ui/Avatar";
import { StatusBadge } from "./StatusBadge";
import { TokenProgressBar } from "./TokenProgressBar";
import { formatRelative, formatUsd } from "@/lib/utils";
import type { Agent } from "@/lib/types";

export function AgentCard({
  agent,
  onClick,
}: {
  agent: Agent;
  onClick?: () => void;
}) {
  return (
    <motion.button
      layout
      whileHover={{ y: -2 }}
      transition={{ duration: 0.18 }}
      onClick={onClick}
      className="surface glow-hover flex w-full flex-col gap-3 rounded-lg p-4 text-left"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <AgentAvatar name={agent.name} department={agent.department} />
          <div>
            <div className="font-mono text-sm font-semibold text-[var(--text-primary)]">{agent.name}</div>
            <div className="text-[11px] text-[var(--text-tertiary)]">{agent.role}</div>
          </div>
        </div>
        <StatusBadge status={agent.status} />
      </div>
      {agent.current_task ? (
        <div className="truncate text-xs text-[var(--text-secondary)]" title={agent.current_task}>
          {agent.current_task}
        </div>
      ) : null}
      <TokenProgressBar
        used={agent.tokens_used_today}
        cap={agent.daily_token_cap}
        label="daily tokens"
      />
      <div className="flex items-center justify-between text-[11px] font-mono text-[var(--text-tertiary)]">
        <span>last {formatRelative(agent.last_run_at)}</span>
        <span>{formatUsd(agent.cost_usd_today)} today</span>
      </div>
    </motion.button>
  );
}
