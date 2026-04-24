"use client";

import { SelectNative } from "@/components/ui/Input";
import { DEPARTMENT_LABEL } from "@/lib/utils";
import type { Agent, Department } from "@/lib/types";

export function FeedFilter({
  agents,
  department,
  agent,
  type,
  importance,
  onChange,
}: {
  agents: Agent[];
  department: Department | "";
  agent: string;
  type: string;
  importance: string;
  onChange: (p: {
    department?: Department | "";
    agent?: string;
    type?: string;
    importance?: string;
  }) => void;
}) {
  const filtered = department ? agents.filter((a) => a.department === department) : agents;
  return (
    <div className="flex flex-wrap gap-2">
      <SelectNative
        className="w-44"
        value={department}
        onChange={(e) => onChange({ department: (e.target.value || "") as Department | "", agent: "" })}
      >
        <option value="">All departments</option>
        {(Object.keys(DEPARTMENT_LABEL) as Department[]).map((d) => (
          <option key={d} value={d}>
            {DEPARTMENT_LABEL[d]}
          </option>
        ))}
      </SelectNative>
      <SelectNative
        className="w-56"
        value={agent}
        onChange={(e) => onChange({ agent: e.target.value })}
      >
        <option value="">All agents</option>
        {filtered.map((a) => (
          <option key={a.id} value={a.name}>
            {a.name} — {a.role}
          </option>
        ))}
      </SelectNative>
      <SelectNative className="w-44" value={type} onChange={(e) => onChange({ type: e.target.value })}>
        <option value="">All types</option>
        <option value="decision">decision</option>
        <option value="tool">tool</option>
        <option value="artifact">artifact</option>
        <option value="escalation">escalation</option>
        <option value="task">task</option>
        <option value="run_start">run_start</option>
        <option value="run_end">run_end</option>
        <option value="error">error</option>
      </SelectNative>
      <SelectNative
        className="w-40"
        value={importance}
        onChange={(e) => onChange({ importance: e.target.value })}
      >
        <option value="">All importance</option>
        <option value="critical">critical</option>
        <option value="high">high</option>
        <option value="normal">normal</option>
        <option value="low">low</option>
      </SelectNative>
    </div>
  );
}
