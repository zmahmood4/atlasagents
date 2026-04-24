import "./globals.css";
import type { Metadata, Viewport } from "next";
import { DM_Mono, Instrument_Sans, Orbitron } from "next/font/google";

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

const display = Orbitron({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-display",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#080c14",
  colorScheme: "dark",
};

export const metadata: Metadata = {
  title: "ATLAS AI",
  description: "Mission control for your autonomous AI business team. 13 agents. Constant work.",
  applicationName: "ATLAS AI",
  appleWebApp: {
    capable: true,
    title: "ATLAS AI",
    statusBarStyle: "black-translucent",
    startupImage: [],
  },
  formatDetection: { telephone: false },
  manifest: "/manifest.json",
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icons/icon-192.svg", sizes: "192x192", type: "image/svg+xml" }],
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" className={`${ui.variable} ${mono.variable} ${display.variable}`}>
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-touch-fullscreen" content="yes" />
        <link rel="manifest" href="/manifest.json" />
        <script dangerouslySetInnerHTML={{ __html: `if('serviceWorker'in navigator){window.addEventListener('load',()=>{navigator.serviceWorker.register('/sw.js').catch(()=>{});})}` }} />
      </head>
      <body className="font-sans overscroll-none">
        {children}
      </body>
    </html>
  );
}
