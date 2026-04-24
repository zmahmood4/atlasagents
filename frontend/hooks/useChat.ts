"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { getSupabase } from "@/lib/supabase";
import type { ChatStreamEvent, ConversationMessage } from "@/lib/types";

export interface UIChatMessage {
  id: string;
  role: "owner" | "agent";
  content: string;
  toolCalls?: { tool: string; summary: string }[];
  timestamp: string;
  streaming?: boolean;
}

export function useChat(agentName: string) {
  const [messages, setMessages] = useState<UIChatMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Load history on mount and when agent changes
  useEffect(() => {
    setLoaded(false);
    setMessages([]);
    api
      .getChatHistory(agentName, 60)
      .then(({ messages: rows }) => {
        setMessages(
          rows.map((r) => ({
            id: r.id,
            role: r.role === "owner" ? "owner" : "agent",
            content: r.content,
            toolCalls: r.metadata?.tool_calls?.map((t) => ({
              tool: t.tool,
              summary: JSON.stringify(t.input).slice(0, 80),
            })),
            timestamp: r.created_at,
          })),
        );
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, [agentName]);

  // Realtime: append new messages from other sources (agent-initiated, etc.)
  useEffect(() => {
    const sb = getSupabase();
    if (!sb) return;
    const ch = sb
      .channel(`chat-${agentName}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "conversations",
          filter: `agent_name=eq.${agentName}`,
        },
        (payload) => {
          const r = payload.new as ConversationMessage;
          setMessages((prev) => {
            // Avoid duplicating the message we just streamed in
            if (prev.some((m) => m.id === r.id)) return prev;
            return [
              ...prev,
              {
                id: r.id,
                role: r.role === "owner" ? "owner" : "agent",
                content: r.content,
                timestamp: r.created_at,
              },
            ];
          });
        },
      )
      .subscribe();
    return () => { sb.removeChannel(ch); };
  }, [agentName]);

  const sendMessage = useCallback(
    async (message: string) => {
      if (streaming || !message.trim()) return;
      setError(null);
      setStreaming(true);

      const ownerMsg: UIChatMessage = {
        id: `local-${Date.now()}`,
        role: "owner",
        content: message,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, ownerMsg]);

      // Streaming agent reply placeholder
      const streamId = `stream-${Date.now()}`;
      let agentText = "";
      const toolCallsSeen: { tool: string; summary: string }[] = [];

      setMessages((prev) => [
        ...prev,
        { id: streamId, role: "agent", content: "", streaming: true, timestamp: new Date().toISOString() },
      ]);

      try {
        const response = await api.chatStream(agentName, message);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const reader = response.body?.getReader();
        if (!reader) throw new Error("no response body");

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const raw = line.slice(6).trim();
            if (!raw) continue;
            try {
              const event: ChatStreamEvent = JSON.parse(raw);
              if (event.type === "text") {
                agentText += event.content;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === streamId ? { ...m, content: agentText } : m,
                  ),
                );
              } else if (event.type === "tool_use") {
                toolCallsSeen.push({ tool: event.tool, summary: event.summary });
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === streamId ? { ...m, toolCalls: [...toolCallsSeen] } : m,
                  ),
                );
              } else if (event.type === "done") {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === streamId ? { ...m, streaming: false } : m,
                  ),
                );
              } else if (event.type === "error") {
                throw new Error(event.message);
              }
            } catch {}
          }
        }
      } catch (e) {
        setError((e as Error).message);
        setMessages((prev) => prev.filter((m) => m.id !== streamId));
      } finally {
        setStreaming(false);
        // Finalise streaming placeholder
        setMessages((prev) =>
          prev.map((m) => (m.id === streamId ? { ...m, streaming: false } : m)),
        );
      }
    },
    [agentName, streaming],
  );

  const clearHistory = useCallback(async () => {
    await api.clearChat(agentName);
    setMessages([]);
  }, [agentName]);

  return { messages, streaming, error, loaded, sendMessage, clearHistory };
}
