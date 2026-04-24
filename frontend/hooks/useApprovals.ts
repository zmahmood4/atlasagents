"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { getSupabase } from "@/lib/supabase";
import type { ApprovalStatus, PendingApproval } from "@/lib/types";

export function useApprovals(status: ApprovalStatus | "all" = "pending") {
  const [approvals, setApprovals] = useState<PendingApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const { approvals } = await api.listApprovals(status === "all" ? undefined : status);
      setApprovals(approvals);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    refresh();
    const sb = getSupabase();
    if (!sb) return;
    const channel = sb
      .channel("approvals-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pending_approvals" },
        refresh,
      )
      .subscribe();
    return () => {
      sb.removeChannel(channel);
    };
  }, [refresh]);

  return { approvals, loading, error, refresh };
}
