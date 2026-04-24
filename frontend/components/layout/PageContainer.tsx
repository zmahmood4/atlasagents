"use client";

import { motion } from "framer-motion";
import { MobileSidebar, Sidebar, useSidebarState } from "./Sidebar";
import { TopBar } from "./TopBar";

export function PageContainer({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const { expanded, setExpanded, mobileOpen, setMobileOpen } = useSidebarState();
  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
      <Sidebar expanded={expanded} setExpanded={setExpanded} />
      <MobileSidebar open={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div
        className={
          expanded
            ? "transition-[padding] duration-200 lg:pl-[220px]"
            : "transition-[padding] duration-200 lg:pl-[64px]"
        }
      >
        <TopBar title={title} onOpenMenu={() => setMobileOpen(true)} />
        <motion.main
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-6"
        >
          {children}
        </motion.main>
      </div>
    </div>
  );
}
