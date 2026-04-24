"use client";

import { useState } from "react";
import { AgentSlideOver } from "@/components/agents/AgentSlideOver";
import { ActivityTicker } from "@/components/dashboard/ActivityTicker";
import { CommandBeacon } from "@/components/dashboard/CommandBeacon";
import { KickoffButton } from "@/components/dashboard/KickoffButton";
import { CEOChatShortcut } from "@/components/chat/AgentChatButton";
import { NowPanel } from "@/components/dashboard/NowPanel";
import { OrgGrid } from "@/components/dashboard/OrgGrid";
import { StatsStrip } from "@/components/dashboard/StatsStrip";
import { SprintProgress } from "@/components/dashboard/SprintProgress";
import { FeedFilter } from "@/components/feed/FeedFilter";
import { RealtimeFeed } from "@/components/feed/RealtimeFeed";
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
      {/* 1. TELEMETRY STRIP */}
      <StatsStrip agents={agents} summary={summary} />

      {/* 1b. SPRINT PROGRESS */}
      <SprintProgress />

      {/* 2. HEADER — status + kickoff */}
      <div className="surface mb-4 flex flex-col gap-3 rounded-xl p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-[9px] uppercase tracking-[0.2em] text-[var(--text-tertiary)]">
            ATLAS · autonomous AI studio · 13 agents deployed
          </div>
          <div className="mt-0.5 text-lg font-semibold leading-tight text-[var(--text-primary)] sm:text-xl">
            {active > 0
              ? `${active} agent${active === 1 ? "" : "s"} working right now`
              : "Team is idle — kick off to start the cascade"}
          </div>
          <div className="mt-1 text-xs text-[var(--text-tertiary)]">
            CEO hunts trends + revenue · VPs cascade to ICs · you approve only PUBLISH / EMAIL / DEPLOY / SPEND / PIVOT
          </div>
        </div>
        <KickoffButton onKicked={refreshAgents} />
      </div>

      {/* 3. COMMAND BEACON — CEO + dept breakdown */}
      <CommandBeacon agents={agents} />

      {/* 3b. CEO CHAT SHORTCUT */}
      <div className="mb-4">
        <CEOChatShortcut agent={agents.find((a) => a.name === "ceo")} />
      </div>

      {/* 4. LIVE ROW — NowPanel + OrgGrid */}
      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <NowPanel agents={agents} />
        </div>
        <div className="flex flex-col gap-4 lg:col-span-7">
          <ActivityTicker />
          <OrgGrid agents={agents} onSelect={setSelected} />
        </div>
      </div>

      {/* 5. LIVE FEED */}
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
          limit={60}
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
