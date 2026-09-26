import { Reveal, SectionHeading } from "./Reveal";
import { SITE } from "@/lib/content";

// Placeholder: full tier cards + logo wall removed.
// Tier data is preserved in lib/content.ts (SPONSOR_TIERS) — restore when ready.
export default function Sponsors() {
  return (
    <section id="sponsors" className="scroll-mt-20 border-y border-white/5 bg-navy/40 py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeading title="Sponsors — announcing soon" sub="We're lining up partners who want to meet 200+ builders. Check back shortly." />
        <Reveal className="text-center">
          <div className="glass mx-auto max-w-3xl rounded-2xl border-dashed p-8">
            <p className="font-display text-xl font-bold text-white">Sponsor wall coming soon.</p>
            <p className="mt-2 text-sm text-muted">Tiers and confirmed logos will appear here once announced.</p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <a href={SITE.sponsorFormUrl} target="_blank" rel="noreferrer" className="rounded-full bg-accent px-8 py-3 text-sm font-bold text-black shadow-glow hover:brightness-110">
                Become a Sponsor →
              </a>
              <a href={`mailto:${SITE.sponsorEmail}`} className="rounded-full border border-white/15 px-8 py-3 text-sm font-semibold text-white hover:border-accent/50">
                {SITE.sponsorEmail}
              </a>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
