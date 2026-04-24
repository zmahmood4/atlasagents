"use client";

import { motion } from "framer-motion";
import {
  BarChart3,
  Brain,
  FlaskConical,
  type LucideIcon,
  MoreHorizontal,
  Inbox,
  Grid3x3,
  Home,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useApprovals } from "@/hooks/useApprovals";
import { cn } from "@/lib/utils";
import { AnimatePresence } from "framer-motion";

const PRIMARY_NAV = [
  { href: "/", label: "Control", icon: Home },
  { href: "/agents", label: "Agents", icon: Grid3x3 },
  { href: "/approvals", label: "Approvals", icon: Inbox },
  { href: "/work", label: "Work", icon: Brain },
];

const MORE_NAV = [
  { href: "/experiments", label: "Experiments", icon: FlaskConical },
  { href: "/financials", label: "Financials", icon: BarChart3 },
  { href: "/knowledge", label: "Knowledge", icon: Brain },
  { href: "/settings", label: "Settings", icon: MoreHorizontal },
];

export function MobileBottomNav() {
  const path = usePathname();
  const { approvals } = useApprovals("pending");
  const pending = approvals.length;
  const [moreOpen, setMoreOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/" ? path === "/" : path.startsWith(href);

  return (
    <>
      {/* Overflow menu sheet */}
      <AnimatePresence>
        {moreOpen ? (
          <motion.div
            className="fixed inset-0 z-40 flex flex-col justify-end lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMoreOpen(false)}
          >
            <div className="absolute inset-0 bg-black/60" />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 32, stiffness: 400 }}
              onClick={(e) => e.stopPropagation()}
              className="relative glass border-t border-[var(--border)] rounded-t-2xl px-4 pt-4 pb-safe"
              style={{ paddingBottom: `calc(var(--safe-bottom) + var(--bottom-nav-h) + 16px)` }}
            >
              <div className="mx-auto mb-4 h-1 w-8 rounded-full bg-[var(--border)]" />
              <div className="grid grid-cols-4 gap-2">
                {MORE_NAV.map((n) => {
                  const Icon = n.icon;
                  const active = isActive(n.href);
                  return (
                    <Link
                      key={n.href}
                      href={n.href}
                      onClick={() => setMoreOpen(false)}
                      className={cn(
                        "flex flex-col items-center gap-1.5 rounded-xl p-3 transition",
                        active ? "bg-[var(--bg-elevated)]" : "hover:bg-[var(--bg-elevated)]",
                      )}
                    >
                      <Icon className={cn("h-5 w-5", active ? "text-[var(--accent-blue-bright)]" : "text-[var(--text-secondary)]")} />
                      <span className={cn("text-[10px]", active ? "text-[var(--accent-blue-bright)]" : "text-[var(--text-tertiary)]")}>
                        {n.label}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Bottom nav bar */}
      <nav
        className="bottom-nav-bg fixed bottom-0 left-0 right-0 z-30 flex items-end justify-around lg:hidden"
        style={{ height: `calc(var(--bottom-nav-h) + var(--safe-bottom))`, paddingBottom: "var(--safe-bottom)" }}
      >
        {PRIMARY_NAV.map((n) => {
          const Icon = n.icon as LucideIcon;
          const active = isActive(n.href);
          const showBadge = n.href === "/approvals" && pending > 0;
          return (
            <Link
              key={n.href}
              href={n.href}
              className="relative flex flex-1 flex-col items-center justify-center gap-1 py-2"
              style={{ minHeight: 44 }}
            >
              <div className="relative">
                <motion.div
                  animate={active ? { scale: [1, 1.2, 1] } : { scale: 1 }}
                  transition={{ duration: 0.25 }}
                >
                  <Icon
                    className={cn(
                      "h-5 w-5 transition-colors",
                      active ? "text-[var(--accent-blue-bright)]" : "text-[var(--text-secondary)]",
                    )}
                  />
                </motion.div>
                {showBadge ? (
                  <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--accent-amber)] font-mono text-[8px] font-bold text-black">
                    {pending}
                  </span>
                ) : null}
              </div>
              <span
                className={cn(
                  "text-[9px] tracking-wide transition-colors",
                  active ? "text-[var(--accent-blue-bright)]" : "text-[var(--text-tertiary)]",
                )}
              >
                {n.label}
              </span>
              {active ? (
                <motion.div
                  layoutId="active-tab"
                  className="absolute -top-0.5 h-0.5 w-8 rounded-full bg-[var(--accent-blue-bright)]"
                  style={{ boxShadow: "0 0 8px var(--accent-blue-bright)" }}
                />
              ) : null}
            </Link>
          );
        })}
        <button
          className="relative flex flex-1 flex-col items-center justify-center gap-1 py-2"
          onClick={() => setMoreOpen(true)}
          style={{ minHeight: 44 }}
        >
          <MoreHorizontal className="h-5 w-5 text-[var(--text-secondary)]" />
          <span className="text-[9px] text-[var(--text-tertiary)] tracking-wide">More</span>
        </button>
      </nav>
    </>
  );
}
