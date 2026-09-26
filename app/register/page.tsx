import type { Metadata } from "next";
import RegisterForm from "@/components/RegisterForm";
import { SITE } from "@/lib/content";

export const metadata: Metadata = {
  title: `Register — ${SITE.name}`,
  description: `Register your 2–4 member team for ${SITE.name}, the 24-hour AI-agent hackathon in Mangaluru.`,
};

export default function RegisterPage() {
  return (
    <>
      <header className="border-b border-white/5 bg-void/80 backdrop-blur-xl">
        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6" aria-label="Register">
          <a href="/" className="font-display text-lg font-bold tracking-tight text-white">
            {SITE.shortName}
            <span className="ml-2 rounded-full border border-accent/40 px-2 py-0.5 text-[10px] font-semibold text-accent">{SITE.year}</span>
          </a>
          <a href="/" className="text-sm text-slate-300 transition hover:text-accent">← Back to site</a>
        </nav>
      </header>
      <main className="relative overflow-hidden">
        <div className="bg-grid absolute inset-0" aria-hidden="true" />
        <div className="pointer-events-none absolute left-1/2 top-0 h-72 w-[50rem] -translate-x-1/2 rounded-full bg-accent/10 blur-[120px]" aria-hidden="true" />
        <div className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6">
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-accent">Registration</p>
            <h1 className="font-display text-3xl font-bold text-white sm:text-4xl">Register your team</h1>
          </div>
          <RegisterForm />
        </div>
      </main>
    </>
  );
}
