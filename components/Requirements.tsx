import { Reveal, SectionHeading } from "./Reveal";
import { REQUIREMENTS } from "@/lib/content";
import { Check } from "@phosphor-icons/react/dist/ssr";

export default function Requirements() {
  return (
    <section id="requirements" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-20 sm:px-6">
      <div className="max-w-3xl">
        <SectionHeading
          align="left"
          title="The bar for evaluation"
          sub="Screening judges check every submission against this list. Miss the core, miss the finals."
        />
        <ol className="border-t border-white/10">
          {REQUIREMENTS.map((r, i) => (
            <Reveal key={r.title} delay={Math.min(i * 0.04, 0.2)}>
              <li className="flex items-baseline gap-4 border-b border-white/10 py-5">
                <span className="font-mono text-xs text-muted" aria-hidden="true">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="flex-1">
                  <h3 className="text-[15px] font-semibold text-white">{r.title}</h3>
                  <p className="mt-1 max-w-[65ch] text-sm leading-relaxed text-muted">{r.desc}</p>
                </div>
                <Check size={18} weight="bold" className="shrink-0 self-center text-accent" aria-hidden="true" />
              </li>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}
