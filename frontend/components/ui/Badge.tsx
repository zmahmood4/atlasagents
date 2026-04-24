import { cn } from "@/lib/utils";

type Tone = "default" | "blue" | "amber" | "emerald" | "red" | "purple";

export function Badge({
  children,
  tone = "default",
  className,
  style,
}: {
  children: React.ReactNode;
  tone?: Tone;
  className?: string;
  style?: React.CSSProperties;
}) {
  const tones: Record<Tone, string> = {
    default:
      "bg-[var(--bg-elevated)] text-[var(--text-secondary)] border-[var(--border)]",
    blue: "bg-[var(--accent-blue-dim)] text-[var(--accent-blue)] border-[var(--accent-blue-dim)]",
    amber: "bg-[color:color-mix(in_oklab,var(--accent-amber)_18%,transparent)] text-[var(--accent-amber)] border-[color:color-mix(in_oklab,var(--accent-amber)_40%,transparent)]",
    emerald: "bg-[color:color-mix(in_oklab,var(--accent-emerald)_18%,transparent)] text-[var(--accent-emerald)] border-[color:color-mix(in_oklab,var(--accent-emerald)_40%,transparent)]",
    red: "bg-[color:color-mix(in_oklab,var(--accent-red)_18%,transparent)] text-[var(--accent-red)] border-[color:color-mix(in_oklab,var(--accent-red)_40%,transparent)]",
    purple: "bg-[color:color-mix(in_oklab,var(--accent-purple)_18%,transparent)] text-[var(--accent-purple)] border-[color:color-mix(in_oklab,var(--accent-purple)_40%,transparent)]",
  };
  return (
    <span
      style={style}
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide font-mono",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
