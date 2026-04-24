import { cn, formatInt, percent } from "@/lib/utils";

export function TokenProgressBar({
  used,
  cap,
  label,
}: {
  used: number;
  cap: number;
  label: string;
}) {
  const p = percent(used, cap);
  const tone =
    p >= 95 ? "bg-[var(--accent-red)]" : p >= 80 ? "bg-[var(--accent-amber)]" : "bg-[var(--accent-blue)]";
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[10px] font-mono text-[var(--text-tertiary)]">
        <span>{label}</span>
        <span>
          {formatInt(used)} / {formatInt(cap)}
        </span>
      </div>
      <div className="h-1.5 w-full rounded bg-[var(--bg-elevated)]">
        <div className={cn("h-1.5 rounded transition-all", tone)} style={{ width: `${p}%` }} />
      </div>
    </div>
  );
}
