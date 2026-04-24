"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogContent } from "@/components/ui/Dialog";
import { Input, SelectNative, Textarea } from "@/components/ui/Input";
import { KnowledgeEntry as KnowledgeRow } from "@/components/knowledge/KnowledgeEntry";
import { PageContainer } from "@/components/layout/PageContainer";
import { api } from "@/lib/api";
import { cn, formatRelative } from "@/lib/utils";
import type { KnowledgeCategory, KnowledgeEntry as Entry } from "@/lib/types";

const CATEGORIES: (KnowledgeCategory | "all")[] = [
  "all",
  "company",
  "product",
  "customers",
  "competitors",
  "market",
  "decisions",
];

export default function KnowledgePage() {
  const [category, setCategory] = useState<KnowledgeCategory | "all">("all");
  const [query, setQuery] = useState("");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [selected, setSelected] = useState<Entry | null>(null);
  const [adding, setAdding] = useState(false);

  const refresh = useCallback(async () => {
    const r = await api.listKnowledge({
      category: category === "all" ? undefined : category,
      q: query || undefined,
    });
    setEntries(r.entries);
    setSelected(r.entries[0] ?? null);
  }, [category, query]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <PageContainer title="Knowledge Base">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <aside className="lg:col-span-2">
          <div className="space-y-1">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={cn(
                  "block w-full rounded-md px-3 py-1.5 text-left text-sm capitalize transition",
                  category === c
                    ? "bg-[var(--bg-elevated)] text-[var(--text-primary)]"
                    : "text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]",
                )}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="mt-4">
            <Button variant="primary" onClick={() => setAdding(true)}>
              + Add entry
            </Button>
          </div>
        </aside>

        <div className="lg:col-span-4 space-y-3">
          <Input
            placeholder="search titles / content"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="space-y-2">
            {entries.map((e) => (
              <KnowledgeRow
                key={e.id}
                entry={e}
                selected={selected?.id === e.id}
                onClick={() => setSelected(e)}
              />
            ))}
            {entries.length === 0 ? (
              <div className="rounded-md border border-[var(--border)] bg-[var(--bg-surface)] p-4 text-sm text-[var(--text-secondary)]">
                No entries.
              </div>
            ) : null}
          </div>
        </div>

        <div className="lg:col-span-6">
          {selected ? (
            <article className="rounded-md border border-[var(--border)] bg-[var(--bg-surface)] p-5">
              <div className="mb-2 flex items-center gap-2">
                <Badge tone="blue">{selected.category}</Badge>
                {(selected.tags ?? []).map((t) => (
                  <Badge key={t} tone="default">
                    {t}
                  </Badge>
                ))}
              </div>
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">{selected.title}</h3>
              <div className="font-mono text-[11px] text-[var(--text-tertiary)]">
                {selected.written_by} · {formatRelative(selected.created_at)}
              </div>
              <pre className="mt-3 whitespace-pre-wrap text-sm text-[var(--text-primary)]">
                {selected.content}
              </pre>
            </article>
          ) : (
            <div className="rounded-md border border-[var(--border)] bg-[var(--bg-surface)] p-6 text-sm text-[var(--text-secondary)]">
              Select an entry to read it.
            </div>
          )}
        </div>
      </div>

      <AddEntryModal open={adding} onClose={() => setAdding(false)} onSaved={refresh} />
    </PageContainer>
  );
}

function AddEntryModal({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [category, setCategory] = useState<KnowledgeCategory>("company");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const save = async () => {
    setSaving(true);
    setErr(null);
    try {
      await api.createKnowledge({
        category,
        title: title.trim(),
        content: content.trim(),
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      });
      setTitle("");
      setContent("");
      setTags("");
      onSaved();
      onClose();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent wide title="Add knowledge entry">
        <div className="space-y-3 text-sm">
          <Field label="Category">
            <SelectNative value={category} onChange={(e) => setCategory(e.target.value as KnowledgeCategory)}>
              <option value="company">company</option>
              <option value="product">product</option>
              <option value="customers">customers</option>
              <option value="competitors">competitors</option>
              <option value="market">market</option>
              <option value="decisions">decisions</option>
              <option value="other">other</option>
            </SelectNative>
          </Field>
          <Field label="Title">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </Field>
          <Field label="Tags (comma separated)">
            <Input value={tags} onChange={(e) => setTags(e.target.value)} />
          </Field>
          <Field label="Content">
            <Textarea rows={8} value={content} onChange={(e) => setContent(e.target.value)} />
          </Field>
          {err ? <div className="text-xs text-[var(--accent-red)]">{err}</div> : null}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" loading={saving} onClick={save}>
              Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-[10px] uppercase tracking-wide text-[var(--text-tertiary)]">{label}</div>
      {children}
    </div>
  );
}
