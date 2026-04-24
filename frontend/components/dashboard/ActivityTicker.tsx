"use client";

import { useFeed } from "@/hooks/useFeed";

export function ActivityTicker() {
  const { actions } = useFeed();
  const items = actions.slice(0, 24);
  if (items.length === 0) {
    return (
      <div className="surface overflow-hidden rounded-xl px-4 py-2">
        <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-tertiary)]">
          Live activity
        </div>
        <div className="mt-1 font-mono text-xs text-[var(--text-secondary)]">
          Awaiting first agent tick…
        </div>
      </div>
    );
  }
  // duplicate so the CSS marquee has something to loop against seamlessly
  const doubled = [...items, ...items];
  return (
    <div className="surface relative overflow-hidden rounded-xl py-2">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-[var(--bg-surface)] to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-[var(--bg-surface)] to-transparent" />
      <div className="px-4">
        <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-tertiary)]">
          Live activity · last {items.length}
        </div>
      </div>
      <div className="mt-1 overflow-hidden px-4">
        <div className="ticker-track gap-6">
          {doubled.map((a, i) => (
            <span key={`${a.id}-${i}`} className="flex items-center gap-2 text-xs">
              <span className="data-mono text-[var(--accent-blue)]">{a.agent_name}</span>
              <span className="text-[var(--text-tertiary)]">·</span>
              <span className="text-[var(--text-secondary)]">{a.action_type}</span>
              <span className="text-[var(--text-tertiary)]">·</span>
              <span className="text-[var(--text-primary)]">{a.summary}</span>
              <span className="mx-4 text-[var(--border-active)]">◆</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
