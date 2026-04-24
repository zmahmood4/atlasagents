"use client";

import * as T from "@radix-ui/react-tabs";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export const Tabs = T.Root;

export const TabsList = forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof T.List>
>(({ className, ...props }, ref) => (
  <T.List
    ref={ref}
    className={cn(
      "inline-flex items-center gap-1 rounded-md bg-[var(--bg-surface)] p-1 border border-[var(--border)]",
      className,
    )}
    {...props}
  />
));
TabsList.displayName = "TabsList";

export const TabsTrigger = forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof T.Trigger>
>(({ className, ...props }, ref) => (
  <T.Trigger
    ref={ref}
    className={cn(
      "rounded px-3 py-1 text-xs font-medium capitalize transition data-[state=active]:bg-[var(--bg-elevated)] data-[state=active]:text-[var(--text-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
      className,
    )}
    {...props}
  />
));
TabsTrigger.displayName = "TabsTrigger";

export const TabsContent = T.Content;
