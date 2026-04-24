"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Bell, Menu } from "lucide-react";
import Link from "next/link";
import CountUp from "react-countup";
import { useApprovals } from "@/hooks/useApprovals";
import { useMetricsSummary } from "@/hooks/useMetrics";
import { cn } from "@/lib/utils";

export function TopBar({
  title,
  onOpenMenu,
}: {
  title: string;
  onOpenMenu?: () => void;
}) {
  const { approvals } = useApprovals("pending");
  const { data } = useMetricsSummary();
  const active = data?.totals.agents_active ?? 0;
  const dot = active > 0 ? "bg-[var(--accent-emerald)]" : "bg-[var(--text-tertiary)]";
  const textDot = active > 0 ? "text-[var(--accent-emerald)]" : "text-[var(--text-tertiary)]";

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--bg-base)]/80 px-4 py-3 panel-blur sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        {onOpenMenu ? (
          <button
            onClick={onOpenMenu}
            className="rounded-md border border-[var(--border)] bg-[var(--bg-surface)] p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] lg:hidden"
            aria-label="Open navigation"
          >
            <Menu className="h-4 w-4" />
          </button>
        ) : null}
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent-blue)] status-dot-pulse" />
        <h1 className="truncate font-mono text-sm font-semibold tracking-wide text-[var(--text-primary)]">
          {title}
        </h1>
      </div>
      <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] sm:gap-4">
        <div className={cn("hidden items-center gap-1.5 sm:flex", textDot)}>
          <span className={cn("h-2 w-2 rounded-full status-dot-pulse", dot)} />
          <span className="data-mono">
            {active} / {data?.totals.agents_total ?? 13} active
          </span>
        </div>
        <div className="data-mono rounded-md border border-[var(--border)] bg-[var(--bg-surface)]/80 px-2 py-1">
          <CountUp
            end={Number(data?.totals.cost_today ?? 0)}
            duration={1.2}
            decimals={4}
            prefix="$"
            preserveValue
          />
          <span className="ml-1.5 hidden text-[var(--text-tertiary)] sm:inline">today</span>
        </div>
        <Link
          href="/approvals"
          className="glow-hover relative inline-flex items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--bg-surface)] px-2 py-1 hover:border-[var(--accent-amber)]/60"
        >
          <Bell className="h-3.5 w-3.5" />
          <span className="data-mono">{approvals.length}</span>
          <AnimatePresence>
            {approvals.length > 0 ? (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-[var(--accent-amber)] approval-bounce"
              />
            ) : null}
          </AnimatePresence>
        </Link>
      </div>
    </header>
  );
}
