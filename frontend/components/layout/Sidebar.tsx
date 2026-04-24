"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  BarChart3, Brain, ChevronLeft, ChevronRight,
  FlaskConical, FolderOpen, Grid3x3, Home, Inbox,
  MessageSquare, type LucideIcon, Settings, X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useApprovals } from "@/hooks/useApprovals";
import { cn } from "@/lib/utils";

interface NavItem { href: string; label: string; icon: LucideIcon; }

const NAV: NavItem[] = [
  { href: "/",            label: "Mission Control", icon: Home },
  { href: "/agents",      label: "Agent Board",     icon: Grid3x3 },
  { href: "/work",        label: "Work Product",    icon: FolderOpen },
  { href: "/experiments", label: "Experiments",     icon: FlaskConical },
  { href: "/financials",  label: "Financials",      icon: BarChart3 },
  { href: "/approvals",   label: "Approvals",       icon: Inbox },
  { href: "/knowledge",   label: "Knowledge",       icon: Brain },
  { href: "/chat",         label: "Agent Chat",      icon: MessageSquare },
  { href: "/settings",    label: "Settings",        icon: Settings },
];

function AtlasLogo({ compact }: { compact: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="scanline relative shrink-0">
        <svg width="36" height="36" viewBox="0 0 100 100">
          <defs>
            <linearGradient id="sl-bg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#060a12"/>
              <stop offset="100%" stopColor="#0a1020"/>
            </linearGradient>
            <filter id="sl-glow">
              <feGaussianBlur stdDeviation="2.5" result="b"/>
              <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>
          <rect width="100" height="100" rx="18" fill="url(#sl-bg)"/>
          <rect width="100" height="100" rx="18" fill="none" stroke="#1a2840" strokeWidth="2"/>
          <line x1="26" y1="76" x2="44" y2="24" stroke="#2d6cf0" strokeWidth="5.5" strokeLinecap="round" filter="url(#sl-glow)"/>
          <line x1="74" y1="76" x2="56" y2="24" stroke="#2d6cf0" strokeWidth="5.5" strokeLinecap="round" filter="url(#sl-glow)"/>
          <line x1="34" y1="57" x2="66" y2="57" stroke="#4d8ff5" strokeWidth="3.5" strokeLinecap="round"/>
          <circle cx="50" cy="23" r="5" fill="#7c3aed" filter="url(#sl-glow)"/>
          <circle cx="50" cy="23" r="2.5" fill="#c4b5fd"/>
          <circle cx="26" cy="76" r="3" fill="#2563eb"/>
          <circle cx="74" cy="76" r="3" fill="#2563eb"/>
        </svg>
      </div>
      <AnimatePresence>
        {!compact ? (
          <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}>
            <div className="atlas-brand text-sm font-extrabold tracking-widest">ATLAS</div>
            <div className="text-[9px] text-[var(--text-tertiary)] tracking-[0.18em] uppercase">Autonomous AI · UK</div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function NavLinks({ compact, pending, onNavigate }: { compact: boolean; pending: number; onNavigate?: () => void }) {
  const path = usePathname();
  return (
    <nav className="flex-1 space-y-0.5 px-2 py-2">
      {NAV.map((n) => {
        const active = n.href === "/" ? path === "/" : path.startsWith(n.href);
        const Icon = n.icon;
        const badge = n.href === "/approvals" && pending > 0;
        return (
          <Link
            key={n.href}
            href={n.href}
            onClick={onNavigate}
            className={cn(
              "relative flex items-center gap-3 rounded-lg px-2.5 py-2.5 text-sm transition group overflow-hidden",
              active
                ? "bg-[var(--bg-elevated)] text-[var(--text-primary)]"
                : "text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]",
            )}
          >
            {active ? (
              <>
                <span className="absolute inset-0 rounded-lg border border-[var(--accent-blue)]/20" />
                <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r bg-[var(--accent-blue-bright)]"
                  style={{ boxShadow: "0 0 8px var(--accent-blue-bright)" }} />
              </>
            ) : null}
            <Icon className={cn("h-4 w-4 shrink-0 transition-colors", active ? "text-[var(--accent-blue-bright)]" : "group-hover:text-[var(--accent-blue-bright)]")} />
            <AnimatePresence>
              {!compact ? (
                <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="truncate text-[13px]">
                  {n.label}
                </motion.span>
              ) : null}
            </AnimatePresence>
            {badge && !compact ? (
              <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--accent-amber)] font-mono text-[9px] font-bold text-black px-1">
                {pending}
              </span>
            ) : badge ? (
              <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-[var(--accent-amber)]" />
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

export function Sidebar({ expanded, setExpanded }: { expanded: boolean; setExpanded: (v: boolean) => void }) {
  const { approvals } = useApprovals("pending");
  const pending = approvals.length;
  return (
    <motion.aside
      animate={{ width: expanded ? 224 : 60 }}
      transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
      className="fixed inset-y-0 left-0 z-20 hidden flex-col overflow-hidden border-r border-[var(--border)] bg-[var(--bg-surface)] lg:flex"
      style={{ paddingTop: "var(--safe-top)" }}
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute right-0 top-0 h-full w-px bg-gradient-to-b from-transparent via-[var(--accent-blue)]/15 to-transparent" />
      </div>
      <div className="flex items-center px-3 py-4">
        <AtlasLogo compact={!expanded} />
      </div>
      <NavLinks compact={!expanded} pending={pending} />
      <AnimatePresence>
        {expanded ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="mx-2 mb-2 rounded-lg border border-[var(--border)] bg-[var(--bg-base)] px-3 py-2">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent-emerald)] status-dot-pulse" style={{ color: "var(--accent-emerald)" }} />
              <span className="font-mono text-[9px] text-[var(--text-tertiary)] uppercase tracking-wide">Haiku 4.5 · GBP</span>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
      <button onClick={() => setExpanded(!expanded)}
        className="m-2 flex items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--bg-base)] py-1.5 text-[var(--text-tertiary)] hover:border-[var(--border-active)] hover:text-[var(--text-primary)]">
        {expanded ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>
    </motion.aside>
  );
}

export function MobileSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { approvals } = useApprovals("pending");
  const pending = approvals.length;
  return (
    <AnimatePresence>
      {open ? (
        <motion.div className="fixed inset-0 z-40 flex lg:hidden"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.aside
            initial={{ x: -270 }} animate={{ x: 0 }} exit={{ x: -270 }}
            transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="flex h-full w-[270px] flex-col border-r border-[var(--border)] bg-[var(--bg-surface)]"
            style={{ paddingTop: "var(--safe-top)" }}
          >
            <div className="flex items-center justify-between px-4 py-4">
              <AtlasLogo compact={false} />
              <button onClick={onClose} className="rounded-lg p-1.5 text-[var(--text-tertiary)] hover:bg-[var(--bg-elevated)]">
                <X className="h-4 w-4" />
              </button>
            </div>
            <NavLinks compact={false} pending={pending} onNavigate={onClose} />
          </motion.aside>
          <div className="flex-1 bg-black/60" />
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export function useSidebarState() {
  const [expanded, setExpandedState] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => {
    const v = window.localStorage.getItem("sidebar_expanded");
    if (v !== null) setExpandedState(v === "1");
  }, []);
  const setExpanded = (v: boolean) => {
    setExpandedState(v);
    window.localStorage.setItem("sidebar_expanded", v ? "1" : "0");
  };
  return { expanded, setExpanded, mobileOpen, setMobileOpen };
}
