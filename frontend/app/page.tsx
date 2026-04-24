"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Bell, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AgentAvatar } from "@/components/ui/Avatar";
import { useAgents } from "@/hooks/useAgents";
import { useApprovals } from "@/hooks/useApprovals";
import { useMetricsSummary } from "@/hooks/useMetrics";
import { api } from "@/lib/api";
import { cn, DEPARTMENT_COLOR, formatUsd } from "@/lib/utils";
import type { Agent, Department } from "@/lib/types";

const DEPT_ORDER: Department[] = ["command","product","engineering","gtm","ops"];
const SUGGESTIONS = [
  "Build me a landing page for the Competitor Radar product",
  "What is the status of the current sprint?",
  "Write a cold outreach email sequence for UK founders",
  "Generate a PRD for a Slack standup bot",
  "What should we prioritise this week?",
  "Do a competitive analysis on Crayon and Klue",
];

function AtlasOrb({ activeCount }: { activeCount: number }) {
  return (
    <div className="relative mx-auto mb-6 flex h-28 w-28 items-center justify-center sm:h-32 sm:w-32">
      {[56,72,88].map((r,i) => (
        <div key={i} className={cn("absolute rounded-full border opacity-20", i===0?"orbit-ring-1":i===1?"orbit-ring-2":"orbit-ring-3")}
          style={{ width:r, height:r, borderColor:i===0?"var(--cyan)":i===1?"var(--blue)":"var(--purple)", borderStyle:i===1?"dashed":"solid" }}
        />
      ))}
      <div className="scanline relative z-10 flex h-[72px] w-[72px] items-center justify-center rounded-full"
        style={{ background:"radial-gradient(circle at 30% 30%,rgba(0,212,255,0.2),rgba(26,111,255,0.05))", border:"1px solid rgba(0,212,255,0.3)", boxShadow:"0 0 40px -8px rgba(0,212,255,0.5),inset 0 0 30px -10px rgba(0,212,255,0.1)" }}>
        <svg viewBox="0 0 100 100" className="h-10 w-10">
          <defs><filter id="og"><feGaussianBlur stdDeviation="2.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
          <line x1="26" y1="76" x2="44" y2="24" stroke="#00d4ff" strokeWidth="6" strokeLinecap="round" filter="url(#og)"/>
          <line x1="74" y1="76" x2="56" y2="24" stroke="#00d4ff" strokeWidth="6" strokeLinecap="round" filter="url(#og)"/>
          <line x1="34" y1="57" x2="66" y2="57" stroke="#4d8ff5" strokeWidth="4" strokeLinecap="round"/>
          <circle cx="50" cy="23" r="5" fill="#7c3aed" filter="url(#og)"/>
          <circle cx="50" cy="23" r="2.5" fill="#c4b5fd"/>
          <circle cx="26" cy="76" r="3.5" fill="#1a6fff"/>
          <circle cx="74" cy="76" r="3.5" fill="#1a6fff"/>
        </svg>
      </div>
      {activeCount>0 && <span className="status-dot-pulse absolute bottom-2 right-2 z-20 h-3 w-3 rounded-full border-2 border-[var(--bg-void)] bg-[var(--green)]" style={{color:"var(--green)"}}/>}
    </div>
  );
}

function CommandInput({ onSubmit }: { onSubmit:(msg:string)=>void }) {
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);
  const [si, setSi] = useState(0);
  useEffect(()=>{ const id=setInterval(()=>setSi(i=>(i+1)%SUGGESTIONS.length),3500); return()=>clearInterval(id); },[]);
  const submit = () => { if(!value.trim()) return; onSubmit(value.trim()); setValue(""); };
  return (
    <div className="relative mx-auto w-full max-w-2xl">
      <div className={cn("relative flex items-center gap-3 rounded-2xl border px-4 py-3.5 transition-all", focused?"border-[var(--cyan)]/40 bg-[var(--bg-surface)]":"border-[var(--border-glow)] bg-[var(--bg-surface)]")}
        style={focused?{boxShadow:"0 0 30px -8px rgba(0,212,255,0.25)"}:undefined}>
        <div className="h-2 w-2 shrink-0 rounded-full bg-[var(--cyan)]" style={{boxShadow:"0 0 6px var(--cyan)"}}/>
        <input value={value} onChange={e=>setValue(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()}
          onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)}
          className="flex-1 bg-transparent font-mono text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)]"
          placeholder={SUGGESTIONS[si]}/>
        <motion.button whileTap={{scale:0.9}} onClick={submit} disabled={!value.trim()}
          className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition", value.trim()?"bg-[var(--cyan)] text-[var(--bg-void)]":"bg-[var(--bg-elevated)] text-[var(--text-tertiary)]")}
          style={value.trim()?{boxShadow:"0 0 16px rgba(0,212,255,0.5)"}:undefined}>
          <ArrowRight className="h-3.5 w-3.5"/>
        </motion.button>
      </div>
      <p className="mt-2 text-center font-mono text-[10px] text-[var(--text-tertiary)]">
        Commands route to CEO · CEO cascades to the right agents · approve outputs in the Approvals tab
      </p>
    </div>
  );
}

function AgentTile({ agent, onClick }: { agent:Agent; onClick:()=>void }) {
  const isActive = agent.status === "active";
  const isError  = agent.status === "error";
  const color = DEPARTMENT_COLOR[agent.department] ?? "var(--cyan)";
  return (
    <motion.button whileHover={{y:-2,scale:1.04}} whileTap={{scale:0.95}} onClick={onClick}
      className="group relative flex flex-col items-center gap-1.5 rounded-xl p-2.5 text-center"
      style={isActive?{background:`radial-gradient(circle at 50% 0%,${color}15,transparent 70%)`}:undefined}>
      <div className={cn("relative",isActive?"agent-active-glow":"")} style={{"--agent-color":color} as React.CSSProperties}>
        <AgentAvatar name={agent.name} department={agent.department} size={36}/>
        {isActive && <span className="status-dot-pulse absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-[var(--bg-void)]" style={{background:color,color}}/>}
        {isError  && <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-[var(--bg-void)] bg-[var(--red)]"/>}
      </div>
      <div className="font-mono text-[10px] font-semibold leading-tight transition" style={{color:isActive?color:"var(--text-secondary)"}}>
        {agent.name}
      </div>
      <div className="text-[8px] leading-none text-[var(--text-tertiary)]">{agent.role.split("—")[0].split("·")[0].trim().split(" ").slice(0,2).join(" ")}</div>
    </motion.button>
  );
}

export default function CommandCenter() {
  const { agents } = useAgents();
  const { approvals } = useApprovals("pending");
  const { data: summary } = useMetricsSummary(8000);
  const router = useRouter();
  const [sending, setSending] = useState(false);
  const [streamText, setStreamText] = useState("");
  const [showResponse, setShowResponse] = useState(false);

  const activeCount = agents.filter(a=>a.status==="active").length;
  const pending = approvals.length;
  const sorted = [...agents].sort((a,b)=>{
    const di=DEPT_ORDER.indexOf(a.department)-DEPT_ORDER.indexOf(b.department);
    return di!==0?di:a.name.localeCompare(b.name);
  });

  const handleCommand = async (msg: string) => {
    setSending(true); setStreamText(""); setShowResponse(true);
    try {
      const res = await api.chatStream("ceo", msg);
      if(!res.ok) throw new Error();
      const reader = res.body?.getReader();
      if(!reader) throw new Error();
      const dec = new TextDecoder();
      let buf="", full="";
      while(true) {
        const {done,value} = await reader.read();
        if(done) break;
        buf += dec.decode(value,{stream:true});
        const lines = buf.split("\n"); buf = lines.pop()||"";
        for(const line of lines) {
          if(!line.startsWith("data: ")) continue;
          try {
            const ev=JSON.parse(line.slice(6));
            if(ev.type==="text"){ full+=ev.content; setStreamText(full); }
          } catch {}
        }
      }
      if(!full) setStreamText("Command received. CEO will cascade to the team on the next tick.");
    } catch {
      setStreamText("Command received. CEO will process on the next tick.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[var(--bg-void)]"
      style={{paddingTop:"max(0px,var(--safe-top))",paddingBottom:"calc(var(--bottom-nav-h) + max(var(--safe-bottom),0px) + 8px)"}}>
      {/* Minimal topbar */}
      <header className="glass-darker sticky top-0 z-10 flex items-center justify-between px-4 py-2"
        style={{paddingTop:"max(10px,var(--safe-top))"}}>
        <span className="atlas-brand font-black tracking-[0.2em]" style={{fontSize:"0.85rem"}}>ATLAS</span>
        <div className="flex items-center gap-3">
          <span className="data-mono text-[11px] text-[var(--text-secondary)] flex items-center gap-1.5">
            {activeCount>0?<><span className="status-dot-pulse h-1.5 w-1.5 rounded-full bg-[var(--green)]" style={{color:"var(--green)"}}/>{activeCount} active</>:<span className="text-[var(--text-tertiary)]">idle</span>}
          </span>
          <span className="data-mono text-[11px] text-[var(--text-secondary)]">{formatUsd(summary?.totals.cost_today??0)}</span>
          {pending>0&&(
            <button onClick={()=>router.push("/approvals")} className="relative h-7 w-7 flex items-center justify-center rounded-lg border border-[var(--amber)]/30 bg-[var(--bg-surface)]" style={{color:"var(--amber)"}}>
              <Bell className="h-3.5 w-3.5"/>
              <span className="approval-bounce absolute -right-1 -top-1 h-4 w-4 flex items-center justify-center rounded-full bg-[var(--amber)] font-mono text-[8px] font-bold text-black">{pending}</span>
            </button>
          )}
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center px-4 py-6">
        <AtlasOrb activeCount={activeCount}/>

        <div className="mb-1 text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--text-tertiary)]">autonomous ai team · {agents.length} agents · uk</p>
          <h1 className="atlas-brand mt-1 font-black" style={{fontSize:"clamp(1.3rem,4vw,2.2rem)"}}>How can I help?</h1>
        </div>

        <div className="w-full max-w-2xl mt-4">
          <CommandInput onSubmit={handleCommand}/>
        </div>

        {/* Response panel */}
        <AnimatePresence>
          {showResponse&&(
            <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}}
              className="mx-auto mt-3 w-full max-w-2xl overflow-hidden rounded-2xl border border-[var(--border-live)] bg-[var(--bg-surface)]"
              style={{boxShadow:"0 0 30px -10px rgba(0,212,255,0.25)"}}>
              <div className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-2">
                <span className={cn("h-2 w-2 rounded-full",sending?"status-dot-pulse bg-[var(--cyan)]":"bg-[var(--green)]")} style={{color:sending?"var(--cyan)":"var(--green)"}}/>
                <span className="font-mono text-[11px] text-[var(--text-secondary)]">{sending?"ceo thinking…":"ceo"}</span>
                {!sending&&<button onClick={()=>{setShowResponse(false);setStreamText("");}} className="ml-auto text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] text-lg leading-none">×</button>}
              </div>
              <div className="px-4 py-3 max-h-64 overflow-y-auto">
                {sending&&!streamText?<span className="font-mono text-xs text-[var(--text-secondary)] animate-pulse">▋ routing command to team…</span>
                  :<pre className="whitespace-pre-wrap font-sans text-sm text-[var(--text-primary)] leading-relaxed">{streamText}</pre>}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Agent team grid */}
        <section className="mt-8 w-full max-w-3xl">
          <div className="mb-3 flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--text-tertiary)]">your ai team — tap to chat</span>
            <button onClick={()=>router.push("/agents")} className="flex items-center gap-1 font-mono text-[10px] text-[var(--text-tertiary)] hover:text-[var(--cyan)] transition">
              board view <ChevronRight className="h-3 w-3"/>
            </button>
          </div>
          {DEPT_ORDER.map(dept=>{
            const deptAgents = sorted.filter(a=>a.department===dept);
            if(!deptAgents.length) return null;
            const dc=DEPARTMENT_COLOR[dept];
            const anyActive=deptAgents.some(a=>a.status==="active");
            return (
              <div key={dept} className="mb-5">
                <div className="mb-2 flex items-center gap-2">
                  <span className={cn("h-1.5 w-1.5 rounded-full",anyActive?"status-dot-pulse":"")} style={{background:dc,color:dc}}/>
                  <span className="font-mono text-[9px] uppercase tracking-[0.25em]" style={{color:dc}}>{dept}</span>
                </div>
                <div className="grid grid-cols-5 gap-1 sm:grid-cols-6 md:grid-cols-7 lg:grid-cols-8">
                  {deptAgents.map(a=>(
                    <AgentTile key={a.id} agent={a} onClick={()=>router.push(`/chat?agent=${a.name}`)}/>
                  ))}
                </div>
              </div>
            );
          })}
        </section>

        {/* Quick links */}
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          {[{label:"Work Product",href:"/work"},{label:"Approvals",href:"/approvals",badge:pending},{label:"Experiments",href:"/experiments"},{label:"Financials",href:"/financials"}].map(l=>(
            <button key={l.href} onClick={()=>router.push(l.href)}
              className="relative flex items-center gap-1.5 rounded-full border border-[var(--border-glow)] bg-[var(--bg-surface)] px-3 py-1.5 font-mono text-[11px] text-[var(--text-secondary)] transition hover:border-[var(--border-live)] hover:text-[var(--cyan)]">
              {l.label}
              {l.badge?<span className="flex h-4 w-4 items-center justify-center rounded-full bg-[var(--amber)] font-bold text-[8px] text-black">{l.badge}</span>:null}
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}
