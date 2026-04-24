"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { AgentAvatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "./StatusBadge";
import { TokenProgressBar } from "./TokenProgressBar";
import { api } from "@/lib/api";
import { formatRelative, formatUsd } from "@/lib/utils";
import type { Agent, AgentAction, WorkArtifact } from "@/lib/types";

export function AgentSlideOver({
  agent,
  onClose,
  onChanged,
}: {
  agent: Agent | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [recent, setRecent] = useState<AgentAction[]>([]);
  const [artifacts, setArtifacts] = useState<WorkArtifact[]>([]);
  const [busy, setBusy] = useState(false);
  const [triggerCooldown, setTriggerCooldown] = useState(0);

  useEffect(() => {
    if (!agent) return;
    api.getAgent(agent.id).then((r) => setRecent(r.recent_actions));
    api.listArtifacts({ agent: agent.name, limit: 10 }).then((r) => setArtifacts(r.artifacts));
  }, [agent?.id]);

  useEffect(() => {
    if (triggerCooldown <= 0) return;
    const id = setInterval(() => setTriggerCooldown((n) => Math.max(0, n - 1)), 1000);
    return () => clearInterval(id);
  }, [triggerCooldown]);

  const toggle = async () => {
    if (!agent) return;
    setBusy(true);
    try {
      await api.updateAgent(agent.id, { enabled: !agent.enabled });
      onChanged();
    } finally {
      setBusy(false);
    }
  };

  const runNow = async () => {
    if (!agent) return;
    setBusy(true);
    try {
      await api.triggerAgent(agent.id);
      setTriggerCooldown(60);
      onChanged();
    } finally {
      setBusy(false);
    }
  };

  return (
    <AnimatePresence>
      {agent ? (
        <motion.div
          className="fixed inset-0 z-40 flex"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onClose}
        >
          <div className="flex-1 bg-black/50" />
          <motion.aside
            onClick={(e) => e.stopPropagation()}
            initial={{ x: 480 }}
            animate={{ x: 0 }}
            exit={{ x: 480 }}
            transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
            className="w-[480px] max-w-full overflow-y-auto border-l border-[var(--border)] bg-[var(--bg-surface)] p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <AgentAvatar name={agent.name} department={agent.department} size={36} />
                <div>
                  <div className="font-mono text-base font-semibold text-[var(--text-primary)]">
                    {agent.name}
                  </div>
                  <div className="text-xs text-[var(--text-tertiary)]">{agent.role}</div>
                </div>
              </div>
              <StatusBadge status={agent.status} />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
              <InfoCell label="Department" value={agent.department} />
              <InfoCell label="Schedule" value={`every ${agent.schedule_seconds}s`} />
              <InfoCell label="Last run" value={formatRelative(agent.last_run_at)} />
              <InfoCell label="Cost today" value={formatUsd(agent.cost_usd_today)} />
              <InfoCell label="Cost this month" value={formatUsd(agent.cost_usd_month)} />
              <InfoCell label="Enabled" value={agent.enabled ? "yes" : "no"} />
            </div>

            <div className="mt-4 space-y-3">
              <TokenProgressBar
                used={agent.tokens_used_today}
                cap={agent.daily_token_cap}
                label="daily tokens"
              />
              <TokenProgressBar
                used={agent.tokens_used_month}
                cap={agent.monthly_token_cap}
                label="monthly tokens"
              />
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                variant="primary"
                loading={busy}
                onClick={runNow}
                disabled={triggerCooldown > 0}
              >
                {triggerCooldown > 0 ? `Run Now (${triggerCooldown}s)` : "Run Now"}
              </Button>
              <Button variant={agent.enabled ? "danger" : "approve"} onClick={toggle} loading={busy}>
                {agent.enabled ? "Disable" : "Enable"}
              </Button>
              <Button variant="ghost" onClick={onClose} className="ml-auto">
                Close
              </Button>
            </div>

            <Collapsible title="System prompt">
              <pre className="whitespace-pre-wrap rounded-md border border-[var(--border)] bg-[var(--bg-base)] p-3 text-xs font-mono text-[var(--text-secondary)]">
                {agent.system_prompt}
              </pre>
            </Collapsible>

            <section className="mt-6">
              <h4 className="mb-2 text-[10px] uppercase tracking-wide text-[var(--text-tertiary)]">
                Recent actions
              </h4>
              <div className="space-y-1">
                {recent.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between gap-2 text-xs text-[var(--text-secondary)]"
                  >
                    <span className="flex items-center gap-2 truncate">
                      <Badge tone="default">{a.action_type}</Badge>
                      <span className="truncate">{a.summary}</span>
                    </span>
                    <span className="shrink-0 text-[var(--text-tertiary)]">
                      {formatRelative(a.created_at)}
                    </span>
                  </div>
                ))}
                {recent.length === 0 ? (
                  <div className="text-xs text-[var(--text-tertiary)]">no activity yet</div>
                ) : null}
              </div>
            </section>

            <section className="mt-6">
              <h4 className="mb-2 text-[10px] uppercase tracking-wide text-[var(--text-tertiary)]">
                Artifacts
              </h4>
              <div className="space-y-1">
                {artifacts.map((a) => (
                  <div key={a.id} className="flex items-center justify-between gap-2 text-xs">
                    <span className="flex items-center gap-2 truncate text-[var(--text-secondary)]">
                      <Badge tone="blue">{a.artifact_type}</Badge>
                      <span className="truncate">{a.title}</span>
                    </span>
                    <span className="text-[var(--text-tertiary)]">{formatRelative(a.created_at)}</span>
                  </div>
                ))}
                {artifacts.length === 0 ? (
                  <div className="text-xs text-[var(--text-tertiary)]">no artifacts yet</div>
                ) : null}
              </div>
            </section>
          </motion.aside>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function InfoCell({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border border-[var(--border)] bg-[var(--bg-base)] p-3">
      <div className="text-[10px] uppercase tracking-wide text-[var(--text-tertiary)]">{label}</div>
      <div className="font-mono text-[var(--text-primary)]">{value}</div>
    </div>
  );
}

function Collapsible({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <section className="mt-6">
      <button
        onClick={() => setOpen((v) => !v)}
        className="mb-2 text-[10px] uppercase tracking-wide text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
      >
        {open ? "▾" : "▸"} {title}
      </button>
      {open ? children : null}
    </section>
  );
}
