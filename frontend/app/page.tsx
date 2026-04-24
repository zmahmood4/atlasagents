"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Bell, ChevronDown, ChevronUp, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { AtlasOrb } from "@/components/atlas/AtlasOrb";
import { AgentGrid3D } from "@/components/atlas/AgentGrid3D";
import { useAgents } from "@/hooks/useAgents";
import { useApprovals } from "@/hooks/useApprovals";
import { useMetricsSummary } from "@/hooks/useMetrics";
import { api } from "@/lib/api";
import { cn, formatUsd } from "@/lib/utils";

const PROMPTS = [
  "Build me a landing page for the Competitor Radar product",
  "What's the status of the current sprint?",
  "Generate a React component for a pricing section",
  "Write cold email copy for UK SaaS founders",
  "Show me the GTM plan for this week",
  "What should the team be working on today?",
];

interface Message {
  id: string;
  from: "me" | "atlas";
  agent?: string;
  text: string;
  streaming?: boolean;
}

export default function Atlas() {
  const { agents } = useAgents();
  const { approvals } = useApprovals("pending");
  const { data: summary } = useMetricsSummary(10000);
  const router = useRouter();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [showAgents, setShowAgents] = useState(false);
  const [promptIdx, setPromptIdx] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  const activeCount = agents.filter(a => a.status === "active").length;
  const pending     = approvals.length;
  const targetAgent = selectedAgent ?? "ceo";

  useEffect(() => {
    const id = setInterval(() => setPromptIdx(i => (i + 1) % PROMPTS.length), 3800);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const send = async (msg?: string) => {
    const text = msg ?? input.trim();
    if (!text || streaming) return;
    setInput("");

    const userMsg: Message = { id: `u-${Date.now()}`, from: "me", text };
    setMessages(prev => [...prev, userMsg]);

    const streamId = `a-${Date.now()}`;
    setMessages(prev => [...prev, { id: streamId, from: "atlas", agent: targetAgent, text: "", streaming: true }]);
    setStreaming(true);

    let full = "";
    try {
      const res = await api.chatStream(targetAgent, text);
      if (!res.ok) throw new Error();
      const reader = res.body?.getReader();
      if (!reader) throw new Error();
      const dec = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n"); buf = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const ev = JSON.parse(line.slice(6));
            if (ev.type === "text") {
              full += ev.content;
              setMessages(prev => prev.map(m => m.id === streamId ? { ...m, text: full } : m));
            }
          } catch {}
        }
      }
      if (!full) full = "Command received and being processed by the team.";
    } catch {
      full = "ATLAS is processing your request. Check the approvals tab if action is needed.";
    }

    setMessages(prev => prev.map(m => m.id === streamId ? { ...m, text: full, streaming: false } : m));
    setStreaming(false);
    inputRef.current?.focus();
  };

  const handleAgentSelect = (name: string) => {
    setSelectedAgent(prev => prev === name ? null : name);
    setShowAgents(false);
    inputRef.current?.focus();
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[var(--bg-void)]"
      style={{ paddingTop: "max(0px,var(--safe-top))" }}>

      {/* ── TOP BAR ─────────────────────────────────────────────── */}
      <header className="glass-darker z-20 flex items-center justify-between px-4 py-2.5 shrink-0"
        style={{ paddingTop: "max(10px,var(--safe-top))" }}>
        <span className="atlas-brand font-black tracking-[0.2em]" style={{ fontSize: "0.9rem" }}>
          ATLAS
        </span>
        <div className="flex items-center gap-3 text-[11px]">
          <span className="data-mono flex items-center gap-1.5 text-[var(--text-secondary)]">
            {activeCount > 0
              ? <><span className="status-dot-pulse h-1.5 w-1.5 rounded-full bg-[var(--green)]" style={{ color: "var(--green)" }} />{activeCount} active</>
              : <span className="text-[var(--text-tertiary)]">idle</span>}
          </span>
          <span className="data-mono text-[var(--text-secondary)]">{formatUsd(summary?.totals.cost_today ?? 0)}</span>
          {pending > 0 && (
            <button onClick={() => router.push("/approvals")}
              className="relative flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--amber)]/40 bg-[var(--bg-surface)]"
              style={{ color: "var(--amber)" }}>
              <Bell className="h-3.5 w-3.5" />
              <span className="approval-bounce absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--amber)] font-mono text-[8px] font-bold text-black">{pending}</span>
            </button>
          )}
        </div>
      </header>

      {/* ── MAIN AREA ────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden">

        {/* Empty state — ATLAS orb + intro */}
        <AnimatePresence>
          {isEmpty && (
            <motion.div key="intro" initial={{ opacity: 1 }} exit={{ opacity: 0, y: -20 }}
              className="flex flex-1 flex-col items-center justify-center px-4 pb-4">
              <AtlasOrb activeCount={activeCount} size={84} />
              <h1 className="atlas-brand mt-4 text-center font-black" style={{ fontSize: "clamp(1.4rem,5vw,2.4rem)" }}>
                How can I help?
              </h1>
              <p className="mt-1 font-mono text-[11px] tracking-[0.2em] text-[var(--text-tertiary)] text-center">
                {agents.length} autonomous AI agents · UK · Haiku 4.5
              </p>

              {/* Quick prompt chips */}
              <div className="mt-6 flex flex-wrap justify-center gap-2 max-w-lg">
                {PROMPTS.slice(0, 4).map((p, i) => (
                  <motion.button key={p} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06 }}
                    onClick={() => send(p)}
                    className="rounded-full border border-[var(--border-glow)] bg-[var(--bg-surface)] px-3 py-1.5 font-mono text-[11px] text-[var(--text-secondary)] transition hover:border-[var(--border-live)] hover:text-[var(--cyan)]">
                    {p}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Chat messages */}
        {!isEmpty && (
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            <AnimatePresence initial={false}>
              {messages.map(m => (
                <motion.div key={m.id}
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className={cn("flex gap-3", m.from === "me" ? "justify-end" : "justify-start")}>
                  {m.from === "atlas" && (
                    <div className="h-7 w-7 shrink-0 flex items-center justify-center rounded-full mt-1"
                      style={{ background: "radial-gradient(circle,rgba(0,212,255,0.15),rgba(26,111,255,0.05))", border: "1px solid rgba(0,212,255,0.25)" }}>
                      <svg viewBox="0 0 100 100" className="h-4 w-4">
                        <line x1="26" y1="76" x2="44" y2="24" stroke="#00d4ff" strokeWidth="8" strokeLinecap="round"/>
                        <line x1="74" y1="76" x2="56" y2="24" stroke="#00d4ff" strokeWidth="8" strokeLinecap="round"/>
                        <line x1="34" y1="57" x2="66" y2="57" stroke="#4d8ff5" strokeWidth="5" strokeLinecap="round"/>
                      </svg>
                    </div>
                  )}
                  <div className={cn("max-w-[85%] rounded-2xl px-4 py-3 text-sm",
                    m.from === "me"
                      ? "rounded-br-sm bg-[var(--blue)] text-white"
                      : "rounded-bl-sm border border-[var(--border-glow)] bg-[var(--bg-surface)] text-[var(--text-primary)]")}>
                    {m.from === "atlas" && m.agent && m.agent !== "ceo" && (
                      <div className="mb-1 font-mono text-[9px] uppercase tracking-widest" style={{ color: "var(--cyan)", opacity: 0.7 }}>
                        {m.agent}
                      </div>
                    )}
                    {m.from === "me" ? (
                      <span>{m.text}</span>
                    ) : m.streaming && !m.text ? (
                      <span className="flex items-center gap-2 text-[var(--text-secondary)]">
                        <span className="animate-pulse font-mono text-[var(--cyan)]">▋</span>
                        thinking…
                      </span>
                    ) : (
                      <ReactMarkdown remarkPlugins={[remarkGfm]}
                        components={{
                          p: ({children}) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
                          ul: ({children}) => <ul className="mb-2 list-disc pl-4 space-y-0.5">{children}</ul>,
                          ol: ({children}) => <ol className="mb-2 list-decimal pl-4 space-y-0.5">{children}</ol>,
                          li: ({children}) => <li className="text-sm">{children}</li>,
                          strong: ({children}) => <strong className="font-semibold text-white">{children}</strong>,
                          code: ({children}) => <code className="rounded bg-black/40 px-1 py-0.5 font-mono text-[11px] text-[var(--cyan)]">{children}</code>,
                          pre: ({children}) => <pre className="mt-2 mb-2 overflow-x-auto rounded-lg border border-[var(--border-live)] bg-[var(--bg-void)] p-3 font-mono text-xs text-[var(--text-primary)] leading-relaxed">{children}</pre>,
                          h1: ({children}) => <h1 className="text-base font-bold mb-1">{children}</h1>,
                          h2: ({children}) => <h2 className="text-sm font-semibold mb-1 text-[var(--text-secondary)]">{children}</h2>,
                        }}>
                        {m.text}
                      </ReactMarkdown>
                    )}
                    {m.streaming && m.text && <span className="font-mono text-[var(--cyan)] animate-pulse">▋</span>}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            <div ref={bottomRef} />
          </div>
        )}

        {/* Agent selector + 3D grid */}
        <AnimatePresence>
          {showAgents && (
            <motion.div key="grid"
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="glass-darker border-t border-[var(--border-glow)] overflow-y-auto px-4 py-4"
              style={{ maxHeight: "45vh" }}>
              <div className="mb-3 flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--text-tertiary)]">
                  {selectedAgent ? `talking to: ${selectedAgent}` : "tap an agent to talk directly"}
                </span>
                {selectedAgent && (
                  <button onClick={() => setSelectedAgent(null)}
                    className="font-mono text-[10px] text-[var(--text-tertiary)] hover:text-[var(--cyan)]">
                    back to ATLAS ×
                  </button>
                )}
              </div>
              <AgentGrid3D agents={agents} selectedAgent={selectedAgent} onSelect={handleAgentSelect} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── INPUT BAR ──────────────────────────────────────────── */}
        <div className="glass-darker shrink-0 border-t border-[var(--border-glow)] px-4 pt-3"
          style={{ paddingBottom: `calc(max(var(--safe-bottom),0px) + 12px)` }}>

          {/* Agent toggle */}
          <div className="mb-2 flex items-center gap-2">
            <button onClick={() => setShowAgents(v => !v)}
              className={cn("flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] transition",
                showAgents ? "border-[var(--cyan)]/40 bg-[var(--bg-elevated)] text-[var(--cyan)]" : "border-[var(--border-glow)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:border-[var(--border-live)]")}>
              {showAgents ? <ChevronDown className="h-3 w-3"/> : <ChevronUp className="h-3 w-3"/>}
              {selectedAgent ? <><span className="text-[var(--cyan)]">{selectedAgent}</span></> : "ATLAS"}
            </button>
            {selectedAgent && (
              <span className="font-mono text-[9px] text-[var(--text-tertiary)]">
                direct line · tap ATLAS to return to full team
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && send()}
                disabled={streaming}
                placeholder={streaming ? "…processing" : PROMPTS[promptIdx]}
                className="w-full rounded-xl border border-[var(--border-glow)] bg-[var(--bg-surface)] px-4 py-2.5 font-mono text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none transition focus:border-[var(--cyan)]/50 disabled:opacity-50"
                style={{ caretColor: "var(--cyan)" }}
              />
            </div>
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => send()} disabled={streaming || !input.trim()}
              className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition",
                input.trim() && !streaming ? "bg-[var(--cyan)] text-[var(--bg-void)]" : "bg-[var(--bg-elevated)] text-[var(--text-tertiary)]")}
              style={input.trim() && !streaming ? { boxShadow: "0 0 18px rgba(0,212,255,0.5)" } : undefined}>
              {streaming
                ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--bg-void)]/40 border-t-[var(--bg-void)]"/>
                : <ArrowRight className="h-4 w-4"/>}
            </motion.button>
          </div>
          <p className="mt-1.5 text-center font-mono text-[9px] text-[var(--text-dim)]">
            Enter to send · tap agent icon to direct a specialist
          </p>
        </div>
      </div>
    </div>
  );
}
