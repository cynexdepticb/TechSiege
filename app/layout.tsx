import type { Metadata } from "next";
import { Space_Grotesk, Inter } from "next/font/google";
import "./globals.css";
import { SITE } from "@/lib/content";

const display = Space_Grotesk({ subsets: ["latin"], variable: "--font-display", display: "swap" });
const body = Inter({ subsets: ["latin"], variable: "--font-body", display: "swap" });

export const metadata: Metadata = {
  title: `${SITE.name} — Build. Automate. Act. | 24-Hour AI Agent Hackathon, Mangaluru`,
  description: `${SITE.name} is a 24-hour offline AI-agent hackathon in Mangaluru. 200+ builders, 50+ teams, 6 tracks. Build real agentic AI systems — not chatbot wrappers.`,
  metadataBase: new URL("https://agentx2026.example.com"),
  openGraph: {
    title: `${SITE.name} — Build. Automate. Act.`,
    description: "24-hour offline AI-agent hackathon · Mangaluru · 200+ participants · 6 tracks",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${body.variable} bg-void font-body antialiased`}>{children}</body>
    </html>
  );
}
