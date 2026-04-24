"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { BusinessMetric, MetricsSummary } from "@/lib/types";

export function useMetricsSummary(intervalMs = 30_000) {
  const [data, setData] = useState<MetricsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setData(await api.metricsSummary());
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, intervalMs);
    return () => clearInterval(id);
  }, [refresh, intervalMs]);

  return { data, loading, error, refresh };
}

export function useMetricSeries(metric: string | undefined, days = 30) {
  const [metrics, setMetrics] = useState<BusinessMetric[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!metric) {
      setMetrics([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    api
      .listMetrics({ metric, days })
      .then((r) => {
        if (!cancelled) setMetrics(r.metrics);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [metric, days]);

  return { metrics, loading };
}
