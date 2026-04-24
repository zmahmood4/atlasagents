"use client";

import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";

export function RedirectModal({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (note: string) => Promise<void>;
}) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    if (!note.trim()) {
      setErr("Please describe what you want the agent to change.");
      return;
    }
    setBusy(true);
    try {
      await onSubmit(note);
      setNote("");
      onClose();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent title="Send redirect note">
        <div className="space-y-3">
          <p className="text-xs text-[var(--text-secondary)]">
            This note is sent back to the agent as a task. Be specific.
          </p>
          <Textarea
            rows={6}
            placeholder="e.g. 'Copy is too hype. Remove any superlatives and cite the 37% stat.'"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          {err ? <div className="text-xs text-[var(--accent-red)]">{err}</div> : null}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="redirect" loading={busy} onClick={submit}>
              Send to agent
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
