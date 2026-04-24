"use client";

import { Copy, Download } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { CodeViewer } from "./CodeViewer";
import { formatRelative } from "@/lib/utils";
import type { WorkArtifact } from "@/lib/types";

export function ArtifactViewer({ artifact }: { artifact: WorkArtifact | null }) {
  if (!artifact) {
    return (
      <div className="rounded-md border border-[var(--border)] bg-[var(--bg-surface)] p-6 text-sm text-[var(--text-secondary)]">
        Select an artifact to view it.
      </div>
    );
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(artifact.content);
    } catch {}
  };

  const download = () => {
    const blob = new Blob([artifact.content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${artifact.title.replace(/[/\\:*?"<>|]/g, "_")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <article className="rounded-md border border-[var(--border)] bg-[var(--bg-surface)] p-5">
      <header className="mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="blue">{artifact.artifact_type}</Badge>
          {artifact.experiment_id ? (
            <Badge tone="purple">experiment: {artifact.experiment_id.slice(0, 8)}</Badge>
          ) : null}
          <div className="ml-auto flex gap-2">
            <Button variant="ghost" size="sm" onClick={copy}>
              <Copy className="h-3 w-3" /> Copy
            </Button>
            <Button variant="ghost" size="sm" onClick={download}>
              <Download className="h-3 w-3" /> Download
            </Button>
          </div>
        </div>
        <h3 className="mt-2 text-lg font-semibold text-[var(--text-primary)]">{artifact.title}</h3>
        <div className="font-mono text-[11px] text-[var(--text-tertiary)]">
          {artifact.agent_name} · {formatRelative(artifact.created_at)}
        </div>
      </header>
      {artifact.artifact_type === "code" ? (
        <CodeViewer content={artifact.content} title={artifact.title} />
      ) : (
        <pre className="whitespace-pre-wrap text-sm text-[var(--text-primary)]">
          {artifact.content}
        </pre>
      )}
    </article>
  );
}
