"use client";
import { useState } from "react";
import { useScroll, useMotionValueEvent } from "framer-motion";
import { List, X } from "@phosphor-icons/react";
import { NAV_LINKS, SITE } from "@/lib/content";

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { scrollY } = useScroll();
  useMotionValueEvent(scrollY, "change", (v) => setScrolled(v > 24));
  return (
    <header className={`fixed inset-x-0 top-0 z-50 border-b backdrop-blur-xl transition-colors duration-300 ${scrolled ? "border-accent/15 bg-void/95" : "border-white/5 bg-void/80"}`}>
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6" aria-label="Main">
        <a href="#top" className="font-display text-lg font-bold tracking-tight text-white">
          {SITE.shortName}
          <span className="ml-2 hidden rounded-full border border-accent/40 px-2 py-0.5 text-[10px] font-semibold text-accent sm:inline">{SITE.year}</span>
        </a>
        <div className="hidden items-center gap-6 lg:flex">
          {NAV_LINKS.map((l) => (
            <a key={l.href} href={l.href} className="text-sm text-slate-300 transition hover:text-accent">
              {l.label}
            </a>
          ))}
          <a
            href={SITE.registrationUrl}
            className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-black transition hover:brightness-110 active:scale-[0.98]"
          >
            Register
          </a>
        </div>
        <button
          className="rounded-lg border border-white/10 p-2 text-white lg:hidden"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-label="Toggle menu"
        >
          {open ? <X size={20} /> : <List size={20} />}
        </button>
      </nav>
      {open && (
        <div className="border-t border-white/5 bg-void/95 px-4 py-4 lg:hidden">
          <div className="grid gap-1">
            {NAV_LINKS.map((l) => (
              <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 text-sm text-slate-200 hover:bg-white/5">
                {l.label}
              </a>
            ))}
            <a href={SITE.registrationUrl} className="mt-2 rounded-full bg-accent px-5 py-2.5 text-center text-sm font-semibold text-black">
              Register your team
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
