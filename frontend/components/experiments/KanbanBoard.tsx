"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ExperimentCard } from "./ExperimentCard";
import type { Agent, Experiment, ExperimentStatus } from "@/lib/types";

const COLUMNS: { id: ExperimentStatus; title: string }[] = [
  { id: "proposed", title: "PROPOSED" },
  { id: "active", title: "ACTIVE" },
  { id: "measuring", title: "MEASURING" },
  { id: "closed", title: "CLOSED" },
];

export function KanbanBoard({
  experiments,
  agents,
  onOpen,
}: {
  experiments: Experiment[];
  agents: Agent[];
  onOpen: (e: Experiment) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      {COLUMNS.map((col) => {
        const list = experiments.filter((e) => e.status === col.id);
        return (
          <div
            key={col.id}
            className="flex flex-col rounded-md border border-[var(--border)] bg-[var(--bg-base)] p-3"
          >
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-mono text-[10px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
                {col.title}
              </h3>
              <span className="font-mono text-[10px] text-[var(--text-tertiary)]">{list.length}</span>
            </div>
            <motion.div layout className="flex-1 space-y-2">
              <AnimatePresence initial={false}>
                {list.map((e, i) => (
                  <motion.div
                    key={e.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2, delay: i * 0.03 }}
                  >
                    <ExperimentCard experiment={e} agents={agents} onClick={() => onOpen(e)} />
                  </motion.div>
                ))}
              </AnimatePresence>
              {list.length === 0 ? (
                <div className="rounded-md border border-dashed border-[var(--border)] p-3 text-center text-[10px] font-mono text-[var(--text-tertiary)]">
                  empty
                </div>
              ) : null}
            </motion.div>
          </div>
        );
      })}
    </div>
  );
}
