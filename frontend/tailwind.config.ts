import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./hooks/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        "bg-base": "var(--bg-base)",
        "bg-surface": "var(--bg-surface)",
        "bg-elevated": "var(--bg-elevated)",
        "bg-hover": "var(--bg-hover)",
        border: "var(--border)",
        "border-active": "var(--border-active)",
        "text-primary": "var(--text-primary)",
        "text-secondary": "var(--text-secondary)",
        "text-tertiary": "var(--text-tertiary)",
        "accent-blue": "var(--accent-blue)",
        "accent-blue-dim": "var(--accent-blue-dim)",
        "accent-amber": "var(--accent-amber)",
        "accent-emerald": "var(--accent-emerald)",
        "accent-red": "var(--accent-red)",
        "accent-purple": "var(--accent-purple)",
        "dept-command": "var(--dept-command)",
        "dept-product": "var(--dept-product)",
        "dept-engineering": "var(--dept-engineering)",
        "dept-gtm": "var(--dept-gtm)",
        "dept-ops": "var(--dept-ops)",
      },
      fontFamily: {
        sans: ["var(--font-ui)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
