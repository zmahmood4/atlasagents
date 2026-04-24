"use client";

import { Badge } from "@/components/ui/Badge";
import { cn, formatRelative } from "@/lib/utils";
import type { WorkArtifact } from "@/lib/types";

export function ArtifactList({
  artifacts,
  selectedId,
  onSelect,
}: {
  artifacts: WorkArtifact[];
  selectedId?: string | null;
  onSelect: (id: string) => void;
}) {
  if (artifacts.length === 0)
    return (
      <div className="rounded-md border border-[var(--border)] bg-[var(--bg-surface)] p-4 text-sm text-[var(--text-secondary)]">
        No artifacts yet. This is where every PRD, code file, report, research note, and piece of copy lands.
      </div>
    );
  return (
    <div className="divide-y divide-[var(--border)] rounded-md border border-[var(--border)] bg-[var(--bg-surface)]">
      {artifacts.map((a) => (
        <button
          key={a.id}
          onClick={() => onSelect(a.id)}
          className={cn(
            "flex w-full items-center justify-between gap-3 px-3 py-2 text-left transition hover:bg-[var(--bg-elevated)]",
            selectedId === a.id && "bg-[var(--bg-elevated)]",
          )}
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Badge tone="blue">{a.artifact_type}</Badge>
              <span className="truncate text-sm text-[var(--text-primary)]">{a.title}</span>
            </div>
            <div className="mt-0.5 font-mono text-[10px] text-[var(--text-tertiary)]">
              {a.agent_name} · {formatRelative(a.created_at)}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
