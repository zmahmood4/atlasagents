"use client";

import { motion } from "framer-motion";
import { Rocket } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";

export function KickoffButton({ onKicked }: { onKicked?: () => void }) {
  const [busy, setBusy] = useState(false);
  const [flashMsg, setFlashMsg] = useState<string | null>(null);

  const go = async () => {
    setBusy(true);
    setFlashMsg(null);
    try {
      const r = await api.kickoff();
      setFlashMsg(r.message);
      onKicked?.();
      setTimeout(() => setFlashMsg(null), 6000);
    } catch (e) {
      setFlashMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
        <Button variant="primary" size="lg" onClick={go} loading={busy}>
          <Rocket className="h-4 w-4" />
          Kick off
        </Button>
      </motion.div>
      {flashMsg ? (
        <motion.span
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          className="data-mono text-[11px] text-[var(--accent-emerald)]"
        >
          {flashMsg}
        </motion.span>
      ) : null}
    </div>
  );
}
