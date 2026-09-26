"use client";
import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Download, SignOut, ChartBar, UsersThree, Buildings, ArrowClockwise } from "@phosphor-icons/react";

const KEY = "cynex_admin_token";

type Stats = {
  generatedAt: string;
  totals: {
    teams: number; members: number; institutions: number; uniqueEmails: number;
    maxTeams: number; slotsLeft: number; capacityPct: number; avgTeamSize: number;
    last24h: number; membersLast24h: number;
  };
  byTrack: { id: string; label: string; count: number }[];
  byInstitution: { institution: string; n: number }[];
  byCity: { city: string; n: number }[];
  byDay: { day: string; iso: string; n: number }[];
  byTeamSize: { team_size: number; n: number }[];
  recent: {
    id: string; team_name: string; institution: string; city: string;
    track_label: string; project_idea: string; created_at: string;
    member_count: number; lead_name: string; lead_email: string; lead_phone: string;
  }[];
};

const bar = (pct: number) => ({ initial: { width: 0 }, whileInView: { width: `${pct}%` }, viewport: { once: true }, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] as const } });

function HBar({ label, value, max }: { label: string; value: number; max: number }) {
  return (
    <li>
      <div className="flex items-baseline justify-between gap-4 text-sm">
        <span className="truncate text-slate-200">{label}</span>
        <span className="shrink-0 font-mono text-xs text-muted">{value}</span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/5">
        <motion.div {...bar(max ? (value / max) * 100 : 0)} className="h-full rounded-full bg-accent" />
      </div>
    </li>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/10 p-6">
      <h2 className="text-sm font-semibold text-white">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export default function AdminDashboard() {
  const [token, setToken] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (t: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/stats", { headers: { Authorization: `Bearer ${t}` } });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setStats(null);
        setError(data.message ?? "Could not load analytics.");
        return;
      }
      setStats(data);
    } catch {
      setError("Could not reach the analytics API.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const saved = sessionStorage.getItem(KEY);
    if (saved) {
      setToken(saved);
      load(saved);
    }
  }, [load]);

  async function downloadCsv() {
    if (!token) return;
    const res = await fetch("/api/admin/registrations.csv", { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) {
      setError("Export failed.");
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cynex-registrations-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function signOut() {
    sessionStorage.removeItem(KEY);
    setToken(null);
    setStats(null);
  }

  if (!token) {
    return (
      <div className="mx-auto max-w-md">
        <h1 className="font-display text-3xl font-bold tracking-tight text-white">Organizer access</h1>
        <p className="mt-3 text-sm text-muted">Registration analytics are private. Enter the organizer access token to continue.</p>
        <form
          className="mt-8 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            sessionStorage.setItem(KEY, input.trim());
            setToken(input.trim());
            load(input.trim());
          }}
        >
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-slate-300">Access token</span>
            <input
              type="password"
              required
              autoFocus
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="ADMIN_TOKEN"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-accent/60 focus:outline-none"
            />
          </label>
          {error && <p role="alert" className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-300">{error}</p>}
          <button type="submit" disabled={loading} className="w-full rounded-full bg-accent py-3 text-sm font-bold text-black transition hover:brightness-110 active:scale-[0.98] disabled:opacity-60">
            {loading ? "Checking…" : "Unlock dashboard"}
          </button>
        </form>
        <p className="mt-4 text-xs text-muted">Token lives in this browser tab only and is never bundled into the site. Find it in <code className="text-slate-300">.env.local</code> as <code className="text-slate-300">ADMIN_TOKEN</code>.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-white">Registration analytics</h1>
          {stats && (
            <p className="mt-2 text-sm text-muted">
              Updated {new Date(stats.generatedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <button onClick={() => load(token)} className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm text-slate-200 transition hover:border-accent/50">
            <ArrowClockwise size={16} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
          <button onClick={downloadCsv} className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm text-slate-200 transition hover:border-accent/50">
            <Download size={16} /> Export CSV
          </button>
          <button onClick={signOut} className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm text-slate-200 transition hover:border-red-400/50">
            <SignOut size={16} /> Sign out
          </button>
        </div>
      </div>

      {error && <p role="alert" className="mt-6 rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-300">{error}</p>}

      {!stats && loading && <p className="mt-10 text-sm text-muted">Loading analytics…</p>}

      {stats && (
        <>
          <dl className="mt-10 grid grid-cols-2 gap-x-6 gap-y-8 border-y border-white/5 py-8 lg:grid-cols-4">
            {[
              { k: "Teams", v: `${stats.totals.teams}`, s: `${stats.totals.slotsLeft} slots left of ${stats.totals.maxTeams}` },
              { k: "Members", v: `${stats.totals.members}`, s: `avg ${stats.totals.avgTeamSize} per team` },
              { k: "Colleges", v: `${stats.totals.institutions}`, s: "unique institutions" },
              { k: "Last 24h", v: `${stats.totals.last24h}`, s: `${stats.totals.membersLast24h} members` },
            ].map((x) => (
              <div key={x.k} className="flex flex-col">
                <dd className="font-display order-1 text-4xl font-bold tracking-tight text-white">{x.v}</dd>
                <dt className="order-2 mt-2 text-sm font-semibold text-slate-200">{x.k}</dt>
                <dd className="order-3 mt-1 text-xs text-muted">{x.s}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-4">
            <div className="flex items-baseline justify-between text-xs">
              <span className="font-semibold text-slate-300">Capacity</span>
              <span className="font-mono text-muted">{stats.totals.capacityPct}% of {stats.totals.maxTeams} team slots</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/5">
              <motion.div {...bar(stats.totals.capacityPct)} className="h-full rounded-full bg-accent" />
            </div>
          </div>

          <div className="mt-12 grid gap-4 lg:grid-cols-2">
            <Panel title="Registrations over time">
              {stats.byDay.length === 0 ? (
                <p className="text-sm text-muted">No registrations yet.</p>
              ) : (
                <>
                  <div className="flex h-40 items-end gap-2">
                    {stats.byDay.map((d) => (
                      <div key={d.iso} className="flex flex-1 flex-col items-center gap-2">
                        <span className="font-mono text-[11px] text-slate-300">{d.n}</span>
                        <motion.div
                          initial={{ height: 0 }}
                          whileInView={{ height: `${(d.n / Math.max(...stats.byDay.map((x) => x.n))) * 100}%` }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                          className="w-full rounded-t bg-accent/70"
                        />
                        <span className="text-[10px] text-muted">{d.day}</span>
                      </div>
                    ))}
                  </div>
                  <p className="mt-4 text-xs text-muted">Unique emails: {stats.totals.uniqueEmails} · duplicate signups blocked</p>
                </>
              )}
            </Panel>

            <Panel title="Teams by track">
              {stats.byTrack.length === 0 ? (
                <p className="text-sm text-muted">No data yet.</p>
              ) : (
                <ul className="space-y-4">
                  {stats.byTrack.map((t) => (
                    <HBar key={t.id} label={t.label} value={t.count} max={stats.byTrack[0].count} />
                  ))}
                </ul>
              )}
            </Panel>

            <Panel title="Top institutions">
              {stats.byInstitution.length === 0 ? (
                <p className="text-sm text-muted">No data yet.</p>
              ) : (
                <ul className="space-y-4">
                  {stats.byInstitution.map((i) => (
                    <HBar key={i.institution} label={i.institution} value={i.n} max={stats.byInstitution[0].n} />
                  ))}
                </ul>
              )}
            </Panel>

            <Panel title="Cities and team sizes">
              <div className="grid gap-8 sm:grid-cols-2">
                <div>
                  <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted">Cities</p>
                  {stats.byCity.length === 0 ? (
                    <p className="text-sm text-muted">No data yet.</p>
                  ) : (
                    <ul className="space-y-4">
                      {stats.byCity.slice(0, 6).map((c) => (
                        <HBar key={c.city} label={c.city} value={c.n} max={stats.byCity[0].n} />
                      ))}
                    </ul>
                  )}
                </div>
                <div>
                  <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted">Team size</p>
                  {stats.byTeamSize.length === 0 ? (
                    <p className="text-sm text-muted">No data yet.</p>
                  ) : (
                    <ul className="space-y-4">
                      {stats.byTeamSize.map((s) => (
                        <HBar key={s.team_size} label={`${s.team_size} members`} value={s.n} max={Math.max(...stats.byTeamSize.map((x) => x.n))} />
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </Panel>
          </div>

          <section className="mt-4 rounded-2xl border border-white/10">
            <div className="flex items-center gap-2 border-b border-white/10 p-5">
              <ChartBar size={18} className="text-accent" />
              <h2 className="text-sm font-semibold text-white">Latest registrations</h2>
            </div>
            {stats.recent.length === 0 ? (
              <p className="p-5 text-sm text-muted">Nothing yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-xs uppercase tracking-widest text-muted">
                      <th scope="col" className="p-4 font-semibold">Team</th>
                      <th scope="col" className="p-4 font-semibold">Institution</th>
                      <th scope="col" className="p-4 font-semibold">Track</th>
                      <th scope="col" className="p-4 font-semibold">Size</th>
                      <th scope="col" className="p-4 font-semibold">Lead contact</th>
                      <th scope="col" className="p-4 font-semibold">Registered</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {stats.recent.map((r) => (
                      <tr key={r.id} className="transition hover:bg-white/[0.02]">
                        <td className="p-4">
                          <p className="font-semibold text-white">{r.team_name}</p>
                          {r.project_idea && <p className="mt-0.5 line-clamp-1 text-xs text-muted">{r.project_idea}</p>}
                        </td>
                        <td className="p-4 text-slate-300">
                          {r.institution}
                          {r.city && <span className="block text-xs text-muted">{r.city}</span>}
                        </td>
                        <td className="p-4 text-slate-300">{r.track_label}</td>
                        <td className="p-4 font-mono text-slate-300">
                          <span className="inline-flex items-center gap-1.5">
                            <UsersThree size={14} className="text-muted" />{r.member_count}
                          </span>
                        </td>
                        <td className="p-4">
                          <p className="text-slate-300">{r.lead_name}</p>
                          <a className="text-xs text-accent hover:underline" href={`mailto:${r.lead_email}`}>{r.lead_email}</a>
                          <p className="text-xs text-muted">{r.lead_phone}</p>
                        </td>
                        <td className="p-4 text-xs text-muted">
                          {new Date(r.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <p className="mt-8 flex items-center gap-2 text-xs text-muted">
            <Buildings size={14} /> Private organizer view. Share this page only with the core team.
          </p>
        </>
      )}
    </div>
  );
}
