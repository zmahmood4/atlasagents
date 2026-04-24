"use client";

import { motion } from "framer-motion";

export function AtlasOrb({
  activeCount,
  size = 80,
}: {
  activeCount: number;
  size?: number;
}) {
  const rings = [
    { r: size * 0.7,  cls: "orbit-ring-1", color: "var(--cyan)",   style: "solid"  },
    { r: size * 0.88, cls: "orbit-ring-2", color: "var(--blue)",   style: "dashed" },
    { r: size * 1.05, cls: "orbit-ring-3", color: "var(--purple)", style: "solid"  },
  ];

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size * 1.3, height: size * 1.3 }}
    >
      {/* Orbital rings */}
      {rings.map((ring, i) => (
        <div
          key={i}
          className={`absolute rounded-full border opacity-25 ${ring.cls}`}
          style={{
            width: ring.r * 2,
            height: ring.r * 2,
            borderColor: ring.color,
            borderStyle: ring.style,
          }}
        />
      ))}

      {/* Core */}
      <motion.div
        className="scanline relative z-10 flex items-center justify-center rounded-full"
        style={{
          width: size,
          height: size,
          background: "radial-gradient(circle at 35% 30%, rgba(0,212,255,0.22), rgba(26,111,255,0.05))",
          border: "1px solid rgba(0,212,255,0.35)",
          boxShadow: "0 0 50px -10px rgba(0,212,255,0.55), inset 0 0 30px -10px rgba(0,212,255,0.12)",
        }}
        animate={activeCount > 0 ? { boxShadow: [
          "0 0 50px -10px rgba(0,212,255,0.55), inset 0 0 30px -10px rgba(0,212,255,0.12)",
          "0 0 70px -6px rgba(0,212,255,0.8), inset 0 0 40px -6px rgba(0,212,255,0.2)",
          "0 0 50px -10px rgba(0,212,255,0.55), inset 0 0 30px -10px rgba(0,212,255,0.12)",
        ]} : {}}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
      >
        <svg
          viewBox="0 0 100 100"
          style={{ width: size * 0.58, height: size * 0.58 }}
        >
          <defs>
            <filter id="core-glow">
              <feGaussianBlur stdDeviation="2.5" result="b"/>
              <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>
          <line x1="26" y1="76" x2="44" y2="24" stroke="#00d4ff" strokeWidth="6" strokeLinecap="round" filter="url(#core-glow)"/>
          <line x1="74" y1="76" x2="56" y2="24" stroke="#00d4ff" strokeWidth="6" strokeLinecap="round" filter="url(#core-glow)"/>
          <line x1="34" y1="57" x2="66" y2="57" stroke="#4d8ff5" strokeWidth="4" strokeLinecap="round"/>
          <circle cx="50" cy="23" r="5.5" fill="#7c3aed" filter="url(#core-glow)"/>
          <circle cx="50" cy="23" r="2.5" fill="#c4b5fd"/>
          <circle cx="26" cy="76" r="3.5" fill="#1a6fff" filter="url(#core-glow)"/>
          <circle cx="74" cy="76" r="3.5" fill="#1a6fff" filter="url(#core-glow)"/>
        </svg>
      </motion.div>

      {/* Active dot */}
      {activeCount > 0 && (
        <span
          className="status-dot-pulse absolute bottom-[14%] right-[14%] z-20 rounded-full border-2 border-[var(--bg-void)] bg-[var(--green)]"
          style={{ width: size * 0.15, height: size * 0.15, color: "var(--green)" }}
        />
      )}
    </div>
  );
}
