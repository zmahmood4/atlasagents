"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { AtlasOrb } from "./AtlasOrb";

export function SetupScreen({ onUnlocked }: { onUnlocked: () => void }) {
  const [key, setKey] = useState("");
  const [error, setError] = useState("");
  const [testing, setTesting] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

  const unlock = async () => {
    const k = key.trim();
    if (!k) { setError("Paste your DASHBOARD_API_KEY from Render environment variables."); return; }
    setTesting(true);
    setError("");
    try {
      const res = await fetch(`${apiUrl}/api/agents`, {
        headers: { "X-API-Key": k },
        cache: "no-store",
      });
      if (res.status === 401) {
        setError("Wrong key — check the DASHBOARD_API_KEY value in your Render service environment.");
        return;
      }
      if (!res.ok) {
        setError(`Backend returned ${res.status}. Check Render logs.`);
        return;
      }
      window.localStorage.setItem("dashboard_api_key", k);
      onUnlocked();
    } catch {
      setError(`Cannot reach backend at ${apiUrl}. Make sure Render is running and CORS is set to this URL.`);
    } finally {
      setTesting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 bg-[var(--bg-void)]"
      style={{ paddingTop: "max(0px,var(--safe-top))" }}
    >
      <AtlasOrb activeCount={0} size={80} />

      <div className="text-center">
        <h1 className="atlas-brand text-2xl font-black">ATLAS</h1>
        <p className="mt-1 font-mono text-[11px] tracking-[0.2em] text-[var(--text-tertiary)]">
          autonomous ai team · first time setup
        </p>
      </div>

      <div className="w-full max-w-sm space-y-3">
        <div>
          <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.15em] text-[var(--text-secondary)]">
            Dashboard API Key
          </label>
          <input
            type="password"
            value={key}
            onChange={e => setKey(e.target.value)}
            onKeyDown={e => e.key === "Enter" && unlock()}
            placeholder="Paste your DASHBOARD_API_KEY…"
            autoFocus
            className="w-full rounded-xl border border-[var(--border-glow)] bg-[var(--bg-surface)] px-4 py-3 font-mono text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none focus:border-[var(--cyan)]/50 transition"
            style={{ caretColor: "var(--cyan)" }}
          />
        </div>

        {error && (
          <p className="rounded-lg border border-[var(--red)]/30 bg-[var(--bg-surface)] px-3 py-2 font-mono text-[11px] text-[var(--red)]">
            {error}
          </p>
        )}

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={unlock}
          disabled={testing || !key.trim()}
          className="w-full rounded-xl py-3 font-mono text-sm font-semibold transition disabled:opacity-50"
          style={{
            background: key.trim() ? "var(--cyan)" : "var(--bg-elevated)",
            color: key.trim() ? "var(--bg-void)" : "var(--text-tertiary)",
            boxShadow: key.trim() ? "0 0 24px rgba(0,212,255,0.35)" : "none",
          }}
        >
          {testing ? "Checking…" : "Unlock ATLAS"}
        </motion.button>
      </div>

      <div className="max-w-sm text-center">
        <p className="font-mono text-[10px] text-[var(--text-tertiary)] leading-relaxed">
          Find your key in <span className="text-[var(--cyan)]">Render → atlasagents → Environment → DASHBOARD_API_KEY</span>. It is stored in this browser only.
        </p>
      </div>
    </motion.div>
  );
}
