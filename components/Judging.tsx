"use client";
import { motion } from "framer-motion";
import { Reveal, SectionHeading } from "./Reveal";
import { JUDGING } from "@/lib/content";

export default function Judging() {
  return (
    <section id="judging" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-20 sm:px-6">
      <SectionHeading title="How winners are picked" sub="Weighted rubric, published upfront. Agentic depth counts the most." />
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="glass rounded-2xl p-6 sm:p-8">
          <div className="space-y-5">
            {JUDGING.map((j, i) => (
              <div key={j.label}>
                <div className="mb-1.5 flex items-baseline justify-between text-sm">
                  <span className="font-semibold text-white">{j.label}</span>
                  <span className="font-mono font-bold text-accent">{j.weight}%</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-white/5" role="img" aria-label={`${j.label} ${j.weight} percent`}>
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: `${j.weight * 3}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, delay: i * 0.08 }}
                    className="h-full rounded-full bg-gradient-to-r from-accent to-violet2"
                  />
                </div>
                <p className="mt-1 text-xs text-muted">{j.desc}</p>
              </div>
            ))}
          </div>
        </div>
        <Reveal className="glass flex flex-col items-center justify-center rounded-2xl p-8 text-center">
          <div className="relative h-48 w-48" role="img" aria-label="Donut chart: agentic capability is the largest judging slice at 25 percent">
            <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
              {(() => {
                let acc = 0;
                const colors = ["#22d3ee", "#8b5cf6", "#a3e635", "#f59e0b", "#f472b6", "#64748b"];
                return JUDGING.map((j, i) => {
                  const frac = j.weight / 100;
                  const el = (
                    <circle key={j.label} cx="50" cy="50" r="38" fill="none" stroke={colors[i]} strokeWidth="11"
                      strokeDasharray={`${frac * 238.76} 238.76`} strokeDashoffset={-acc * 238.76} strokeLinecap="butt" />
                  );
                  acc += frac;
                  return el;
                });
              })()}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-display text-3xl font-bold text-white">25%</span>
              <span className="text-[10px] uppercase tracking-widest text-muted">Agentic<br />Capability</span>
            </div>
          </div>
          <p className="mt-6 max-w-sm text-sm text-muted">A technically brilliant demo with no tool use, memory or planning caps at 75. Build the agent, not the slides.</p>
        </Reveal>
      </div>
    </section>
  );
}
