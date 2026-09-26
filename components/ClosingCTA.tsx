import Countdown from "./Countdown";
import { SITE } from "@/lib/content";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";

export default function ClosingCTA() {
  return (
    <section id="register" className="relative scroll-mt-20 overflow-hidden border-t border-white/5 py-24">
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-96 w-[50rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet2/15 blur-[120px]" aria-hidden="true" />
      <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">Final call</p>
        <h2 className="font-display mt-3 text-4xl font-bold text-white sm:text-5xl">
          50+ teams.<br />One arena. <span className="text-gradient">24 hours.</span>
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-sm text-muted sm:text-base">
          Registrations close when slots fill. {SITE.datesDisplay} · {SITE.venue}. Bring your crew, your keys, your ambition.
        </p>
        <div className="mt-8"><Countdown /></div>
        <div className="mt-8 flex justify-center">
          <a href={SITE.registrationUrl} className="inline-flex items-center justify-center gap-2 rounded-full bg-accent px-10 py-4 text-sm font-bold text-black transition hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0 active:scale-[0.98]">
            Register your team <ArrowRight size={16} weight="bold" />
          </a>
        </div>
      </div>
      <footer className="relative mx-auto mt-20 max-w-7xl border-t border-white/5 px-4 pt-10 sm:px-6">
        <div className="grid gap-8 text-sm sm:grid-cols-3">
          <div>
            <p className="font-display text-lg font-bold text-white">{SITE.name}</p>
            <p className="mt-2 text-xs text-muted">Build. Automate. Act.<br />{SITE.venue}<br />{SITE.datesDisplay}</p>
          </div>
          <nav aria-label="Footer">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Explore</p>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-300">
              <a href="#about" className="hover:text-accent">About</a>
              <a href="#tracks" className="hover:text-accent">Tracks</a>
              <a href="#schedule" className="hover:text-accent">Schedule</a>
              <a href="#judging" className="hover:text-accent">Judging</a>
              <a href="#awards" className="hover:text-accent">Awards</a>
              <a href="#sponsors" className="hover:text-accent">Sponsors</a>
            </div>
          </nav>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Contact</p>
            <div className="mt-3 space-y-2 text-xs text-slate-300">
              <p><a className="hover:text-accent" href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a></p>
            </div>
          </div>
        </div>
        <p className="mt-10 border-t border-white/5 pt-6 text-center text-[11px] text-muted">© {SITE.year} {SITE.shortName} · Student-run hackathon, Mangaluru · {SITE.datesDisplay}</p>
      </footer>
    </section>
  );
}
