"use client";

import { useEffect, useState } from "react";
import type { BundledLanguage } from "shiki";

function inferLang(title: string): BundledLanguage {
  const t = title.toLowerCase();
  if (t.endsWith(".tsx") || t.endsWith(".jsx")) return "tsx";
  if (t.endsWith(".ts")) return "typescript";
  if (t.endsWith(".js")) return "javascript";
  if (t.endsWith(".py")) return "python";
  if (t.endsWith(".sql")) return "sql";
  if (t.endsWith(".md")) return "markdown";
  if (t.endsWith(".json")) return "json";
  if (t.endsWith(".yml") || t.endsWith(".yaml")) return "yaml";
  if (t.endsWith(".css")) return "css";
  if (t.endsWith(".html")) return "html";
  return "text" as BundledLanguage;
}

export function CodeViewer({ content, title }: { content: string; title: string }) {
  const [html, setHtml] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { codeToHtml } = await import("shiki");
        const out = await codeToHtml(content, {
          lang: inferLang(title),
          theme: "github-dark-dimmed",
        });
        if (!cancelled) setHtml(out);
      } catch {
        if (!cancelled) setHtml(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [content, title]);

  return (
    <div className="overflow-x-auto rounded-md border border-[var(--border)] bg-[var(--bg-base)] p-4 text-xs [&_pre]:bg-transparent [&_pre]:text-xs [&_pre]:leading-relaxed">
      {html ? (
        <div dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        <pre className="whitespace-pre-wrap font-mono text-[var(--text-primary)]">{content}</pre>
      )}
    </div>
  );
}
