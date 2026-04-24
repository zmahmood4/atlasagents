"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogContent } from "@/components/ui/Dialog";
import { Input, Textarea } from "@/components/ui/Input";
import { ExperimentModal } from "@/components/experiments/ExperimentModal";
import { KanbanBoard } from "@/components/experiments/KanbanBoard";
import { PageContainer } from "@/components/layout/PageContainer";
import { Spinner } from "@/components/ui/Spinner";
import { useAgents } from "@/hooks/useAgents";
import { api } from "@/lib/api";
import type { Experiment } from "@/lib/types";

export default function ExperimentsPage() {
  const { agents } = useAgents();
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Experiment | null>(null);
  const [creating, setCreating] = useState(false);

  const refresh = useCallback(async () => {
    const r = await api.listExperiments();
    setExperiments(r.experiments);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <PageContainer title="Experiments">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs text-[var(--text-tertiary)]">
          Kanban: proposed → active → measuring → closed. Click a card to edit.
        </p>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={async () => {
              await api
                .listExperiments()
                .then((r) => setExperiments(r.experiments));
            }}
          >
            Refresh
          </Button>
          <Button variant="primary" onClick={() => setCreating(true)}>
            Suggest Experiment
          </Button>
        </div>
      </div>
      {loading ? (
        <Spinner />
      ) : (
        <KanbanBoard experiments={experiments} agents={agents} onOpen={setSelected} />
      )}
      <ExperimentModal experiment={selected} onClose={() => setSelected(null)} onSaved={refresh} />
      <CreateExperimentModal
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={refresh}
      />
    </PageContainer>
  );
}

function CreateExperimentModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [hypothesis, setHypothesis] = useState("");
  const [successMetric, setSuccessMetric] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const save = async () => {
    setBusy(true);
    setErr(null);
    try {
      await api.createExperiment({
        title: title.trim(),
        hypothesis: hypothesis.trim(),
        success_metric: successMetric.trim(),
        owner_agent: "owner",
      });
      setTitle("");
      setHypothesis("");
      setSuccessMetric("");
      onCreated();
      onClose();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent wide title="Suggest experiment">
        <div className="space-y-3 text-sm">
          <Field label="Title">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </Field>
          <Field label="Hypothesis">
            <Textarea rows={3} value={hypothesis} onChange={(e) => setHypothesis(e.target.value)} />
          </Field>
          <Field label="Success metric">
            <Input
              value={successMetric}
              placeholder="e.g. 10 paying users in 30 days"
              onChange={(e) => setSuccessMetric(e.target.value)}
            />
          </Field>
          {err ? <div className="text-xs text-[var(--accent-red)]">{err}</div> : null}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" loading={busy} onClick={save}>
              Create (sends to CEO queue)
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
      <div className="mb-1 text-[10px] uppercase tracking-wide text-[var(--text-tertiary)]">
        {label}
      </div>
      {children}
    </div>
  );
}
