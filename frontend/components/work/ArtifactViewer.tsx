"use client";

import { Copy, Download, Maximize2, X } from "lucide-react";
import { useState } from "react";
import { createPortal } from "react-dom";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { CodeViewer } from "./CodeViewer";
import { MarkdownViewer } from "./MarkdownViewer";
import { formatRelative } from "@/lib/utils";
import type { WorkArtifact } from "@/lib/types";

const CODE_TYPES = new Set(["code"]);
const MARKDOWN_TYPES = new Set(["prd", "research", "report", "plan", "spec", "design", "analysis"]);

function ArtifactContent({ artifact }: { artifact: WorkArtifact }) {
  if (CODE_TYPES.has(artifact.artifact_type)) {
    return <CodeViewer content={artifact.content} title={artifact.title} />;
  }
  if (MARKDOWN_TYPES.has(artifact.artifact_type)) {
    return <MarkdownViewer content={artifact.content} />;
  }
  // content / email / note — preserve formatting but don't markdown-parse
  return (
    <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-[var(--text-primary)]">
      {artifact.content}
    </pre>
  );
}

function FullscreenViewer({
  artifact,
  onClose,
}: {
  artifact: WorkArtifact;
  onClose: () => void;
}) {
  if (typeof window === "undefined") return null;
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex flex-col bg-[var(--bg-base)]"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <header className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--bg-surface)] px-6 py-3">
        <div className="flex items-center gap-3">
          <Badge tone="blue">{artifact.artifact_type}</Badge>
          <h2 className="font-semibold text-[var(--text-primary)]">{artifact.title}</h2>
        </div>
        <button
          onClick={onClose}
          className="rounded-md p-1.5 text-[var(--text-tertiary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
        >
          <X className="h-5 w-5" />
        </button>
      </header>
      <div className="flex-1 overflow-y-auto px-6 py-6 max-w-4xl mx-auto w-full">
        <ArtifactContent artifact={artifact} />
      </div>
    </div>,
    document.body,
  );
}

export function ArtifactViewer({ artifact }: { artifact: WorkArtifact | null }) {
  const [fullscreen, setFullscreen] = useState(false);

  if (!artifact) {
    return (
      <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-[var(--border)] bg-[var(--bg-surface)] p-8 text-center">
        <div>
          <div className="mb-2 text-2xl">⬅</div>
          <div className="font-mono text-sm text-[var(--text-tertiary)]">Select an artifact to view it</div>
          <div className="mt-1 text-xs text-[var(--text-tertiary)]">PRDs, code, research, reports, copy, plans</div>
        </div>
      </div>
    );
  }

  const copy = async () => {
    try { await navigator.clipboard.writeText(artifact.content); } catch {}
  };

  const download = () => {
    const ext = artifact.artifact_type === "code" ? ".txt" : ".md";
    const blob = new Blob([artifact.content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${artifact.title.replace(/[/\\:*?"<>|]/g, "_")}${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <article className="flex h-full flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-surface)]">
        {/* Header */}
        <header className="shrink-0 border-b border-[var(--border)] bg-[var(--bg-base)] px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="blue">{artifact.artifact_type}</Badge>
            {artifact.experiment_id ? (
              <Badge tone="purple">exp:{artifact.experiment_id.slice(0, 6)}</Badge>
            ) : null}
            <div className="ml-auto flex items-center gap-1.5">
              <Button variant="ghost" size="sm" onClick={copy} title="Copy to clipboard">
                <Copy className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="sm" onClick={download} title="Download">
                <Download className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setFullscreen(true)} title="Full screen">
                <Maximize2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
          <h3 className="mt-2 font-semibold leading-snug text-[var(--text-primary)]">
            {artifact.title}
          </h3>
          <div className="mt-0.5 font-mono text-[10px] text-[var(--text-tertiary)]">
            by {artifact.agent_name} · {formatRelative(artifact.created_at)}
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          <ArtifactContent artifact={artifact} />
        </div>
      </article>

      {fullscreen ? (
        <FullscreenViewer artifact={artifact} onClose={() => setFullscreen(false)} />
      ) : null}
    </>
  );
}
