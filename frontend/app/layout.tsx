import "./globals.css";
import type { Metadata } from "next";
import { DM_Mono, Instrument_Sans } from "next/font/google";

const ui = Instrument_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-ui",
  display: "swap",
});

const mono = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ATLAS",
  description: "Mission control for a fully autonomous AI-native micro-SaaS studio.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${ui.variable} ${mono.variable}`}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
