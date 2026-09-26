import type { Metadata } from "next";
import AdminDashboard from "@/components/AdminDashboard";
import { SITE } from "@/lib/content";

export const metadata: Metadata = {
  title: `Organizer dashboard — ${SITE.name}`,
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return (
    <>
      <header className="border-b border-white/5 bg-void/80 backdrop-blur-xl">
        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6" aria-label="Organizer">
          <a href="/" className="font-display text-lg font-bold tracking-tight text-white">
            {SITE.shortName}
            <span className="ml-2 rounded-full border border-accent/40 px-2 py-0.5 text-[10px] font-semibold text-accent">
              Organizer
            </span>
          </a>
          <a href="/" className="text-sm text-slate-300 transition hover:text-accent">← Back to site</a>
        </nav>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <AdminDashboard />
      </main>
    </>
  );
}
