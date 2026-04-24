"use client";

import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input, SelectNative, Textarea } from "@/components/ui/Input";
import { api } from "@/lib/api";
import type { Experiment, ExperimentStatus } from "@/lib/types";

export function ExperimentModal({
  experiment,
  onClose,
  onSaved,
}: {
  experiment: Experiment | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [status, setStatus] = useState<ExperimentStatus>(experiment?.status ?? "proposed");
  const [learnings, setLearnings] = useState(experiment?.learnings ?? "");
  const [result, setResult] = useState(experiment?.result ?? "");
  const [effort, setEffort] = useState(experiment?.effort_score ?? 0);
  const [revenue, setRevenue] = useState(experiment?.revenue_score ?? 0);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!experiment) return null;

  const save = async () => {
    setSaving(true);
    try {
      await api.updateExperiment(experiment.id, {
        status,
        learnings,
        result: result || null,
        effort_score: effort || null,
        revenue_score: revenue || null,
      });
      onSaved();
      onClose();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!experiment} onOpenChange={(o) => !o && onClose()}>
      <DialogContent wide title={experiment.title}>
        <div className="space-y-4 text-sm text-[var(--text-primary)]">
          <FieldRO label="Hypothesis" value={experiment.hypothesis} />
          <FieldRO label="Success metric" value={experiment.success_metric} />
          <FieldRO label="Owner" value={experiment.owner_agent} />

          <Field label="Status">
            <SelectNative value={status} onChange={(e) => setStatus(e.target.value as ExperimentStatus)}>
              <option value="proposed">proposed</option>
              <option value="active">active</option>
              <option value="measuring">measuring</option>
              <option value="closed">closed</option>
            </SelectNative>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Effort 1-10">
              <Input
                type="number"
                min={0}
                max={10}
                value={effort}
                onChange={(e) => setEffort(Number(e.target.value || 0))}
              />
            </Field>
            <Field label="Revenue 1-10">
              <Input
                type="number"
                min={0}
                max={10}
                value={revenue}
                onChange={(e) => setRevenue(Number(e.target.value || 0))}
              />
            </Field>
          </div>

          {status === "closed" ? (
            <Field label="Result (winner / killed)">
              <SelectNative value={result} onChange={(e) => setResult(e.target.value)}>
                <option value="">—</option>
                <option value="winner">winner</option>
                <option value="killed">killed</option>
              </SelectNative>
            </Field>
          ) : null}

          <Field label="Learnings">
            <Textarea rows={5} value={learnings} onChange={(e) => setLearnings(e.target.value)} />
          </Field>

          {err ? <div className="text-xs text-[var(--accent-red)]">{err}</div> : null}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" loading={saving} onClick={save}>
              Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-[10px] uppercase tracking-wide text-[var(--text-tertiary)]">{label}</div>
      {children}
    </div>
  );
}

function FieldRO({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="mb-1 text-[10px] uppercase tracking-wide text-[var(--text-tertiary)]">{label}</div>
      <div className="text-[var(--text-primary)]">{value}</div>
    </div>
  );
}
