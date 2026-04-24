"use client";

import { useCallback, useEffect, useState } from "react";
import { StatusBadge } from "@/components/agents/StatusBadge";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogContent } from "@/components/ui/Dialog";
import { Input, Textarea } from "@/components/ui/Input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { api } from "@/lib/api";
import { useAgents } from "@/hooks/useAgents";

type Tab = "agents" | "business" | "controls";

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>("agents");
  return (
    <PageContainer title="Settings">
      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)} className="mb-4">
        <TabsList>
          <TabsTrigger value="agents">Agents</TabsTrigger>
          <TabsTrigger value="business">Business</TabsTrigger>
          <TabsTrigger value="controls">Controls</TabsTrigger>
        </TabsList>
        <TabsContent value="agents" className="mt-4">
          <AgentsTab />
        </TabsContent>
        <TabsContent value="business" className="mt-4">
          <BusinessTab />
        </TabsContent>
        <TabsContent value="controls" className="mt-4">
          <ControlsTab />
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}

function AgentsTab() {
  const { agents, refresh } = useAgents();
  return (
    <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
      <table className="min-w-full text-sm">
        <thead className="bg-[var(--bg-surface)] text-left font-mono text-[10px] uppercase tracking-wide text-[var(--text-tertiary)]">
          <tr>
            <th className="px-3 py-2">Agent</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2">Enabled</th>
            <th className="px-3 py-2">Daily cap</th>
            <th className="px-3 py-2">Monthly cap</th>
            <th className="px-3 py-2">Every</th>
            <th className="px-3 py-2" />
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)]">
          {agents.map((a) => (
            <AgentRow key={a.id} agentId={a.id} onChanged={refresh} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AgentRow({ agentId, onChanged }: { agentId: string; onChanged: () => void }) {
  const { agents } = useAgents();
  const agent = agents.find((a) => a.id === agentId);
  const [busy, setBusy] = useState(false);
  const [daily, setDaily] = useState("");
  const [monthly, setMonthly] = useState("");
  const [sched, setSched] = useState("");

  useEffect(() => {
    if (!agent) return;
    setDaily(String(agent.daily_token_cap));
    setMonthly(String(agent.monthly_token_cap));
    setSched(String(agent.schedule_seconds));
  }, [agent?.id, agent?.daily_token_cap, agent?.monthly_token_cap, agent?.schedule_seconds]);

  if (!agent) return null;

  const save = async () => {
    setBusy(true);
    try {
      await api.updateAgent(agent.id, {
        daily_token_cap: Number(daily),
        monthly_token_cap: Number(monthly),
        schedule_seconds: Number(sched),
      });
      onChanged();
    } finally {
      setBusy(false);
    }
  };

  const toggle = async () => {
    setBusy(true);
    try {
      await api.updateAgent(agent.id, { enabled: !agent.enabled });
      onChanged();
    } finally {
      setBusy(false);
    }
  };

  const resetSpend = async () => {
    setBusy(true);
    try {
      // per-agent reset isn't a spec route — use the global reset-caps but scoped via PUT with zeros.
      await api.updateAgent(agent.id, {
        tokens_used_today: 0,
        cost_usd_today: 0,
      } as Partial<typeof agent>);
      onChanged();
    } finally {
      setBusy(false);
    }
  };

  return (
    <tr className="text-[var(--text-primary)]">
      <td className="px-3 py-2">
        <div className="font-mono font-medium">{agent.name}</div>
        <div className="text-[11px] text-[var(--text-tertiary)]">{agent.role}</div>
      </td>
      <td className="px-3 py-2">
        <StatusBadge status={agent.status} />
      </td>
      <td className="px-3 py-2">
        <button onClick={toggle} className="text-xs underline-offset-2 hover:underline">
          {agent.enabled ? "disable" : "enable"}
        </button>
      </td>
      <td className="px-3 py-2">
        <Input type="number" value={daily} onChange={(e) => setDaily(e.target.value)} className="w-28" />
      </td>
      <td className="px-3 py-2">
        <Input type="number" value={monthly} onChange={(e) => setMonthly(e.target.value)} className="w-32" />
      </td>
      <td className="px-3 py-2">
        <Input type="number" value={sched} onChange={(e) => setSched(e.target.value)} className="w-24" />
      </td>
      <td className="px-3 py-2">
        <div className="flex gap-2">
          <Button variant="primary" onClick={save} loading={busy}>
            Save
          </Button>
          <Button variant="ghost" onClick={resetSpend} loading={busy}>
            Reset spend
          </Button>
        </div>
      </td>
    </tr>
  );
}

const BUSINESS_FIELDS: {
  key: "company_name" | "company_description" | "icp" | "current_product_focus" | "revenue_model";
  title: string;
}[] = [
  { key: "company_name", title: "Company name" },
  { key: "company_description", title: "Company description" },
  { key: "icp", title: "Target customer (ICP)" },
  { key: "current_product_focus", title: "Current product focus" },
  { key: "revenue_model", title: "Revenue model" },
];

function BusinessTab() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const { business } = await api.getSettings();
    setValues({
      company_name: business["Company name"] ?? "",
      company_description: business["Company description"] ?? "",
      icp: business["Target customer (ICP)"] ?? "",
      current_product_focus: business["Current product focus"] ?? "",
      revenue_model: business["Revenue model"] ?? "",
    });
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const save = async (key: string) => {
    setSaving(key);
    try {
      await api.updateGlobalSettings({ [key]: values[key] });
      await refresh();
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="space-y-4">
      {BUSINESS_FIELDS.map((f) => (
        <div key={f.key} className="rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] p-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-sm font-semibold text-[var(--text-primary)]">{f.title}</div>
            <Button variant="primary" onClick={() => save(f.key)} loading={saving === f.key}>
              Save
            </Button>
          </div>
          <Textarea
            rows={f.key === "company_description" ? 4 : 3}
            value={values[f.key] ?? ""}
            onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
          />
        </div>
      ))}
    </div>
  );
}

function ControlsTab() {
  const { refresh } = useAgents();
  const [busy, setBusy] = useState(false);
  const [confirmPause, setConfirmPause] = useState(false);
  const [apiKeyRevealed, setApiKeyRevealed] = useState(false);
  const [localKey, setLocalKey] = useState("");

  useEffect(() => {
    setLocalKey(window.localStorage.getItem("dashboard_api_key") ?? "");
  }, []);

  const masked = localKey ? "•".repeat(Math.max(8, localKey.length - 4)) + localKey.slice(-4) : "(not set)";

  const pause = async () => {
    setBusy(true);
    try {
      await api.pauseAll();
      refresh();
    } finally {
      setBusy(false);
      setConfirmPause(false);
    }
  };

  const resume = async () => {
    setBusy(true);
    try {
      await api.resumeAll();
      refresh();
    } finally {
      setBusy(false);
    }
  };

  const resetCaps = async () => {
    setBusy(true);
    try {
      await api.resetCaps();
      refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-[var(--accent-red)]/40 bg-[color:color-mix(in_oklab,var(--accent-red)_10%,transparent)] p-4">
        <div className="mb-1 text-sm font-semibold text-[var(--accent-red)]">PAUSE ALL AGENTS</div>
        <div className="mb-3 text-xs text-[var(--text-secondary)]">
          Disables every agent. Scheduler still runs but all ticks are skipped.
        </div>
        <Dialog open={confirmPause} onOpenChange={setConfirmPause}>
          <Button variant="danger" size="lg" onClick={() => setConfirmPause(true)}>
            PAUSE ALL AGENTS
          </Button>
          <DialogContent title="Confirm pause">
            <div className="space-y-3 text-sm">
              <p>This disables every agent. Are you sure?</p>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setConfirmPause(false)}>
                  Cancel
                </Button>
                <Button variant="danger" loading={busy} onClick={pause}>
                  Yes, pause all
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] p-4">
        <div className="mb-2 text-sm font-semibold text-[var(--text-primary)]">Resume all</div>
        <Button variant="approve" onClick={resume} loading={busy}>
          Resume all agents
        </Button>
      </div>

      <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] p-4">
        <div className="mb-2 text-sm font-semibold text-[var(--text-primary)]">Reset all daily caps</div>
        <Button variant="secondary" onClick={resetCaps} loading={busy}>
          Reset daily token + cost counters
        </Button>
      </div>

      <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] p-4">
        <div className="mb-2 text-sm font-semibold text-[var(--text-primary)]">Dashboard API key</div>
        <div className="mb-2 text-xs text-[var(--text-tertiary)]">
          Stored in browser localStorage under <code>dashboard_api_key</code>.
        </div>
        <div className="flex items-center gap-2 font-mono text-sm text-[var(--text-primary)]">
          <code>{apiKeyRevealed ? localKey || "(not set)" : masked}</code>
          <Button variant="ghost" onClick={() => setApiKeyRevealed((v) => !v)}>
            {apiKeyRevealed ? "hide" : "reveal"}
          </Button>
        </div>
        <div className="mt-3">
          <Input
            placeholder="paste DASHBOARD_API_KEY and press Enter"
            defaultValue=""
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const v = (e.target as HTMLInputElement).value;
                window.localStorage.setItem("dashboard_api_key", v);
                window.location.reload();
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}
