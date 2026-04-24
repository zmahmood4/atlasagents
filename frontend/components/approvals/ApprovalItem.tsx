"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { AgentAvatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";
import { formatWaiting } from "@/lib/utils";
import type { Agent, PendingApproval } from "@/lib/types";
import { RedirectModal } from "./RedirectModal";

const URGENCY_TONE: Record<string, "default" | "amber" | "red"> = {
  low: "default",
  normal: "default",
  high: "amber",
  critical: "red",
  urgent: "red",
};

export function ApprovalItem({
  approval,
  agents,
  onChanged,
  index,
}: {
  approval: PendingApproval;
  agents: Agent[];
  onChanged: () => void;
  index?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const agent = agents.find((a) => a.name === approval.agent_name);
  const isPending = approval.status === "pending";

  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
      onChanged();
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.22, delay: Math.min((index ?? 0) * 0.04, 0.3) }}
      className="rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            {agent ? <AgentAvatar name={agent.name} department={agent.department} size={20} /> : null}
            <span className="font-mono text-[11px] text-[var(--text-secondary)]">{approval.agent_name}</span>
            <Badge tone="blue">{approval.action_type}</Badge>
            <Badge tone={URGENCY_TONE[approval.urgency] || "default"}>{approval.urgency}</Badge>
            {approval.status !== "pending" ? (
              <Badge tone={approval.status === "approved" ? "emerald" : "red"}>{approval.status}</Badge>
            ) : null}
          </div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">{approval.title}</h3>
          <div className="mt-1 text-xs text-[var(--text-secondary)]">{approval.description}</div>
          <button
            className="mt-2 text-[11px] text-[var(--accent-blue)] hover:text-[var(--accent-blue)]/80"
            onClick={() => setExpanded((e) => !e)}
          >
            {expanded ? "Hide reasoning" : "Show reasoning"}
          </button>
          {expanded ? (
            <div className="mt-2 rounded-md border border-[var(--border)] bg-[var(--bg-base)] p-3 text-xs text-[var(--text-secondary)]">
              <pre className="whitespace-pre-wrap">{approval.reasoning}</pre>
              {approval.owner_note ? (
                <div className="mt-3 border-t border-[var(--border)] pt-2">
                  <div className="text-[10px] uppercase tracking-wide text-[var(--text-tertiary)]">
                    Owner note
                  </div>
                  <div>{approval.owner_note}</div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
        <div className="shrink-0 text-right font-mono text-[11px] text-[var(--text-tertiary)]">
          {isPending ? formatWaiting(approval.created_at) : approval.resolved_at}
        </div>
      </div>

      {isPending ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="approve" onClick={() => act(() => api.approve(approval.id))} loading={busy}>
            Approve
          </Button>
          <Button variant="reject" onClick={() => act(() => api.reject(approval.id))} loading={busy}>
            Reject
          </Button>
          <Button variant="redirect" onClick={() => setRedirecting(true)} loading={busy}>
            Redirect
          </Button>
        </div>
      ) : null}

      <RedirectModal
        open={redirecting}
        onClose={() => setRedirecting(false)}
        onSubmit={async (note) => {
          await api.redirect(approval.id, note);
          onChanged();
        }}
      />
    </motion.div>
  );
}
