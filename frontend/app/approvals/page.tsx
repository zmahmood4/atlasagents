"use client";

import { AnimatePresence } from "framer-motion";
import { useState } from "react";
import { ApprovalItem } from "@/components/approvals/ApprovalItem";
import { PageContainer } from "@/components/layout/PageContainer";
import { Spinner } from "@/components/ui/Spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { useAgents } from "@/hooks/useAgents";
import { useApprovals } from "@/hooks/useApprovals";

const URGENCY_RANK: Record<string, number> = {
  critical: 0,
  urgent: 0,
  high: 1,
  normal: 2,
  low: 3,
};

export default function ApprovalsPage() {
  const [tab, setTab] = useState<"pending" | "resolved">("pending");
  const { agents } = useAgents();
  const statusFilter = tab === "pending" ? "pending" : "all";
  const { approvals, loading, refresh } = useApprovals(statusFilter);

  const visible =
    tab === "resolved"
      ? approvals
          .filter((a) => a.status !== "pending")
          .sort((a, b) => (b.resolved_at || "").localeCompare(a.resolved_at || ""))
      : approvals
          .slice()
          .sort((a, b) => {
            const r = (URGENCY_RANK[a.urgency] ?? 2) - (URGENCY_RANK[b.urgency] ?? 2);
            if (r !== 0) return r;
            return (a.created_at || "").localeCompare(b.created_at || "");
          });

  return (
    <PageContainer title="Approval Inbox">
      <Tabs value={tab} onValueChange={(v) => setTab(v as "pending" | "resolved")} className="mb-4">
        <TabsList>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="resolved">Resolved</TabsTrigger>
        </TabsList>
      </Tabs>

      {loading ? (
        <Spinner />
      ) : visible.length === 0 ? (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] p-8 text-center text-sm text-[var(--text-secondary)]">
          {tab === "pending"
            ? "Your team is running independently — nothing needs your attention."
            : "No resolved approvals yet."}
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {visible.map((a, i) => (
              <ApprovalItem
                key={a.id}
                approval={a}
                agents={agents}
                onChanged={refresh}
                index={i}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </PageContainer>
  );
}
