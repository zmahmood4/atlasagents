"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { WorkArtifact } from "@/lib/types";

export function useArtifacts(filters: { agent?: string; type?: string } = {}) {
  const [artifacts, setArtifacts] = useState<WorkArtifact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const { artifacts } = await api.listArtifacts({ ...filters, limit: 200 });
      setArtifacts(artifacts);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [filters.agent, filters.type]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { artifacts, loading, error, refresh };
}

export function useArtifact(id: string | null) {
  const [artifact, setArtifact] = useState<WorkArtifact | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!id) {
      setArtifact(null);
      return;
    }
    setLoading(true);
    api
      .getArtifact(id)
      .then(setArtifact)
      .catch(() => setArtifact(null))
      .finally(() => setLoading(false));
  }, [id]);

  return { artifact, loading };
}
