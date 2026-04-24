"use client";

import { motion } from "framer-motion";
import { AgentAvatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { cn, formatRelative, importanceBorder } from "@/lib/utils";
import type { Agent, AgentAction, Department } from "@/lib/types";

function typeBadgeTone(action_type: string): "blue" | "purple" | "emerald" | "amber" | "default" {
  switch (action_type) {
    case "decision":
      return "purple";
    case "tool":
      return "blue";
    case "artifact":
      return "emerald";
    case "escalation":
      return "amber";
    case "task":
      return "default";
    default:
      return "default";
  }
}

function typeLabel(action_type: string): string {
  if (action_type === "decision") return "DECISION";
  if (action_type === "tool") return "TOOL";
  if (action_type === "artifact") return "ARTIFACT";
  if (action_type === "escalation") return "ESCALATION";
  if (action_type === "task") return "TASK";
  return action_type.toUpperCase();
}

export function FeedItem({
  item,
  department,
  role,
  index,
}: {
  item: AgentAction;
  department: Department;
  role?: string;
  index?: number;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: Math.min((index ?? 0) * 0.02, 0.2) }}
      className={cn(
        "flex items-start gap-3 border-b border-[var(--border)] py-3 pl-3 border-l-2",
        importanceBorder(item.importance),
      )}
    >
      <AgentAvatar name={item.agent_name} department={department} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs text-[var(--text-primary)]">{item.agent_name}</span>
          {role ? <span className="text-[11px] text-[var(--text-tertiary)]">· {role}</span> : null}
          <Badge tone={typeBadgeTone(item.action_type)}>{typeLabel(item.action_type)}</Badge>
          <span className="ml-auto shrink-0 text-[11px] font-mono text-[var(--text-tertiary)]">
            {formatRelative(item.created_at)}
          </span>
        </div>
        <div className="mt-0.5 text-sm text-[var(--text-primary)]">{item.summary}</div>
      </div>
    </motion.div>
  );
}

export function resolveAgent(
  agents: Agent[],
  name: string,
): { department: Department; role: string } {
  const a = agents.find((x) => x.name === name);
  return {
    department: (a?.department as Department) ?? "ops",
    role: a?.role ?? "",
  };
}
