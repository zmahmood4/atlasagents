"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart3,
  Brain,
  ChevronLeft,
  ChevronRight,
  FlaskConical,
  FolderOpen,
  Grid3x3,
  Home,
  Inbox,
  type LucideIcon,
  Settings,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useApprovals } from "@/hooks/useApprovals";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const NAV: NavItem[] = [
  { href: "/", label: "Mission Control", icon: Home },
  { href: "/agents", label: "Agent Board", icon: Grid3x3 },
  { href: "/work", label: "Work Product", icon: FolderOpen },
  { href: "/experiments", label: "Experiments", icon: FlaskConical },
  { href: "/financials", label: "Financials", icon: BarChart3 },
  { href: "/approvals", label: "Approval Inbox", icon: Inbox },
  { href: "/knowledge", label: "Knowledge Base", icon: Brain },
  { href: "/settings", label: "Settings", icon: Settings },
];


function LogoMark() {
  return (
    <div
      className="scanline h-8 w-8 shrink-0 rounded-md flex items-center justify-center font-mono text-sm font-semibold text-white"
      style={{
        background: "linear-gradient(135deg, var(--accent-blue), var(--accent-purple))",
        boxShadow: "0 0 18px -4px var(--accent-blue)",
      }}
    >
      A
    </div>
  );
}

function NavLinks({
  expanded,
  pending,
  onClick,
}: {
  expanded: boolean;
  pending: number;
  onClick?: () => void;
}) {
  const path = usePathname();
  return (
    <nav className="flex-1 space-y-0.5 px-2">
      {NAV.map((n) => {
        const active = path === n.href || (n.href !== "/" && path.startsWith(n.href));
        const Icon = n.icon;
        const showBadge = n.href === "/approvals" && pending > 0;
        return (
          <Link
            key={n.href}
            href={n.href}
            onClick={onClick}
            className={cn(
              "relative flex items-center gap-3 rounded-md px-2.5 py-2 text-sm transition",
              active
                ? "bg-[var(--bg-elevated)] text-[var(--text-primary)]"
                : "text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <AnimatePresence>
              {expanded ? (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="truncate"
                >
                  {n.label}
                </motion.span>
              ) : null}
            </AnimatePresence>
            {showBadge ? (
              <span
                className={cn(
                  "ml-auto rounded-full bg-[var(--accent-amber)] px-1.5 py-0.5 text-[10px] font-mono text-black",
                  expanded ? "" : "absolute right-1 top-1",
                )}
              >
                {pending}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

/** Desktop fixed rail (lg+). Collapsible 220 ↔ 64 px. */
export function Sidebar({
  expanded,
  setExpanded,
}: {
  expanded: boolean;
  setExpanded: (v: boolean) => void;
}) {
  const { approvals } = useApprovals("pending");
  const pending = approvals.length;

  return (
    <motion.aside
      animate={{ width: expanded ? 220 : 64 }}
      transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
      className="fixed inset-y-0 left-0 z-20 hidden flex-col border-r border-[var(--border)] bg-[var(--bg-surface)] lg:flex"
    >
      <div className="flex items-center gap-2 px-3 py-4">
        <LogoMark />
        <AnimatePresence>
          {expanded ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="font-mono text-sm font-semibold leading-tight text-[var(--text-primary)]">
                ATLAS
              </div>
              <div className="text-[10px] text-[var(--text-tertiary)]">Mission control</div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      <NavLinks expanded={expanded} pending={pending} />

      <button
        onClick={() => setExpanded(!expanded)}
        className="m-2 flex items-center justify-center rounded-md border border-[var(--border)] bg-[var(--bg-base)] py-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
      >
        {expanded ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>
    </motion.aside>
  );
}

/** Mobile slide-in drawer. Renders under lg breakpoint. */
export function MobileSidebar({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { approvals } = useApprovals("pending");
  const pending = approvals.length;

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-30 flex lg:hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.aside
            initial={{ x: -260 }}
            animate={{ x: 0 }}
            exit={{ x: -260 }}
            transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="flex h-full w-[260px] flex-col border-r border-[var(--border)] bg-[var(--bg-surface)]"
          >
            <div className="flex items-center justify-between px-3 py-4">
              <div className="flex items-center gap-2">
                <LogoMark />
                <div>
                  <div className="font-mono text-sm font-semibold text-[var(--text-primary)]">
                    ATLAS
                  </div>
                  <div className="text-[10px] text-[var(--text-tertiary)]">Mission control</div>
                </div>
              </div>
              <button
                onClick={onClose}
                className="rounded-md p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                aria-label="Close menu"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <NavLinks expanded={true} pending={pending} onClick={onClose} />
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
    if (v) setExpandedState(v === "1");
  }, []);

  const setExpanded = (v: boolean) => {
    setExpandedState(v);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("sidebar_expanded", v ? "1" : "0");
    }
  };

  return { expanded, setExpanded, mobileOpen, setMobileOpen };
}
