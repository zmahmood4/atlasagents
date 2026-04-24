"use client";

import { DEPARTMENT_COLOR, initials } from "@/lib/utils";
import type { Department } from "@/lib/types";

export function AgentAvatar({
  name,
  department,
  size = 28,
}: {
  name: string;
  department: Department;
  size?: number;
}) {
  const color = DEPARTMENT_COLOR[department] || "var(--accent-blue)";
  const ini = initials(name);
  const r = size / 2;
  const fontSize = Math.round(size * 0.3);

  // Hexagon points calculation
  const hex = (cx: number, cy: number, radius: number) => {
    const pts = [];
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 180) * (60 * i - 30);
      pts.push(`${cx + radius * Math.cos(angle)},${cy + radius * Math.sin(angle)}`);
    }
    return pts.join(" ");
  };

  const outerR = r - 1;
  const innerR = r - 4;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="shrink-0"
      role="img"
      aria-label={name}
    >
      <defs>
        <filter id={`glow-${name}`} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="1.5" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <linearGradient id={`grad-${name}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="0.25"/>
          <stop offset="100%" stopColor={color} stopOpacity="0.08"/>
        </linearGradient>
      </defs>
      {/* Outer hex border with glow */}
      <polygon
        points={hex(r, r, outerR)}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        filter={`url(#glow-${name})`}
        opacity="0.8"
      />
      {/* Inner hex background */}
      <polygon
        points={hex(r, r, innerR)}
        fill={`url(#grad-${name})`}
      />
      {/* Inner hex secondary ring */}
      <polygon
        points={hex(r, r, innerR)}
        fill="none"
        stroke={color}
        strokeWidth="0.5"
        opacity="0.4"
      />
      {/* Corner node dots */}
      {[0, 2, 4].map((i) => {
        const angle = (Math.PI / 180) * (60 * i - 30);
        const nx = r + outerR * Math.cos(angle);
        const ny = r + outerR * Math.sin(angle);
        return (
          <circle key={i} cx={nx} cy={ny} r="1.2" fill={color} opacity="0.7" />
        );
      })}
      {/* Initials */}
      <text
        x={r}
        y={r}
        dominantBaseline="central"
        textAnchor="middle"
        fontSize={fontSize}
        fontWeight="700"
        fontFamily="var(--font-mono), monospace"
        fill={color}
        opacity="0.95"
      >
        {ini}
      </text>
    </svg>
  );
}
