"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ApprovalItem } from "@/components/approvals/ApprovalItem";
import { Spinner } from "@/components/ui/Spinner";
import { useAgents } from "@/hooks/useAgents";
import { useApprovals } from "@/hooks/useApprovals";
import { cn } from "@/lib/utils";

const URGENCY_RANK: Record<string,number> = { critical:0, urgent:0, high:1, normal:2, low:3 };

export default function ApprovalsPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"pending"|"resolved">("pending");
  const { agents } = useAgents();
  const statusFilter = tab === "pending" ? "pending" : "all";
  const { approvals, loading, refresh } = useApprovals(statusFilter);

  const visible = tab === "resolved"
    ? approvals.filter(a => a.status !== "pending").sort((a,b) => (b.resolved_at||"").localeCompare(a.resolved_at||""))
    : approvals.slice().sort((a,b) => (URGENCY_RANK[a.urgency]??2)-(URGENCY_RANK[b.urgency]??2));

  return (
    <div className="flex min-h-screen flex-col bg-[var(--bg-void)]"
      style={{ paddingTop:"max(0px,var(--safe-top))", paddingBottom:"max(var(--safe-bottom),12px)" }}>
      <header className="glass-darker sticky top-0 z-10 flex items-center gap-3 px-4 py-2.5"
        style={{ paddingTop:"max(10px,var(--safe-top))" }}>
        <button onClick={() => router.push("/")} className="rounded-lg p-1.5 text-[var(--text-tertiary)] hover:text-[var(--cyan)] transition">
          <ArrowLeft className="h-4 w-4"/>
        </button>
        <span className="atlas-brand font-black tracking-[0.2em]" style={{ fontSize:"0.85rem" }}>ATLAS</span>
        <span className="font-mono text-[11px] text-[var(--text-tertiary)] ml-1">/ Approvals</span>
      </header>

      <main className="flex-1 px-4 py-4 max-w-2xl mx-auto w-full">
        <div className="mb-4 flex gap-1 rounded-xl border border-[var(--border-glow)] bg-[var(--bg-surface)] p-1">
          {(["pending","resolved"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={cn("flex-1 rounded-lg px-3 py-1.5 font-mono text-[11px] capitalize transition",
                tab===t ? "bg-[var(--bg-elevated)] text-[var(--text-primary)]" : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]")}>
              {t}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-8"><Spinner size={20}/></div>
        ) : visible.length === 0 ? (
          <div className="rounded-xl border border-[var(--border-glow)] bg-[var(--bg-surface)] p-8 text-center">
            <div className="atlas-brand mb-2 text-lg font-black">Clear</div>
            <div className="font-mono text-[11px] text-[var(--text-tertiary)]">
              {tab==="pending" ? "Your team is running autonomously — nothing needs your attention." : "No resolved approvals yet."}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence initial={false}>
              {visible.map((a,i) => (
                <ApprovalItem key={a.id} approval={a} agents={agents} onChanged={refresh} index={i}/>
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>
    </div>
  );
}
