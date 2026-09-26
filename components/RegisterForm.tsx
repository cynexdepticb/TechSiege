"use client";
import { useState } from "react";
import { SITE, TRACKS } from "@/lib/content";

const API = process.env.NEXT_PUBLIC_API_BASE ?? SITE.backendApiBaseUrl;

type Member = { fullName: string; email: string; phone: string; branchYear: string };
const emptyMember = (): Member => ({ fullName: "", email: "", phone: "", branchYear: "" });

export default function RegisterForm() {
  const [teamName, setTeamName] = useState("");
  const [institution, setInstitution] = useState("");
  const [city, setCity] = useState("");
  const [trackId, setTrackId] = useState(TRACKS[0].id);
  const [projectIdea, setProjectIdea] = useState("");
  const [members, setMembers] = useState<Member[]>([emptyMember(), emptyMember()]);
  const [agree, setAgree] = useState(false);
  const [status, setStatus] = useState<{ type: "idle" | "loading" | "error" | "success"; message?: string; teamId?: string }>({ type: "idle" });

  const setMember = (i: number, patch: Partial<Member>) =>
    setMembers((ms) => ms.map((m, j) => (j === i ? { ...m, ...patch } : m)));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus({ type: "loading" });
    try {
      const res = await fetch(`${API}/api/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamName, institution, city, trackId, projectIdea, members, agreeRules: agree }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        const msg = data.errors?.map((x: { message: string }) => x.message).join(" · ") ?? data.message ?? "Something went wrong.";
        setStatus({ type: "error", message: msg });
        return;
      }
      setStatus({ type: "success", teamId: data.teamId, message: data.teamName });
    } catch {
      setStatus({ type: "error", message: "Could not reach the server. Check your connection and try again." });
    }
  }

  if (status.type === "success") {
    return (
      <div className="glass mx-auto max-w-xl rounded-2xl p-8 text-center sm:p-12">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-lime2/15 text-2xl text-lime2">✓</div>
        <h2 className="font-display text-2xl font-bold text-white">Team {status.message} is in! 🎉</h2>
        <p className="mt-3 text-sm text-muted">Registration ID <span className="font-mono text-accent">{status.teamId}</span> — save it. Confirmation details will be sent to your lead&apos;s email.</p>
        <a href="/" className="mt-8 inline-block rounded-full border border-white/15 px-8 py-3 text-sm font-semibold text-white hover:border-accent/50">← Back to site</a>
      </div>
    );
  }

  const input = "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-accent/60 focus:outline-none";

  return (
    <form onSubmit={submit} className="mx-auto max-w-3xl space-y-6">
      <fieldset className="glass rounded-2xl p-6">
        <legend className="font-display px-2 text-base font-bold text-white">Team details</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block"> <span className="mb-1 block text-xs font-semibold text-slate-300">Team name *</span>
            <input required minLength={2} maxLength={80} value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="e.g. AgentSmiths" className={input} />
          </label>
          <label className="block"> <span className="mb-1 block text-xs font-semibold text-slate-300">Institution *</span>
            <input required minLength={2} value={institution} onChange={(e) => setInstitution(e.target.value)} placeholder="College name" className={input} />
          </label>
          <label className="block"> <span className="mb-1 block text-xs font-semibold text-slate-300">City</span>
            <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Mangaluru" className={input} />
          </label>
          <label className="block"> <span className="mb-1 block text-xs font-semibold text-slate-300">Preferred track *</span>
            <select value={trackId} onChange={(e) => setTrackId(e.target.value)} className={`${input} [&>option]:bg-navy`}>
              {TRACKS.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
            </select>
          </label>
          <label className="block sm:col-span-2"> <span className="mb-1 block text-xs font-semibold text-slate-300">Project idea <span className="font-normal text-muted">(optional, helps mentors)</span></span>
            <textarea rows={3} maxLength={1000} value={projectIdea} onChange={(e) => setProjectIdea(e.target.value)} placeholder="What agentic system do you want to build?" className={input} />
          </label>
        </div>
      </fieldset>

      <fieldset className="glass rounded-2xl p-6">
        <legend className="font-display px-2 text-base font-bold text-white">Members · {members.length}/4 <span className="text-xs font-normal text-muted">(first = team lead)</span></legend>
        <div className="space-y-5">
          {members.map((m, i) => (
            <div key={i} className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-widest text-accent">{i === 0 ? "Team lead" : `Member ${i + 1}`}</p>
                {members.length > 2 && (
                  <button type="button" onClick={() => setMembers((ms) => ms.filter((_, j) => j !== i))} className="text-xs text-slate-400 hover:text-red-400" aria-label={`Remove member ${i + 1}`}>Remove ✕</button>
                )}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block"> <span className="mb-1 block text-xs font-semibold text-slate-300">Full name *</span>
                  <input required minLength={2} value={m.fullName} onChange={(e) => setMember(i, { fullName: e.target.value })} className={input} />
                </label>
                <label className="block"> <span className="mb-1 block text-xs font-semibold text-slate-300">Email *</span>
                  <input required type="email" value={m.email} onChange={(e) => setMember(i, { email: e.target.value })} className={input} />
                </label>
                <label className="block"> <span className="mb-1 block text-xs font-semibold text-slate-300">Phone *</span>
                  <input required value={m.phone} onChange={(e) => setMember(i, { phone: e.target.value })} placeholder="+91 …" className={input} />
                </label>
                <label className="block"> <span className="mb-1 block text-xs font-semibold text-slate-300">Branch & year</span>
                  <input value={m.branchYear} onChange={(e) => setMember(i, { branchYear: e.target.value })} placeholder="e.g. CSE · 3rd year" className={input} />
                </label>
              </div>
            </div>
          ))}
        </div>
        {members.length < 4 && (
          <button type="button" onClick={() => setMembers((ms) => [...ms, emptyMember()])} className="mt-4 w-full rounded-xl border border-dashed border-accent/40 py-2.5 text-sm text-accent transition hover:bg-accent/10">
            + Add member ({members.length}/4)
          </button>
        )}
      </fieldset>

      <label className="glass flex cursor-pointer items-start gap-3 rounded-2xl p-5 text-xs leading-relaxed text-slate-300">
        <input type="checkbox" required checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 h-4 w-4 accent-cyan-400" />
        <span>We built this during the 24 hours; we&apos;ll declare all APIs, models and pre-existing code; and we agree to the event rules and code of conduct. *</span>
      </label>

      {status.type === "error" && (
        <p role="alert" className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-300">{status.message}</p>
      )}

      <button type="submit" disabled={status.type === "loading"}
        className="w-full rounded-full bg-accent py-4 text-sm font-bold text-black shadow-glow transition hover:-translate-y-0.5 disabled:opacity-60">
        {status.type === "loading" ? "Registering…" : "Register Team →"}
      </button>
    </form>
  );
}
