"use client";

import { motion } from "framer-motion";
import { DEPARTMENT_COLOR, cn, initials } from "@/lib/utils";
import type { Agent } from "@/lib/types";

export function AgentNode({
  agent,
  size = 52,
  selected,
  onClick,
  style,
}: {
  agent: Agent;
  size?: number;
  selected?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
}) {
  const isActive = agent.status === "active";
  const isError  = agent.status === "error";
  const color = DEPARTMENT_COLOR[agent.department] ?? "var(--cyan)";
  const r = size / 2;
  const outerR = r - 2;
  const innerR = r - 6;

  const hexPoints = (cx: number, cy: number, radius: number) =>
    Array.from({ length: 6 }, (_, i) => {
      const angle = (Math.PI / 180) * (60 * i - 30);
      return `${cx + radius * Math.cos(angle)},${cy + radius * Math.sin(angle)}`;
    }).join(" ");

  return (
    <motion.button
      onClick={onClick}
      style={{
        ...style,
        ["--agent-color" as string]: color,
      }}
      whileHover={{ scale: 1.12, y: -4 }}
      whileTap={{ scale: 0.94 }}
      className={cn(
        "relative flex flex-col items-center gap-1.5 focus:outline-none",
        isActive ? "agent-active-glow" : "",
      )}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="shrink-0 overflow-visible"
      >
        <defs>
          <filter id={`n-glow-${agent.name}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation={isActive ? "3" : "1.5"} result="b" />
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <radialGradient id={`n-bg-${agent.name}`} cx="40%" cy="35%">
            <stop offset="0%" stopColor={color} stopOpacity="0.35" />
            <stop offset="100%" stopColor={color} stopOpacity="0.05" />
          </radialGradient>
        </defs>

        {/* Outer ring */}
        <polygon
          points={hexPoints(r, r, outerR)}
          fill="none"
          stroke={color}
          strokeWidth={isActive ? "1.5" : "1"}
          filter={`url(#n-glow-${agent.name})`}
          opacity={selected ? 1 : isActive ? 0.9 : 0.45}
        />

        {/* Inner fill */}
        <polygon
          points={hexPoints(r, r, innerR)}
          fill={`url(#n-bg-${agent.name})`}
        />

        {/* Corner nodes */}
        {[0, 2, 4].map((i) => {
          const angle = (Math.PI / 180) * (60 * i - 30);
          return (
            <circle
              key={i}
              cx={r + outerR * Math.cos(angle)}
              cy={r + outerR * Math.sin(angle)}
              r="1.5"
              fill={color}
              opacity={isActive ? 0.9 : 0.4}
            />
          );
        })}

        {/* Initials */}
        <text
          x={r} y={r}
          dominantBaseline="central"
          textAnchor="middle"
          fontSize={Math.round(size * 0.26)}
          fontWeight="700"
          fontFamily="var(--font-mono), monospace"
          fill={color}
          opacity={0.95}
        >
          {initials(agent.name)}
        </text>

        {/* Status pip */}
        {isActive && (
          <circle
            cx={r + outerR * 0.82}
            cy={r - outerR * 0.82}
            r="3.5"
            fill="var(--green)"
            stroke="var(--bg-void)"
            strokeWidth="1.5"
          />
        )}
        {isError && (
          <circle
            cx={r + outerR * 0.82}
            cy={r - outerR * 0.82}
            r="3.5"
            fill="var(--red)"
            stroke="var(--bg-void)"
            strokeWidth="1.5"
          />
        )}
      </svg>

      {/* Name label */}
      <div
        className="font-mono text-[9px] font-semibold leading-none text-center max-w-[56px] truncate transition-colors"
        style={{ color: isActive ? color : selected ? "var(--text-primary)" : "var(--text-tertiary)" }}
      >
        {agent.name}
      </div>
    </motion.button>
  );
}
