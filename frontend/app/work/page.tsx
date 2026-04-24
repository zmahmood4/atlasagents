"use client";

import { useMemo, useState } from "react";
import { ArtifactList } from "@/components/work/ArtifactList";
import { ArtifactViewer } from "@/components/work/ArtifactViewer";
import { PageContainer } from "@/components/layout/PageContainer";
import { Input, SelectNative } from "@/components/ui/Input";
import { useAgents } from "@/hooks/useAgents";
import { useArtifact, useArtifacts } from "@/hooks/useArtifacts";

export default function WorkProductPage() {
  const { agents } = useAgents();
  const [agent, setAgent] = useState<string | undefined>();
  const [type, setType] = useState<string | undefined>();
  const [query, setQuery] = useState("");
  const { artifacts } = useArtifacts({ agent, type });
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

  return (
    <PageContainer title="Work Product">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <aside className="lg:col-span-4 space-y-3">
          <Input
            placeholder="search title / agent / type"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <SelectNative value={agent ?? ""} onChange={(e) => setAgent(e.target.value || undefined)}>
            <option value="">all agents</option>
            {agents.map((a) => (
              <option key={a.id} value={a.name}>
                {a.name}
              </option>
            ))}
          </SelectNative>
          <SelectNative value={type ?? ""} onChange={(e) => setType(e.target.value || undefined)}>
            <option value="">all types</option>
            <option value="prd">prd</option>
            <option value="spec">spec</option>
            <option value="code">code</option>
            <option value="report">report</option>
            <option value="content">content</option>
            <option value="research">research</option>
            <option value="analysis">analysis</option>
            <option value="design">design</option>
            <option value="plan">plan</option>
          </SelectNative>
          <ArtifactList artifacts={filtered} selectedId={selected} onSelect={setSelected} />
        </aside>
        <section className="lg:col-span-8">
          <ArtifactViewer artifact={artifact} />
        </section>
      </div>
    </PageContainer>
  );
}
