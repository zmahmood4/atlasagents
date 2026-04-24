"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { BusinessMetric, MetricsSummary } from "@/lib/types";

function bucket(runs: MetricsSummary["runs_today"]): { day: string; ai_cost: number }[] {
  const by: Record<string, number> = {};
  for (const r of runs) {
    const day = r.started_at.slice(0, 10);
    by[day] = (by[day] ?? 0) + Number(r.cost_usd);
  }
  return Object.entries(by)
    .map(([day, ai_cost]) => ({ day, ai_cost }))
    .sort((a, b) => (a.day < b.day ? -1 : 1))
    .slice(-30);
}

export function CostChart({
  summary,
  revenue,
}: {
  summary: MetricsSummary;
  revenue?: BusinessMetric[];
}) {
  const costs = bucket(summary.runs_today);
  const revenueBy: Record<string, number> = {};
  for (const r of revenue ?? []) {
    revenueBy[r.period_date] = Number(r.metric_value);
  }
  const dates = Array.from(
    new Set([...costs.map((c) => c.day), ...Object.keys(revenueBy)]),
  ).sort();
  const data = dates.map((day) => ({
    day,
    ai_cost: costs.find((c) => c.day === day)?.ai_cost ?? 0,
    revenue: revenueBy[day] ?? 0,
  }));

  if (data.length === 0) {
    return (
      <div className="rounded-md border border-[var(--border)] bg-[var(--bg-surface)] p-6 text-xs text-[var(--text-secondary)]">
        No cost data yet — agents need to run at least once before the chart populates.
      </div>
    );
  }

  return (
    <div className="rounded-md border border-[var(--border)] bg-[var(--bg-surface)] p-4">
      <div className="mb-2 text-[10px] uppercase tracking-wide text-[var(--text-tertiary)]">
        Revenue vs AI Costs · last 30 days
      </div>
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis dataKey="day" stroke="var(--text-tertiary)" tick={{ fontSize: 10 }} />
            <YAxis stroke="var(--text-tertiary)" tick={{ fontSize: 10 }} />
            <Tooltip
              contentStyle={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--border)",
                borderRadius: 6,
                fontSize: 12,
              }}
              labelStyle={{ color: "var(--text-primary)" }}
            />
            <Line
              type="monotone"
              dataKey="ai_cost"
              name="AI cost (USD)"
              stroke="var(--accent-red)"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="revenue"
              name="Revenue (USD)"
              stroke="var(--accent-emerald)"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
