import { Reveal, SectionHeading } from "./Reveal";
import { TRACKS } from "@/lib/content";
import {
  Robot,
  GraduationCap,
  FirstAid,
  ChartLineUp,
  HandsClapping,
  Code,
  ArrowUpRight,
} from "@phosphor-icons/react/dist/ssr";

const ICONS: Record<string, typeof Robot> = {
  autonomous: Robot,
  education: GraduationCap,
  healthcare: FirstAid,
  finance: ChartLineUp,
  social: HandsClapping,
  devagents: Code,
};

export default function Tracks() {
  return (
    <section id="tracks" className="relative scroll-mt-20 border-y border-white/5 bg-navy/40 py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeading
          align="left"
          title="Six arenas. Pick your mission."
          sub="Every track expects working agentic behaviour — tool use, planning and memory — applied to a real problem."
        />
        <ol className="grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-3">
          {TRACKS.map((t, i) => {
            const Icon = ICONS[t.id] ?? Robot;
            return (
              <Reveal key={t.id} delay={(i % 3) * 0.06} className="h-full">
                <li className="group flex h-full flex-col bg-void p-6 transition-colors duration-300 hover:bg-panel sm:p-7">
                  <div className="flex items-start justify-between">
                    <span className="font-mono text-xs text-muted" aria-hidden="true">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <Icon size={24} weight="duotone" className="text-slate-500 transition-colors group-hover:text-accent" aria-hidden="true" />
                  </div>
                  <h3 className="font-display mt-8 text-xl font-bold tracking-tight text-white">
                    {t.title}
                    <ArrowUpRight size={16} className="ml-1.5 inline text-muted opacity-0 transition group-hover:text-accent group-hover:opacity-100" aria-hidden="true" />
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{t.desc}</p>
                  <p className="mt-4 text-xs leading-relaxed text-slate-400">{t.examples.join(" · ")}</p>
                </li>
              </Reveal>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
