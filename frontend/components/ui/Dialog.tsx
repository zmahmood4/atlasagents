"use client";

import * as Dlg from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Dialog = Dlg.Root;
export const DialogTrigger = Dlg.Trigger;

export function DialogContent({
  children,
  className,
  title,
  description,
  wide,
}: {
  children: React.ReactNode;
  className?: string;
  title?: string;
  description?: string;
  wide?: boolean;
}) {
  return (
    <Dlg.Portal>
      <Dlg.Overlay className="fixed inset-0 z-40 bg-black/60 data-[state=open]:animate-in data-[state=open]:fade-in" />
      <Dlg.Content
        className={cn(
          "fixed left-1/2 top-1/2 z-50 w-full -translate-x-1/2 -translate-y-1/2 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] p-5 shadow-2xl focus:outline-none",
          wide ? "max-w-3xl" : "max-w-lg",
          className,
        )}
      >
        {title ? (
          <Dlg.Title className="mb-1 text-sm font-semibold text-[var(--text-primary)]">{title}</Dlg.Title>
        ) : null}
        {description ? (
          <Dlg.Description className="mb-3 text-xs text-[var(--text-secondary)]">
            {description}
          </Dlg.Description>
        ) : null}
        {children}
        <Dlg.Close
          className="absolute right-3 top-3 rounded p-1 text-[var(--text-tertiary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </Dlg.Close>
      </Dlg.Content>
    </Dlg.Portal>
  );
}
