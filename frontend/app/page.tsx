"use client";

import { useState } from "react";
import { AgentSlideOver } from "@/components/agents/AgentSlideOver";
import { ActivityTicker } from "@/components/dashboard/ActivityTicker";
import { CommandBeacon } from "@/components/dashboard/CommandBeacon";
import { KickoffButton } from "@/components/dashboard/KickoffButton";
import { NowPanel } from "@/components/dashboard/NowPanel";
import { OrgGrid } from "@/components/dashboard/OrgGrid";
import { FeedFilter } from "@/components/feed/FeedFilter";
import { RealtimeFeed } from "@/components/feed/RealtimeFeed";
import { MetricCard } from "@/components/financials/MetricCard";
import { PageContainer } from "@/components/layout/PageContainer";
import { useAgents } from "@/hooks/useAgents";
import { useMetricsSummary } from "@/hooks/useMetrics";
import type { Agent, Department } from "@/lib/types";

export default function CommandCenterPage() {
  const { agents, refresh: refreshAgents } = useAgents();
  const { data: summary } = useMetricsSummary(5000);
  const [selected, setSelected] = useState<Agent | null>(null);
  const [department, setDepartment] = useState<Department | "">("");
  const [agent, setAgent] = useState<string>("");
  const [type, setType] = useState<string>("");
  const [importance, setImportance] = useState<string>("");

  const active = summary?.totals.agents_active ?? 0;

  return (
    <PageContainer title="Mission Control">
      {/* HERO ROW */}
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <div className="surface sm:col-span-2 lg:col-span-4 flex flex-col gap-3 rounded-xl p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-tertiary)]">
              ATLAS · mission control
            </div>
            <div className="mt-0.5 text-lg font-semibold leading-snug text-[var(--text-primary)] sm:text-xl">
              {active > 0
                ? `${active} agent${active === 1 ? "" : "s"} working right now`
                : "Team is idle. Kick off to start the top-down cascade."}
            </div>
            <div className="mt-1 text-xs text-[var(--text-tertiary)]">
              CEO → VPs → ICs · agents hunt trends, tech, and revenue autonomously · owner is pinged only for PUBLISH / EMAIL / DEPLOY / SPEND / PIVOT
            </div>
          </div>
          <KickoffButton onKicked={refreshAgents} />
        </div>
        <MetricCard
          label="Spend today"
          value={Number(summary?.totals.cost_today ?? 0)}
          prefix="$"
          decimals={4}
          hint={`${summary?.totals.tokens_today ?? 0} tokens`}
        />
        <MetricCard
          label="Spend this month"
          value={Number(summary?.totals.cost_month ?? 0)}
          prefix="$"
          decimals={2}
          hint={`${summary?.totals.tokens_month ?? 0} tokens`}
        />
      </div>

      {/* COMMAND BEACON */}
      <div className="mb-4">
        <CommandBeacon agents={agents} />
      </div>

      {/* LIVE ROW */}
      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <NowPanel agents={agents} />
        </div>
        <div className="flex flex-col gap-4 lg:col-span-7">
          <ActivityTicker />
          <OrgGrid agents={agents} onSelect={setSelected} />
        </div>
      </div>

      {/* FEED */}
      <div className="surface mb-3 overflow-x-auto rounded-xl p-3">
        <FeedFilter
          agents={agents}
          department={department}
          agent={agent}
          type={type}
          importance={importance}
          onChange={(p) => {
            if (p.department !== undefined) setDepartment(p.department);
            if (p.agent !== undefined) setAgent(p.agent);
            if (p.type !== undefined) setType(p.type);
            if (p.importance !== undefined) setImportance(p.importance);
          }}
        />
      </div>
      <div className="surface rounded-xl px-3 sm:px-4">
        <RealtimeFeed
          agents={agents}
          agent={agent || undefined}
          type={type || undefined}
          importance={importance || undefined}
          limit={50}
        />
      </div>

      <AgentSlideOver
        agent={selected}
        onClose={() => setSelected(null)}
        onChanged={refreshAgents}
      />
    </PageContainer>
  );
}
