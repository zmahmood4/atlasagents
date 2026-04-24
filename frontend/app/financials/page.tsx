"use client";

import { AgentCostBar } from "@/components/financials/AgentCostBar";
import { CostChart } from "@/components/financials/CostChart";
import { MetricCard } from "@/components/financials/MetricCard";
import { PageContainer } from "@/components/layout/PageContainer";
import { Spinner } from "@/components/ui/Spinner";
import { useMetricSeries, useMetricsSummary } from "@/hooks/useMetrics";

export default function FinancialsPage() {
  const { data, loading } = useMetricsSummary();
  const { metrics: revenueMetrics } = useMetricSeries("mrr", 30);

  if (loading || !data) {
    return (
      <PageContainer title="Financials">
        <Spinner />
      </PageContainer>
    );
  }

  const totalExperiments = data.runs_today.length > 0 ? data.runs_today.length : 0; // placeholder
  const dailyRate = data.totals.cost_today;
  const monthlyProjection = dailyRate * 30;

  return (
    <PageContainer title="Financials">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <MetricCard label="MRR" value={0} prefix="$" decimals={2} hint="pre-revenue" />
        <MetricCard
          label="Spend today"
          value={Number(data.totals.cost_today)}
          prefix="$"
          decimals={4}
          hint="live"
        />
        <MetricCard
          label="Spend this month"
          value={Number(data.totals.cost_month)}
          prefix="$"
          decimals={2}
        />
        <MetricCard
          label="Tokens today"
          value={Number(data.totals.tokens_today)}
          hint={`${data.totals.agents_active} active`}
        />
        <MetricCard
          label="Active experiments"
          value={totalExperiments}
          hint="from today's runs"
        />
      </div>

      <div className="mt-6">
        <CostChart summary={data} revenue={revenueMetrics} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 font-mono text-xs uppercase tracking-wide text-[var(--text-secondary)]">
            Spend by agent (today)
          </h2>
          <div className="space-y-3 rounded-md border border-[var(--border)] bg-[var(--bg-surface)] p-4">
            {data.agents
              .slice()
              .sort((a, b) => Number(b.cost_usd_today) - Number(a.cost_usd_today))
              .map((a) => (
                <AgentCostBar key={a.id} agent={a} dayTotal={Number(data.totals.cost_today)} />
              ))}
          </div>
        </section>
        <section>
          <h2 className="mb-3 font-mono text-xs uppercase tracking-wide text-[var(--text-secondary)]">
            Cost projection
          </h2>
          <div className="rounded-md border border-[var(--border)] bg-[var(--bg-surface)] p-6">
            <div className="text-[10px] uppercase tracking-wide text-[var(--text-tertiary)]">
              At current daily rate
            </div>
            <div className="mt-1 font-mono text-3xl font-semibold text-[var(--text-primary)]">
              ~${monthlyProjection.toFixed(2)}/month
            </div>
            <div className="mt-2 text-xs text-[var(--text-tertiary)]">
              Based on today's spend of ${dailyRate.toFixed(4)}. Caps reset at midnight UTC.
            </div>
          </div>
        </section>
      </div>
    </PageContainer>
  );
}
