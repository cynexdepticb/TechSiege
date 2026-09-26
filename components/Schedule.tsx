"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Reveal, SectionHeading } from "./Reveal";
import { SCHEDULE } from "@/lib/content";

export default function Schedule() {
  const [day, setDay] = useState(0);
  const active = SCHEDULE[day];
  return (
    <section id="schedule" className="scroll-mt-20 border-y border-white/5 bg-navy/40 py-20">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <SectionHeading kicker="Timeline" title="24 hours, minute by minute" sub="08:00 AM kickoff on Day 1 → awards by 05:30 PM on Day 2. Tabs switch between days." />
        <Reveal className="mb-8 flex justify-center gap-2">
          {SCHEDULE.map((d, i) => (
            <button
              key={d.day}
              onClick={() => setDay(i)}
              aria-pressed={day === i}
              className={`rounded-full px-6 py-2.5 text-sm font-semibold transition ${
                day === i ? "bg-accent text-black shadow-glow" : "border border-white/10 bg-white/5 text-slate-300 hover:border-accent/40"
              }`}
            >
              {d.day} · {d.date}
            </button>
          ))}
        </Reveal>
        <AnimatePresence mode="wait">
          <motion.ol
            key={day}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
            className="relative space-y-0 border-l-2 border-accent/30 pl-0"
          >
            {active.items.map((it) => (
              <li key={it.time + it.title} className="relative pb-6 pl-8 last:pb-0">
                <span className="absolute -left-[7px] top-1 h-3 w-3 rounded-full bg-accent shadow-glow" aria-hidden="true" />
                <div className="glass rounded-xl p-4 transition hover:border-accent/40 sm:flex sm:items-baseline sm:gap-4">
                  <time className="shrink-0 font-mono text-xs font-bold text-accent">{it.time}</time>
                  <div>
                    <h3 className="text-sm font-bold text-white">{it.title}</h3>
                    <p className="mt-0.5 text-xs text-muted">{it.desc}</p>
                  </div>
                </div>
              </li>
            ))}
          </motion.ol>
        </AnimatePresence>
      </div>
    </section>
  );
}
