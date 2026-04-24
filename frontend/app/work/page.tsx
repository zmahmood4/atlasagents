"use client";

import { useMemo, useState } from "react";
import { ArtifactList } from "@/components/work/ArtifactList";
import { ArtifactViewer } from "@/components/work/ArtifactViewer";
import { PageContainer } from "@/components/layout/PageContainer";
import { Badge } from "@/components/ui/Badge";
import { Input, SelectNative } from "@/components/ui/Input";
import { useAgents } from "@/hooks/useAgents";
import { useArtifact, useArtifacts } from "@/hooks/useArtifacts";
import type { ArtifactType } from "@/lib/types";

const TYPE_OPTIONS: { value: ArtifactType | ""; label: string }[] = [
  { value: "", label: "all types" },
  { value: "prd", label: "PRD" },
  { value: "spec", label: "spec" },
  { value: "code", label: "code" },
  { value: "report", label: "report" },
  { value: "research", label: "research" },
  { value: "plan", label: "plan" },
  { value: "content", label: "content / copy" },
  { value: "design", label: "design" },
  { value: "analysis", label: "analysis" },
  { value: "note", label: "note" },
];

export default function WorkProductPage() {
  const { agents } = useAgents();
  const [agent, setAgent] = useState<string | undefined>();
  const [type, setType] = useState<string | undefined>();
  const [query, setQuery] = useState("");
  const { artifacts, loading } = useArtifacts({ agent, type });
  const [selected, setSelected] = useState<string | null>(null);
  const { artifact } = useArtifact(selected);

  const filtered = useMemo(() => {
    if (!query) return artifacts;
    const q = query.toLowerCase();
    return artifacts.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.agent_name.toLowerCase().includes(q) ||
        a.artifact_type.toLowerCase().includes(q),
    );
  }, [artifacts, query]);

  // Counts by type for the filter pills
  const typeCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const a of artifacts) m[a.artifact_type] = (m[a.artifact_type] ?? 0) + 1;
    return m;
  }, [artifacts]);

  return (
    <PageContainer title="Work Product">
      {/* type filter pills */}
      <div className="mb-4 flex flex-wrap gap-2">
        {TYPE_OPTIONS.filter((t) => t.value === "" || (typeCounts[t.value] ?? 0) > 0).map((t) => (
          <button
            key={t.value}
            onClick={() => setType(t.value || undefined)}
            className={
              (type ?? "") === t.value
                ? "flex items-center gap-1.5 rounded-full border border-[var(--accent-blue)] bg-[var(--accent-blue-dim)] px-3 py-1 font-mono text-[11px] text-[var(--accent-blue)]"
                : "flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-1 font-mono text-[11px] text-[var(--text-secondary)] hover:border-[var(--border-active)]"
            }
          >
            {t.label}
            {t.value && typeCounts[t.value] ? (
              <span className="text-[9px] opacity-60">{typeCounts[t.value]}</span>
            ) : null}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12" style={{ minHeight: "calc(100vh - 260px)" }}>
        {/* Left panel */}
        <aside className="flex flex-col gap-3 lg:col-span-4">
          <div className="flex gap-2">
            <Input
              placeholder="search…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1"
            />
            <SelectNative
              value={agent ?? ""}
              onChange={(e) => setAgent(e.target.value || undefined)}
              className="w-40"
            >
              <option value="">all agents</option>
              {agents.map((a) => (
                <option key={a.id} value={a.name}>
                  {a.name}
                </option>
              ))}
            </SelectNative>
          </div>
          <div className="flex items-center justify-between text-[10px] text-[var(--text-tertiary)]">
            <span className="font-mono">
              {loading ? "loading…" : `${filtered.length} artifact${filtered.length !== 1 ? "s" : ""}`}
            </span>
            {selected ? (
              <button
                onClick={() => setSelected(null)}
                className="font-mono hover:text-[var(--text-primary)]"
              >
                clear selection ×
              </button>
            ) : null}
          </div>
          <ArtifactList artifacts={filtered} selectedId={selected} onSelect={setSelected} />
        </aside>

        {/* Right panel — takes full remaining height */}
        <section className="lg:col-span-8">
          <ArtifactViewer artifact={artifact ?? null} />
        </section>
      </div>
    </PageContainer>
  );
}
