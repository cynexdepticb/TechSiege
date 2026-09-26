import { Reveal, SectionHeading } from "./Reveal";
import { AWARDS, SUBMISSION, SITE } from "@/lib/content";
import { Trophy } from "@phosphor-icons/react/dist/ssr";

export function Awards() {
  const [featured, ...rest] = AWARDS;
  return (
    <section id="awards" className="scroll-mt-20 border-y border-white/5 bg-navy/40 py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeading kicker="Awards" title="Glory and prize pool" sub="Indicative amounts — the final pool scales with sponsorships. Every finalist gets stage time." />
        <Reveal>
          <div className="flex flex-col gap-4 rounded-2xl border border-accent/25 bg-accent/[0.06] p-7 sm:flex-row sm:items-center sm:justify-between sm:p-9">
            <div className="flex items-start gap-4">
              <Trophy size={32} weight="duotone" className="mt-1 shrink-0 text-accent" aria-hidden="true" />
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-accent">Featured</p>
                <h3 className="font-display mt-1 text-2xl font-bold tracking-tight text-white">{featured.title}</h3>
                <p className="mt-1 text-sm text-muted">{featured.desc}</p>
              </div>
            </div>
            <p className="font-mono text-xl font-bold text-lime2 sm:text-right">{featured.prize}</p>
          </div>
        </Reveal>
        <ul className="mt-4 grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-2">
          {rest.map((a, i) => (
            <Reveal key={a.title} delay={Math.min((i % 2) * 0.06, 0.12)} className="h-full">
              <li className="flex h-full items-baseline justify-between gap-4 bg-void px-6 py-5">
                <div>
                  <h3 className="text-[15px] font-semibold text-white">{a.title}</h3>
                  <p className="mt-0.5 text-xs text-muted">{a.desc}</p>
                </div>
                <span className="shrink-0 font-mono text-sm font-bold text-accent">{a.prize}</span>
              </li>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function Submission() {
  return (
    <section id="submission" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-20 sm:px-6">
      <div className="max-w-3xl">
        <SectionHeading
          align="left"
          title="What you ship on Day 2"
          sub="Submission closes 11:00 AM. Incomplete entries don't advance to screening."
        />
        <ol className="border-t border-white/10">
          {SUBMISSION.map((s, i) => (
            <Reveal key={s} delay={Math.min(i * 0.04, 0.2)}>
              <li className="flex items-baseline gap-4 border-b border-white/10 py-4">
                <span className="font-mono text-xs text-accent" aria-hidden="true">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <p className="text-sm leading-relaxed text-slate-200">{s}</p>
              </li>
            </Reveal>
          ))}
        </ol>
        <p className="mt-4 text-xs text-muted">
          Portal link shared at kickoff · Questions? <a className="text-accent underline underline-offset-4" href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a>
        </p>
      </div>
    </section>
  );
}
