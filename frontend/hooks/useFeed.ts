"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { getSupabase } from "@/lib/supabase";
import type { AgentAction } from "@/lib/types";

export function useFeed(filters: { agent?: string; type?: string; importance?: string } = {}) {
  const [actions, setActions] = useState<AgentAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  const refresh = useCallback(async () => {
    try {
      const { actions } = await api.listActions({ ...filtersRef.current, limit: 120 });
      setActions(actions);
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
      .channel("agent-actions-stream")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "agent_actions" },
        (payload) => {
          const row = payload.new as AgentAction;
          const f = filtersRef.current;
          if (f.agent && row.agent_name !== f.agent) return;
          if (f.type && row.action_type !== f.type) return;
          if (f.importance && row.importance !== f.importance) return;
          setActions((prev) => [row, ...prev].slice(0, 250));
        },
      )
      .subscribe();
    return () => {
      sb.removeChannel(channel);
    };
  }, [refresh, filters.agent, filters.type, filters.importance]);

  return { actions, loading, error, refresh };
}
