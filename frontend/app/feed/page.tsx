"use client";

import { useState } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { FeedFilter } from "@/components/feed/FeedFilter";
import { RealtimeFeed } from "@/components/feed/RealtimeFeed";
import { useAgents } from "@/hooks/useAgents";
import type { Department } from "@/lib/types";

export default function FeedArchivePage() {
  const { agents } = useAgents();
  const [department, setDepartment] = useState<Department | "">("");
  const [agent, setAgent] = useState<string>("");
  const [type, setType] = useState<string>("");
  const [importance, setImportance] = useState<string>("");

  return (
    <PageContainer title="Live Feed">
      <div className="mb-4">
        <FeedFilter
          agents={agents}
          department={department}
          agent={agent}
          type={type}
          importance={importance}
          onChange={(p) => {
            if (p.department !== undefined) setDepartment(p.department);
            if (p.agent !== undefined) setAgent(p.agent);
            if (p.type !== undefined) setType(p.type);
            if (p.importance !== undefined) setImportance(p.importance);
          }}
        />
      </div>
      <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] px-4">
        <RealtimeFeed
          agents={agents}
          agent={agent || undefined}
          type={type || undefined}
          importance={importance || undefined}
        />
      </div>
    </PageContainer>
  );
}
