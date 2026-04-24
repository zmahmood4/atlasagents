"use client";

import { motion } from "framer-motion";
import { AgentNode } from "./AgentNode";
import { DEPARTMENT_COLOR, DEPARTMENT_LABEL, cn } from "@/lib/utils";
import type { Agent, Department } from "@/lib/types";

const DEPT_ORDER: Department[] = ["command", "product", "engineering", "gtm", "ops"];

export function AgentGrid3D({
  agents,
  selectedAgent,
  onSelect,
}: {
  agents: Agent[];
  selectedAgent: string | null;
  onSelect: (name: string) => void;
}) {
  const grouped = DEPT_ORDER.map((dept) => ({
    dept,
    agents: agents.filter((a) => a.department === dept),
  })).filter((g) => g.agents.length > 0);

  return (
    <div
      className="w-full"
      style={{
        perspective: "1200px",
        perspectiveOrigin: "50% 30%",
      }}
    >
      <motion.div
        initial={{ opacity: 0, rotateX: 15 }}
        animate={{ opacity: 1, rotateX: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        style={{ transformStyle: "preserve-3d" }}
      >
        <div className="space-y-4">
          {grouped.map(({ dept, agents: deptAgents }, rowIdx) => {
            const color = DEPARTMENT_COLOR[dept];
            const anyActive = deptAgents.some((a) => a.status === "active");
            return (
              <motion.div
                key={dept}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: rowIdx * 0.08, duration: 0.4 }}
              >
                {/* Dept label */}
                <div className="mb-2 flex items-center gap-2 px-1">
                  <span
                    className={cn("h-1.5 w-1.5 rounded-full", anyActive ? "status-dot-pulse" : "")}
                    style={{ background: color, color }}
                  />
                  <span
                    className="font-mono text-[9px] uppercase tracking-[0.25em]"
                    style={{ color }}
                  >
                    {DEPARTMENT_LABEL[dept]}
                  </span>
                  <div
                    className="flex-1 h-px opacity-20"
                    style={{ background: `linear-gradient(to right, ${color}, transparent)` }}
                  />
                </div>

                {/* Agent row */}
                <div className="flex flex-wrap gap-2 pl-1">
                  {deptAgents.map((agent, colIdx) => (
                    <motion.div
                      key={agent.id}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{
                        delay: rowIdx * 0.06 + colIdx * 0.04,
                        type: "spring",
                        stiffness: 400,
                        damping: 25,
                      }}
                      style={{
                        // 3D depth: department rows at different z
                        transform: `translateZ(${(4 - rowIdx) * 8}px)`,
                        transformStyle: "preserve-3d",
                      }}
                    >
                      <AgentNode
                        agent={agent}
                        size={48}
                        selected={selectedAgent === agent.name}
                        onClick={() => onSelect(agent.name)}
                      />
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
