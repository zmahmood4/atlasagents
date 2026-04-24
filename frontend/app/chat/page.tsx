"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { PageContainer } from "@/components/layout/PageContainer";
import { AgentAvatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { useAgents } from "@/hooks/useAgents";
import { cn } from "@/lib/utils";
import type { Agent } from "@/lib/types";

const DEPT_ORDER = ["command", "product", "engineering", "gtm", "ops"];

function AgentPicker({
  agents,
  selected,
  onSelect,
}: {
  agents: Agent[];
  selected: string;
  onSelect: (name: string) => void;
}) {
  const sorted = [...agents].sort((a, b) => {
    const di = DEPT_ORDER.indexOf(a.department) - DEPT_ORDER.indexOf(b.department);
    return di !== 0 ? di : a.name.localeCompare(b.name);
  });

  return (
    <div className="flex h-full flex-col border-r border-[var(--border)] bg-[var(--bg-surface)]">
      <div className="border-b border-[var(--border)] px-4 py-3">
        <div className="font-display text-[10px] font-semibold uppercase tracking-widest text-[var(--text-tertiary)]">
          Agents
        </div>
      </div>
      <div className="flex-1 overflow-y-auto py-2">
        {sorted.map((a) => (
          <button
            key={a.id}
            onClick={() => onSelect(a.name)}
            className={cn(
              "flex w-full items-center gap-3 px-4 py-2.5 transition text-left",
              selected === a.name
                ? "bg-[var(--bg-elevated)]"
                : "hover:bg-[var(--bg-elevated)]/60",
            )}
          >
            <AgentAvatar name={a.name} department={a.department} size={28} />
            <div className="min-w-0 flex-1">
              <div className={cn("font-mono text-xs font-semibold truncate", selected === a.name ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]")}>
                {a.name}
              </div>
              <div className="truncate text-[9px] text-[var(--text-tertiary)]">{a.role.split(" — ")[0]}</div>
            </div>
            {a.status === "active" ? (
              <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--accent-emerald)] status-dot-pulse" style={{ color: "var(--accent-emerald)" }} />
            ) : null}
          </button>
        ))}
      </div>
    </div>
  );
}

function ChatContent() {
  const searchParams = useSearchParams();
  const { agents, loading } = useAgents();
  const defaultAgent = searchParams.get("agent") ?? "ceo";
  const [selectedAgentName, setSelectedAgentName] = useState(defaultAgent);

  if (loading) return <div className="flex h-full items-center justify-center"><Spinner size={24} /></div>;

  const agent = agents.find((a) => a.name === selectedAgentName) ?? agents[0];

  return (
    <div className="flex h-full overflow-hidden rounded-xl border border-[var(--border)]" style={{ height: "calc(100vh - 130px)" }}>
      {/* Sidebar — agent picker (hidden on mobile) */}
      <div className="hidden w-56 shrink-0 md:flex md:flex-col">
        <AgentPicker
          agents={agents}
          selected={selectedAgentName}
          onSelect={setSelectedAgentName}
        />
      </div>

      {/* Chat area */}
      <div className="flex flex-1 flex-col overflow-hidden bg-[var(--bg-base)]">
        {agent ? (
          <ChatWindow
            agent={agent}
            onBack={undefined}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-[var(--text-tertiary)]">
            Select an agent to start chatting.
          </div>
        )}
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <PageContainer title="Agent Chat">
      <Suspense fallback={<Spinner />}>
        <ChatContent />
      </Suspense>
    </PageContainer>
  );
}
