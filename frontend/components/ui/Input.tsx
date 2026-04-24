"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "w-full rounded-md bg-[var(--bg-surface)] border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--border-active)]",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "w-full rounded-md bg-[var(--bg-surface)] border border-[var(--border)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--border-active)]",
      className,
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export const SelectNative = forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      "w-full rounded-md bg-[var(--bg-surface)] border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-active)]",
      className,
    )}
    {...props}
  />
));
SelectNative.displayName = "SelectNative";
