"use client";

import { AnimatePresence } from "framer-motion";
import { FeedItem, resolveAgent } from "./FeedItem";
import { Spinner } from "@/components/ui/Spinner";
import { useFeed } from "@/hooks/useFeed";
import type { Agent } from "@/lib/types";

export function RealtimeFeed({
  agents,
  agent,
  type,
  importance,
  limit,
}: {
  agents: Agent[];
  agent?: string;
  type?: string;
  importance?: string;
  limit?: number;
}) {
  const { actions, loading, error } = useFeed({ agent, type, importance });

  if (loading) return <Spinner />;
  if (error) return <div className="text-sm text-[var(--accent-red)]">{error}</div>;
  if (actions.length === 0) {
    return (
      <div className="rounded-md border border-[var(--border)] bg-[var(--bg-surface)] p-8 text-sm text-[var(--text-secondary)]">
        Agents are initialising…
      </div>
    );
  }

  const list = limit ? actions.slice(0, limit) : actions;
  return (
    <div>
      <AnimatePresence initial={false}>
        {list.map((a, i) => {
          const { department, role } = resolveAgent(agents, a.agent_name);
          return (
            <FeedItem
              key={a.id}
              item={a}
              department={department}
              role={role}
              index={i}
            />
          );
        })}
      </AnimatePresence>
    </div>
  );
}
