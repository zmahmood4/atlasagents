"use client";

import CountUp from "react-countup";
import { motion } from "framer-motion";

export function MetricCard({
  label,
  value,
  prefix = "",
  suffix = "",
  decimals = 0,
  hint,
}: {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  hint?: string;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="surface glow-hover rounded-lg p-4"
    >
      <div className="text-[10px] uppercase tracking-wide text-[var(--text-tertiary)]">{label}</div>
      <div className="data-mono mt-1 text-2xl font-semibold text-[var(--text-primary)]">
        <CountUp end={value} duration={1.4} decimals={decimals} prefix={prefix} suffix={suffix} preserveValue />
      </div>
      {hint ? <div className="mt-0.5 text-[11px] text-[var(--text-tertiary)]">{hint}</div> : null}
    </motion.div>
  );
}
