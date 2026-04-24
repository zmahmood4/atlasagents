import { Badge } from "@/components/ui/Badge";
import { cn, formatRelative } from "@/lib/utils";
import type { KnowledgeEntry as Entry } from "@/lib/types";

export function KnowledgeEntry({
  entry,
  selected,
  onClick,
}: {
  entry: Entry;
  selected?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full rounded-md border border-[var(--border)] bg-[var(--bg-surface)] p-3 text-left transition hover:border-[var(--border-active)]",
        selected && "border-[var(--accent-blue-dim)] bg-[var(--bg-elevated)]",
      )}
    >
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <Badge tone="blue">{entry.category}</Badge>
        {(entry.tags ?? []).slice(0, 3).map((t) => (
          <Badge key={t} tone="default">
            {t}
          </Badge>
        ))}
      </div>
      <div className="text-sm font-semibold text-[var(--text-primary)]">{entry.title}</div>
      <div className="mt-1 font-mono text-[10px] text-[var(--text-tertiary)]">
        {entry.written_by} · {formatRelative(entry.created_at)}
      </div>
    </button>
  );
}
