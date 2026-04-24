"use client";

import { useState } from "react";
import { AgentCard } from "@/components/agents/AgentCard";
import { AgentSlideOver } from "@/components/agents/AgentSlideOver";
import { PageContainer } from "@/components/layout/PageContainer";
import { Spinner } from "@/components/ui/Spinner";
import { useAgents } from "@/hooks/useAgents";
import { DEPARTMENT_LABEL } from "@/lib/utils";
import type { Agent, Department } from "@/lib/types";

const DEPARTMENT_ORDER: Department[] = ["command", "product", "engineering", "gtm", "ops"];

export default function AgentBoardPage() {
  const { agents, loading, refresh } = useAgents();
  const [selected, setSelected] = useState<Agent | null>(null);

  return (
    <PageContainer title="Agent Board">
      {loading ? (
        <Spinner />
      ) : (
        <div className="space-y-8">
          {DEPARTMENT_ORDER.map((d) => {
            const list = agents.filter((a) => a.department === d);
            if (list.length === 0) return null;
            return (
              <section key={d}>
                <div className="mb-3 flex items-center gap-3">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ background: `var(--dept-${d})` }}
                  />
                  <h2 className="font-mono text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                    {DEPARTMENT_LABEL[d]}
                  </h2>
                  <span className="font-mono text-[10px] text-[var(--text-tertiary)]">
                    {list.length}
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {list.map((a) => (
                    <AgentCard key={a.id} agent={a} onClick={() => setSelected(a)} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
      <AgentSlideOver
        agent={selected}
        onClose={() => setSelected(null)}
        onChanged={() => {
          refresh();
          if (selected) {
            const next = agents.find((a) => a.id === selected.id) || null;
            setSelected(next);
          }
        }}
      />
    </PageContainer>
  );
}
