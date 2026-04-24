"use client";

import { ArrowLeft } from "lucide-react";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { AgentNode } from "@/components/atlas/AgentNode";
import { Spinner } from "@/components/ui/Spinner";
import { useAgents } from "@/hooks/useAgents";
import { cn } from "@/lib/utils";
import type { Agent } from "@/lib/types";

const DEPT_ORDER = ["command","product","engineering","gtm","ops"];

function ChatContent() {
  const params = useSearchParams();
  const router = useRouter();
  const { agents, loading } = useAgents();
  const [selected, setSelected] = useState(params.get("agent") ?? "ceo");

  if (loading) return <div className="flex h-screen items-center justify-center"><Spinner size={24}/></div>;

  const agent = agents.find(a => a.name === selected) ?? agents[0];
  const sorted = [...agents].sort((a,b) => {
    const di = DEPT_ORDER.indexOf(a.department) - DEPT_ORDER.indexOf(b.department);
    return di !== 0 ? di : a.name.localeCompare(b.name);
  });

  return (
    <div className="flex h-screen flex-col bg-[var(--bg-void)]"
      style={{ paddingTop:"max(0px,var(--safe-top))" }}>
      <header className="glass-darker z-10 flex items-center gap-3 px-4 py-2.5 shrink-0"
        style={{ paddingTop:"max(10px,var(--safe-top))" }}>
        <button onClick={() => router.push("/")} className="rounded-lg p-1.5 text-[var(--text-tertiary)] hover:text-[var(--cyan)]">
          <ArrowLeft className="h-4 w-4"/>
        </button>
        <span className="atlas-brand font-black tracking-[0.2em]" style={{ fontSize:"0.85rem" }}>ATLAS</span>
        <span className="font-mono text-[11px] text-[var(--text-tertiary)]">/ chat</span>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Agent picker sidebar — desktop */}
        <aside className="hidden w-48 shrink-0 flex-col border-r border-[var(--border-glow)] bg-[var(--bg-surface)] md:flex">
          <div className="border-b border-[var(--border-glow)] px-3 py-2.5">
            <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-[var(--text-tertiary)]">Agents</div>
          </div>
          <div className="flex-1 overflow-y-auto py-2">
            {sorted.map(a => (
              <button key={a.id} onClick={() => setSelected(a.name)}
                className={cn("flex w-full items-center gap-2.5 px-3 py-2 transition",
                  selected===a.name ? "bg-[var(--bg-elevated)]" : "hover:bg-[var(--bg-elevated)]/50")}>
                <AgentNode agent={a} size={28} selected={selected===a.name} />
                <div className="min-w-0 flex-1 text-left">
                  <div className={cn("font-mono text-[11px] font-semibold truncate", selected===a.name ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]")}>{a.name}</div>
                  <div className="truncate text-[9px] text-[var(--text-tertiary)]">{a.role.split("—")[0].trim().split(" ").slice(0,3).join(" ")}</div>
                </div>
              </button>
            ))}
          </div>
        </aside>

        {/* Chat */}
        <div className="flex flex-1 flex-col overflow-hidden bg-[var(--bg-base)]">
          {agent ? <ChatWindow agent={agent} /> : <div className="flex h-full items-center justify-center text-sm text-[var(--text-tertiary)]">Select an agent.</div>}
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  return <Suspense fallback={<Spinner/>}><ChatContent/></Suspense>;
}
