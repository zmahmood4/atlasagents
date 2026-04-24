"use client";

import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-blue)]",
  {
    variants: {
      variant: {
        primary: "bg-[var(--accent-blue)] hover:bg-[var(--accent-blue)]/90 text-white",
        secondary: "bg-[var(--bg-elevated)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] border border-[var(--border)]",
        ghost: "bg-transparent hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)]",
        danger: "bg-[var(--accent-red)] hover:bg-[var(--accent-red)]/90 text-white",
        approve: "bg-[var(--accent-emerald)] hover:bg-[var(--accent-emerald)]/90 text-white",
        reject: "bg-[var(--accent-red)] hover:bg-[var(--accent-red)]/90 text-white",
        redirect: "bg-[var(--accent-blue)] hover:bg-[var(--accent-blue)]/90 text-white",
      },
      size: {
        default: "px-3.5 py-1.5",
        sm: "px-2.5 py-1 text-xs",
        lg: "px-5 py-2.5 text-base",
        icon: "h-8 w-8",
      },
    },
    defaultVariants: { variant: "primary", size: "default" },
  },
);

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild, loading, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        disabled={disabled || loading}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      >
        {loading ? (
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/60 border-t-transparent" />
        ) : null}
        {children}
      </Comp>
    );
  },
);
Button.displayName = "Button";
