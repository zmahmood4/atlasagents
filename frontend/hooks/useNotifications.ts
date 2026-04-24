"use client";

import { useCallback, useEffect, useRef } from "react";
import { getSupabase } from "@/lib/supabase";

interface NotifyPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  urgent?: boolean;
}

function sendViaServiceWorker(payload: NotifyPayload) {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.ready.then((reg) => {
      // Message to SW — it shows the notification even when tab is backgrounded
      reg.active?.postMessage({ type: "NOTIFY", ...payload });
    }).catch(() => {});
  }
}

async function ensurePermission(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}

export function useNotifications() {
  const grantedRef = useRef(false);

  useEffect(() => {
    ensurePermission().then((ok) => { grantedRef.current = ok; });
  }, []);

  const notify = useCallback((payload: NotifyPayload) => {
    if (!grantedRef.current) return;
    sendViaServiceWorker(payload);
  }, []);

  return { notify };
}

// Subscribes to Supabase realtime and fires browser notifications for
// new approvals and agent run-end summaries.
export function useAgentNotifications() {
  const { notify } = useNotifications();

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) return;

    const approvals = sb
      .channel("notify-approvals")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "pending_approvals" },
        (payload) => {
          const row = payload.new as { agent_name: string; action_type: string; title: string };
          notify({
            title: `ATLAS · ${row.action_type} needs approval`,
            body: `${row.agent_name}: ${row.title}`,
            url: "/approvals",
            tag: "approval-" + row.action_type,
            urgent: row.action_type === "PIVOT" || row.action_type === "DEPLOY",
          });
        },
      )
      .subscribe();

    const runEnds = sb
      .channel("notify-run-ends")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "agent_actions" },
        (payload) => {
          const row = payload.new as { agent_name: string; action_type: string; summary: string; importance: string };
          if (row.action_type === "run_end" && row.importance === "critical") {
            notify({
              title: `ATLAS · ${row.agent_name} flagged a critical action`,
              body: row.summary.slice(0, 120),
              url: "/",
              tag: "critical-" + row.agent_name,
              urgent: true,
            });
          }
        },
      )
      .subscribe();

    return () => {
      sb.removeChannel(approvals);
      sb.removeChannel(runEnds);
    };
  }, [notify]);
}
