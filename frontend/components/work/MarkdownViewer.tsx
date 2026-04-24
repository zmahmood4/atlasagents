"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

export function MarkdownViewer({
  content,
  className,
}: {
  content: string;
  className?: string;
}) {
  return (
    <div className={cn("atlas-prose text-sm leading-relaxed text-[var(--text-primary)]", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="mb-4 mt-6 border-b border-[var(--border)] pb-2 font-mono text-xl font-bold text-[var(--text-primary)] first:mt-0">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="mb-3 mt-5 font-mono text-base font-semibold text-[var(--text-primary)] first:mt-0">
              <span className="mr-2 text-[var(--accent-blue)]">##</span>{children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mb-2 mt-4 font-mono text-sm font-semibold text-[var(--text-secondary)] first:mt-0">
              <span className="mr-1.5 text-[var(--text-tertiary)]">###</span>{children}
            </h3>
          ),
          p: ({ children }) => (
            <p className="mb-3 last:mb-0 text-[var(--text-primary)]">{children}</p>
          ),
          ul: ({ children }) => (
            <ul className="mb-3 space-y-1 pl-0 last:mb-0">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-3 list-decimal space-y-1 pl-4 last:mb-0">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="flex items-start gap-2 text-[var(--text-primary)]">
              <span className="mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent-blue)]" />
              <span>{children}</span>
            </li>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-[var(--text-primary)]">{children}</strong>
          ),
          em: ({ children }) => (
            <em className="italic text-[var(--text-secondary)]">{children}</em>
          ),
          code: ({ children, className }) => {
            const isBlock = className?.includes("language-");
            if (isBlock) {
              return (
                <code className={cn("block overflow-x-auto rounded-md border border-[var(--border)] bg-[var(--bg-base)] px-4 py-3 font-mono text-xs text-[var(--accent-blue)]", className)}>
                  {children}
                </code>
              );
            }
            return (
              <code className="rounded bg-[var(--bg-elevated)] px-1.5 py-0.5 font-mono text-[11px] text-[var(--accent-blue)]">
                {children}
              </code>
            );
          },
          pre: ({ children }) => (
            <pre className="mb-3 overflow-x-auto rounded-md border border-[var(--border)] bg-[var(--bg-base)] p-4 font-mono text-xs leading-relaxed text-[var(--text-primary)]">
              {children}
            </pre>
          ),
          blockquote: ({ children }) => (
            <blockquote className="mb-3 border-l-2 border-[var(--accent-purple)] pl-4 text-[var(--text-secondary)] italic">
              {children}
            </blockquote>
          ),
          table: ({ children }) => (
            <div className="mb-3 overflow-x-auto rounded-md border border-[var(--border)]">
              <table className="min-w-full text-xs">{children}</table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-[var(--bg-elevated)] font-mono text-[10px] uppercase tracking-wide text-[var(--text-tertiary)]">
              {children}
            </thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-[var(--border)]">{children}</tbody>
          ),
          th: ({ children }) => (
            <th className="px-3 py-2 text-left">{children}</th>
          ),
          td: ({ children }) => (
            <td className="px-3 py-2 text-[var(--text-primary)]">{children}</td>
          ),
          hr: () => <hr className="my-4 border-[var(--border)]" />,
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--accent-blue)] underline underline-offset-2 hover:text-[var(--text-primary)]"
            >
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
