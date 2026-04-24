"use client";

import { motion } from "framer-motion";
import { MessageSquare } from "lucide-react";
import { useRouter } from "next/navigation";
import type { Agent } from "@/lib/types";
import { cn } from "@/lib/utils";

export function AgentChatButton({
  agent,
  size = "md",
  className,
}: {
  agent: Agent;
  size?: "sm" | "md";
  className?: string;
}) {
  const router = useRouter();
  return (
    <motion.button
      whileTap={{ scale: 0.94 }}
      onClick={() => router.push(`/chat?agent=${agent.name}`)}
      className={cn(
        "flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-base)] text-[var(--text-secondary)] transition hover:border-[var(--accent-blue)] hover:text-[var(--accent-blue-bright)]",
        size === "sm" ? "px-2 py-1 text-[10px]" : "px-3 py-1.5 text-xs",
        className,
      )}
      title={`Chat with ${agent.name}`}
    >
      <MessageSquare className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} />
      Chat
    </motion.button>
  );
}

/** Full-width chat shortcut — used on Mission Control for CEO */
export function CEOChatShortcut({ agent }: { agent: Agent | undefined }) {
  const router = useRouter();
  if (!agent) return null;
  return (
    <motion.button
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => router.push("/chat")}
      className="surface glow-hover flex w-full items-center gap-3 rounded-xl p-3 text-left"
      style={{ borderColor: "color-mix(in oklab, var(--accent-blue) 30%, var(--border))" }}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-blue-dim)]">
        <MessageSquare className="h-4 w-4 text-[var(--accent-blue-bright)]" />
      </div>
      <div>
        <div className="font-display text-[11px] font-semibold uppercase tracking-wider text-[var(--accent-blue-bright)]">
          Talk to CEO
        </div>
        <div className="text-[10px] text-[var(--text-tertiary)]">
          {agent.status === "active" ? "Active now — will respond in context" : "Issue commands, ask for status, direct the team"}
        </div>
      </div>
      <span className="ml-auto text-[var(--text-tertiary)]">→</span>
    </motion.button>
  );
}
