"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowUp, Bot, RotateCcw, Trash2, User, Wrench, Zap } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { AgentAvatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { useChat, type UIChatMessage } from "@/hooks/useChat";
import { cn } from "@/lib/utils";
import type { Agent } from "@/lib/types";

const QUICK_PROMPTS_BY_AGENT: Record<string, string[]> = {
  ceo: [
    "What's our current top priority?",
    "Which experiment should we double down on?",
    "What's blocked right now?",
    "Give me a 60-second company status.",
    "What should the team be doing this week?",
  ],
  vp_product: [
    "What's the current roadmap?",
    "Which experiment is closest to revenue?",
    "Score our 3 experiments for me.",
  ],
  vp_engineering: [
    "What's in the dev backlog?",
    "What tickets are assigned right now?",
    "Is anything blocked?",
  ],
  research: [
    "What's the latest market intel?",
    "Find me a new experiment idea.",
    "Who are our main competitors right now?",
  ],
  finance: [
    "What's today's AI spend in GBP?",
    "What are our unit economics on Competitor Radar?",
    "What's the path to £1k MRR?",
  ],
  analytics: [
    "What metrics are moving?",
    "Any anomalies I should know about?",
    "What's our funnel look like?",
  ],
};

const DEFAULT_QUICK_PROMPTS = [
  "What are you working on?",
  "What do you need from me?",
  "Give me a status update.",
];

export function ChatWindow({
  agent,
  onBack,
}: {
  agent: Agent;
  onBack?: () => void;
}) {
  const { messages, streaming, error, loaded, sendMessage, clearHistory } = useChat(agent.name);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const quickPrompts = QUICK_PROMPTS_BY_AGENT[agent.name] ?? DEFAULT_QUICK_PROMPTS;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, streaming]);

  const send = async (msg?: string) => {
    const text = msg ?? input.trim();
    if (!text) return;
    setInput("");
    await sendMessage(text);
    inputRef.current?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="shrink-0 border-b border-[var(--border)] bg-[var(--bg-base)] px-4 py-3">
        <div className="flex items-center gap-3">
          {onBack ? (
            <button onClick={onBack} className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] p-1 rounded">
              ←
            </button>
          ) : null}
          <AgentAvatar name={agent.name} department={agent.department} size={32} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-display text-sm font-semibold text-[var(--text-primary)]">{agent.name}</span>
              <Badge
                tone={agent.status === "active" ? "emerald" : "default"}
              >
                {agent.status}
              </Badge>
            </div>
            <div className="text-[10px] text-[var(--text-tertiary)]">{agent.role}</div>
          </div>
          <button
            onClick={clearHistory}
            title="Clear conversation"
            className="rounded-lg p-1.5 text-[var(--text-tertiary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {!loaded ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--accent-blue)] border-t-transparent" />
          </div>
        ) : messages.length === 0 ? (
          <EmptyState agentName={agent.name} />
        ) : (
          <AnimatePresence initial={false}>
            {messages.map((m) => (
              <ChatBubble key={m.id} message={m} agentName={agent.name} agentDept={agent.department} />
            ))}
          </AnimatePresence>
        )}
        {error ? (
          <div className="rounded-lg border border-[var(--accent-red)]/30 bg-[color:color-mix(in_oklab,var(--accent-red)_8%,transparent)] px-3 py-2 text-xs text-[var(--accent-red)]">
            {error}
          </div>
        ) : null}
        <div ref={bottomRef} />
      </div>

      {/* Quick prompts — shown when no messages yet */}
      {loaded && messages.length === 0 ? (
        <div className="shrink-0 px-4 pb-2">
          <div className="flex flex-wrap gap-2">
            {quickPrompts.map((p) => (
              <button
                key={p}
                onClick={() => send(p)}
                className="rounded-full border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-1 text-[11px] text-[var(--text-secondary)] transition hover:border-[var(--accent-blue)] hover:text-[var(--text-primary)]"
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {/* Input */}
      <div className="shrink-0 border-t border-[var(--border)] bg-[var(--bg-base)] px-4 py-3">
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              disabled={streaming}
              placeholder={`Message ${agent.name}…`}
              className="w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-2.5 pr-12 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent-blue)] transition disabled:opacity-50"
              style={{ maxHeight: 140, overflowY: "auto" }}
              onInput={(e) => {
                const el = e.currentTarget;
                el.style.height = "auto";
                el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
              }}
            />
          </div>
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => send()}
            disabled={streaming || !input.trim()}
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition",
              input.trim() && !streaming
                ? "bg-[var(--accent-blue)] text-white shadow-lg shadow-[var(--accent-blue)]/30 hover:bg-[var(--accent-blue-bright)]"
                : "bg-[var(--bg-elevated)] text-[var(--text-tertiary)]",
            )}
          >
            {streaming ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            ) : (
              <ArrowUp className="h-4 w-4" />
            )}
          </motion.button>
        </div>
        <div className="mt-1.5 flex items-center justify-between px-1">
          <span className="text-[9px] text-[var(--text-tertiary)]">Enter to send · Shift+Enter for newline</span>
          <span className="text-[9px] text-[var(--text-tertiary)]">Haiku 4.5 · chat mode</span>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ agentName }: { agentName: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-[var(--accent-blue)]/30 bg-[var(--accent-blue-dim)]">
        <Bot className="h-7 w-7 text-[var(--accent-blue-bright)]" />
      </div>
      <div>
        <div className="font-display text-sm font-semibold text-[var(--text-primary)]">{agentName}</div>
        <div className="mt-1 text-xs text-[var(--text-tertiary)]">
          {agentName === "ceo"
            ? "Direct line to the CEO. Ask for status, set priorities, issue commands."
            : "Direct line to this agent. Ask for status, give direction, or review their work."}
        </div>
      </div>
    </div>
  );
}

function ChatBubble({
  message,
  agentName,
  agentDept,
}: {
  message: UIChatMessage;
  agentName: string;
  agentDept: string;
}) {
  const isOwner = message.role === "owner";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className={cn("flex items-end gap-2.5", isOwner ? "flex-row-reverse" : "flex-row")}
    >
      {!isOwner ? (
        <AgentAvatar name={agentName} department={agentDept as any} size={28} />
      ) : (
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--bg-elevated)] border border-[var(--border)]">
          <User className="h-3.5 w-3.5 text-[var(--text-secondary)]" />
        </div>
      )}
      <div className={cn("max-w-[78%] space-y-2", isOwner ? "items-end" : "items-start")}>
        {/* Tool calls indicator */}
        {!isOwner && message.toolCalls && message.toolCalls.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {message.toolCalls.map((tc, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] bg-[var(--bg-base)] px-2 py-0.5 font-mono text-[9px] text-[var(--text-tertiary)]"
              >
                <Wrench className="h-2.5 w-2.5" />
                {tc.tool}
              </span>
            ))}
          </div>
        ) : null}

        {/* Main bubble */}
        <div
          className={cn(
            "rounded-2xl px-4 py-2.5 text-sm",
            isOwner
              ? "rounded-br-sm bg-[var(--accent-blue)] text-white"
              : "rounded-bl-sm border border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--text-primary)]",
          )}
        >
          {isOwner ? (
            <span>{message.content}</span>
          ) : message.streaming && !message.content ? (
            <span className="flex items-center gap-2 text-[var(--text-secondary)]">
              <Zap className="h-3.5 w-3.5 animate-pulse text-[var(--accent-blue)]" />
              thinking…
            </span>
          ) : (
            <div className="atlas-prose prose-sm">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                  ul: ({ children }) => <ul className="mb-2 list-disc pl-4 space-y-0.5">{children}</ul>,
                  ol: ({ children }) => <ol className="mb-2 list-decimal pl-4 space-y-0.5">{children}</ol>,
                  li: ({ children }) => <li>{children}</li>,
                  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                  code: ({ children }) => (
                    <code className="rounded bg-black/30 px-1 py-0.5 font-mono text-[11px] text-[var(--accent-blue-bright)]">{children}</code>
                  ),
                  h1: ({ children }) => <h1 className="mb-1 text-base font-bold">{children}</h1>,
                  h2: ({ children }) => <h2 className="mb-1 text-sm font-semibold text-[var(--text-secondary)]">{children}</h2>,
                  h3: ({ children }) => <h3 className="mb-1 text-sm font-medium text-[var(--text-tertiary)]">{children}</h3>,
                }}
              >
                {message.content}
              </ReactMarkdown>
              {message.streaming ? <span className="cursor" /> : null}
            </div>
          )}
        </div>

        <div className={cn("text-[9px] text-[var(--text-tertiary)] px-1", isOwner ? "text-right" : "text-left")}>
          {new Date(message.timestamp).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
        </div>
      </div>
    </motion.div>
  );
}
