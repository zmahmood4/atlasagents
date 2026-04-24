import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Department, Importance } from "./types";

export function cn(...xs: ClassValue[]): string {
  return twMerge(clsx(xs));
}

export function formatRelative(iso: string | null | undefined): string {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";
  const diff = Date.now() - then;
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hr ago`;
  const d = Math.floor(h / 24);
  return `${d} day${d === 1 ? "" : "s"} ago`;
}

export function formatWaiting(iso: string): string {
  const then = new Date(iso).getTime();
  const m = Math.max(0, Math.floor((Date.now() - then) / 60_000));
  if (m < 60) return `Waiting ${m} min`;
  const h = Math.floor(m / 60);
  return `Waiting ${h}h ${m % 60}m`;
}

export function formatUsd(n: number | null | undefined): string {
  const v = Number(n ?? 0);
  if (v === 0) return "£0.00";
  return `£${v < 1 ? v.toFixed(4) : v.toFixed(2)}`;
}

// Alias kept for backward compat — UK uses GBP throughout
export const formatGBP = formatUsd;

export function formatInt(n: number | null | undefined): string {
  return Number(n ?? 0).toLocaleString();
}

export function percent(used: number, cap: number): number {
  if (!cap) return 0;
  return Math.min(100, (used / cap) * 100);
}

export function initials(name: string): string {
  const clean = name.replace(/[_\-]+/g, " ").split(" ").filter(Boolean);
  if (clean.length === 1) return clean[0].slice(0, 2).toUpperCase();
  return (clean[0][0] + (clean[1]?.[0] || "")).toUpperCase();
}

export const DEPARTMENT_COLOR: Record<Department, string> = {
  command: "var(--dept-command)",
  product: "var(--dept-product)",
  engineering: "var(--dept-engineering)",
  gtm: "var(--dept-gtm)",
  ops: "var(--dept-ops)",
};

export const DEPARTMENT_LABEL: Record<Department, string> = {
  command: "Command",
  product: "Product",
  engineering: "Engineering",
  gtm: "Go-To-Market",
  ops: "Ops",
};

export function importanceBorder(importance: Importance | string): string {
  switch (importance) {
    case "critical":
      return "border-l-[var(--accent-red)]";
    case "high":
      return "border-l-[var(--accent-amber)]";
    case "low":
      return "border-l-[var(--text-tertiary)]";
    default:
      return "border-l-[var(--accent-blue)]";
  }
}
