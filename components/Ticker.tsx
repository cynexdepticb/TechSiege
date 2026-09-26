import { SITE } from "@/lib/content";

// Single marquee on the page: event-energy ticker between hero and content.
// Duplicated list + -50% loop = seamless. Disabled under reduced motion.
export default function Ticker() {
  const items = [...SITE.tagline.split(". ").map((w) => w.replace(".", "")), "24 Hours", SITE.datesDisplay, SITE.city];
  const row = [...items, ...items];
  return (
    <div className="overflow-hidden border-y border-white/5 bg-navy/60 py-3" aria-hidden="true">
      <div className="animate-marquee flex w-max items-center gap-8 whitespace-nowrap hover:[animation-play-state:paused] motion-reduce:animate-none">
        {row.map((item, i) => (
          <span key={i} className="flex items-center gap-8">
            <span className="font-display text-xs font-bold uppercase tracking-[0.3em] text-slate-400">{item}</span>
            <span className="h-1 w-1 rounded-full bg-accent" />
          </span>
        ))}
      </div>
    </div>
  );
}
