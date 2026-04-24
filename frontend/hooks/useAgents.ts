"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { getSupabase } from "@/lib/supabase";
import type { Agent } from "@/lib/types";

export function useAgents() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const { agents } = await api.listAgents();
      setAgents(agents);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const sb = getSupabase();
    if (!sb) return;
    const channel = sb
      .channel("agents-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "agents" },
        refresh,
      )
      .subscribe();
    return () => {
      sb.removeChannel(channel);
    };
  }, [refresh]);

  return { agents, loading, error, refresh };
}
