"use client";
import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Download, SignOut, ChartBar, UsersThree, Buildings, ArrowClockwise } from "@phosphor-icons/react";
import { TRACK_LABELS, type TrackId } from "@/lib/tracks";

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

type QueueRow = {
  id: string; team_code: string | null; team_name: string; institution: string; city: string;
  track_id: string; registration_status: string; payment_status: string;
  payment_reference: string; screenshot_present: boolean;
  submitted_at: string; verified_at: string | null; verified_by: string;
  rejection_reason: string; confirmation_email_status: string;
  member_count: number; lead_name: string; lead_email: string; lead_phone: string;
  ticket_count: number; checked_in_count: number;
};

const STATUS_FILTERS = ["PENDING", "ALL", "PAYMENT_PENDING", "PAYMENT_VERIFICATION", "RESUBMISSION_REQUIRED", "PAYMENT_REJECTED", "CONFIRMED", "CANCELLED"] as const;

function statusBadge(s: string) {
  const map: Record<string, string> = {
    CONFIRMED: "border-lime2/40 text-lime2",
    PAYMENT_PENDING: "border-amber-400/40 text-amber-200",
    PAYMENT_VERIFICATION: "border-accent/40 text-accent",
    RESUBMISSION_REQUIRED: "border-orange-400/40 text-orange-300",
    PAYMENT_REJECTED: "border-red-400/40 text-red-300",
    CANCELLED: "border-white/15 text-muted",
    PENDING: "border-amber-400/40 text-amber-200",
    VERIFIED: "border-lime2/40 text-lime2",
    REJECTED: "border-red-400/40 text-red-300",
    SENT: "border-lime2/40 text-lime2",
    FAILED: "border-red-400/40 text-red-300",
    ACK_SENT: "border-lime2/40 text-lime2",
    ACK_FAILED: "border-red-400/40 text-red-300",
    NOT_SENT: "border-white/15 text-muted",
  };
  return (
    <span className={`inline-block rounded-full border px-2 py-0.5 font-mono text-[11px] ${map[s] ?? "border-white/15 text-slate-300"}`}>
      {s}
    </span>
  );
}

function PaymentQueue({ token, onError }: { token: string; onError: (m: string) => void }) {
  const [filter, setFilter] = useState<string>("PENDING");
  const [rows, setRows] = useState<QueueRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  const loadQueue = useCallback(async (f: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/registrations?status=${f}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        onError(data.message ?? "Could not load payment queue.");
        return;
      }
      setRows(data.registrations);
    } catch {
      onError("Could not reach the verification API.");
    } finally {
      setLoading(false);
    }
  }, [token, onError]);

  useEffect(() => { loadQueue(filter); }, [filter, loadQueue]);

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => { setFilter(f); setSelected(null); }}
            aria-pressed={filter === f}
            className={`rounded-full px-4 py-1.5 font-mono text-xs transition ${filter === f ? "bg-accent text-black" : "border border-white/10 text-slate-300 hover:border-accent/40"}`}
          >
            {f}
          </button>
        ))}
        <button onClick={() => loadQueue(filter)} className="ml-auto inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-1.5 text-xs text-slate-200 hover:border-accent/50">
          <ArrowClockwise size={14} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {loading && <p className="mt-6 text-sm text-muted">Loading queue…</p>}
      {!loading && rows.length === 0 && <p className="mt-6 text-sm text-muted">No registrations in this state.</p>}

      {!loading && rows.length > 0 && (
        <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full min-w-[880px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-xs uppercase tracking-widest text-muted">
                <th scope="col" className="p-4 font-semibold">Team</th>
                <th scope="col" className="p-4 font-semibold">Leader</th>
                <th scope="col" className="p-4 font-semibold">Members</th>
                <th scope="col" className="p-4 font-semibold">Payment</th>
                <th scope="col" className="p-4 font-semibold">Submitted</th>
                <th scope="col" className="p-4 font-semibold">Status</th>
                <th scope="col" className="p-4 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {rows.map((r) => (
                <tr key={r.id} className={`transition hover:bg-white/[0.02] ${selected === r.id ? "bg-accent/[0.04]" : ""}`}>
                  <td className="p-4">
                    <p className="font-semibold text-white">{r.team_name}</p>
                    <p className="font-mono text-xs text-accent">{r.team_code ?? "—"}</p>
                    <p className="mt-0.5 max-w-[220px] truncate text-xs text-muted">{r.institution}</p>
                    <p className="max-w-[220px] truncate text-xs text-muted">{[r.city, TRACK_LABELS[r.track_id as TrackId] ?? r.track_id].filter(Boolean).join(" · ")}</p>
                  </td>
                  <td className="p-4">
                    <p className="text-slate-300">{r.lead_name}</p>
                    <p className="text-xs text-muted">{r.lead_email}</p>
                  </td>
                  <td className="p-4 font-mono text-slate-300">
                    <span className="inline-flex items-center gap-1.5"><UsersThree size={14} className="text-muted" />{r.member_count}</span>
                    {r.ticket_count > 0 && <span className="block text-[11px] text-muted">{r.ticket_count} tickets · {r.checked_in_count} in</span>}
                  </td>
                  <td className="p-4">
                    <div className="space-y-1">{statusBadge(r.payment_status)}</div>
                    {r.payment_reference && <p className="mt-1 font-mono text-[11px] text-muted">{r.payment_reference}</p>}
                    <p className="mt-1 text-[11px] text-muted">{r.screenshot_present ? "🧾 proof attached" : "no screenshot"}</p>
                  </td>
                  <td className="p-4 text-xs text-muted">{new Date(r.submitted_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</td>
                  <td className="p-4">
                    <div className="space-y-1">
                      {statusBadge(r.registration_status)}
                      {r.confirmation_email_status === "FAILED" && (
                        <span className="block text-[11px] font-semibold text-red-300">⚠ Email delivery failed</span>
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    <button
                      onClick={() => setSelected(selected === r.id ? null : r.id)}
                      className="rounded-full border border-accent/40 px-4 py-1.5 text-xs font-semibold text-accent transition hover:bg-accent/10"
                    >
                      {selected === r.id ? "Close" : "VIEW PAYMENT"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <VerifyPanel
          key={selected}
          token={token}
          teamId={selected}
          onDone={() => loadQueue(filter)}
          onError={onError}
        />
      )}
    </div>
  );
}

function VerifyPanel({ token, teamId, onDone, onError }: { token: string; teamId: string; onDone: () => void; onError: (m: string) => void }) {
  const [detail, setDetail] = useState<{ team: Record<string, string>; members: Record<string, string>[]; decisions: Record<string, string>[] } | null>(null);
  const [shotUrl, setShotUrl] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/admin/registrations/${teamId}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        onError(data.message ?? "Could not load registration.");
        return;
      }
      setDetail(data);
      const img = await fetch(`/api/admin/payments/${teamId}/screenshot`, { headers: { Authorization: `Bearer ${token}` } });
      if (img.ok) {
        const blob = await img.blob();
        setShotUrl(URL.createObjectURL(blob));
      }
    })();
    return () => { if (shotUrl) URL.revokeObjectURL(shotUrl); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId, token]);

  async function decide(decision: "VERIFY" | "REJECT" | "RESUBMIT") {
    if ((decision === "REJECT" || decision === "RESUBMIT") && !reason.trim()) {
      onError("A reason is required for reject / resubmission.");
      return;
    }
    if (decision === "VERIFY" && !window.confirm("Verify this payment? This will confirm the registration, generate individual PDF tickets and email the team leader with all PDF attachments. This cannot be undone from here.")) {
      return;
    }
    setBusy(decision);
    setResult(null);
    try {
      const res = await fetch(`/api/admin/registrations/${teamId}/decision`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ decision, reason }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        onError(data.message ?? "Decision failed.");
        return;
      }
      const ticketCount = data.tickets?.length ?? data.pdfCount ?? 0;
      if (decision === "VERIFY") {
        if (data.duplicate) {
          setResult(
            `✓ Payment Verified\n✓ Registration Confirmed\n✓ ${ticketCount} Tickets Generated (Existing Reused)\n✓ Ticket PDFs Ready\n✓ Existing tickets & PDFs reused, no duplicate email sent.`,
          );
        } else if (data.emailFailed) {
          setResult(
            `✓ Payment Verified\n✓ Registration Confirmed\n✓ ${ticketCount} Tickets Generated\n✓ Ticket PDFs Ready\n⚠ Confirmation Email Failed: ${data.emailFailed}\n(Use RESEND TICKETS below to re-send the existing PDF attachments)`,
          );
        } else {
          setResult(
            `✓ Payment Verified\n✓ Registration Confirmed\n✓ ${ticketCount} Tickets Generated\n✓ Ticket PDFs Ready\n✓ Confirmation Email Sent with ${ticketCount} PDF attachment(s)`,
          );
        }
      } else if (decision === "REJECT") {
        setResult("Payment Rejected — registration moved to PAYMENT_REJECTED. No tickets generated, no confirmation email sent.");
      } else {
        setResult(
          `Resubmission requested.${data.resubmitEmailed ? " The leader has been emailed with what to fix." : ` ⚠ Notice email failed: ${data.resubmitEmailError ?? "unknown error"} — contact the team manually.`}`,
        );
      }
      onDone();
    } catch {
      onError("Could not reach the verification API.");
    } finally {
      setBusy(null);
    }
  }

  async function resend() {
    setBusy("RESEND");
    try {
      const res = await fetch(`/api/admin/registrations/${teamId}/resend`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        onError(data.message ?? "Resend failed.");
        return;
      }
      setResult(`✓ Confirmation Email Re-Sent with ${data.pdfCount ?? "attached"} PDF tickets to the team leader.`);
      onDone();
    } catch {
      onError("Could not reach the verification API.");
    } finally {
      setBusy(null);
    }
  }

  async function downloadTicketPdf(ticketId: string, filename?: string) {
    try {
      const res = await fetch(`/api/admin/tickets/${ticketId}/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        onError("Could not download ticket PDF.");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename || `techsiege-ticket-${ticketId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      onError("Failed to download ticket PDF.");
    }
  }

  if (!detail) return <p className="mt-6 text-sm text-muted">Loading dossier…</p>;
  const t = detail.team;

  return (
    <section className="mt-4 rounded-2xl border border-accent/25 bg-accent/[0.03] p-6" aria-label="Verification dossier">
      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <h3 className="font-display text-lg font-bold text-white">{t.team_name} <span className="ml-2 font-mono text-sm text-accent">{t.team_code}</span></h3>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex gap-2"><dt className="w-28 shrink-0 text-muted">Institution</dt><dd className="text-slate-200">{t.institution}{t.city ? ` · ${t.city}` : ""}</dd></div>
            <div className="flex gap-2"><dt className="w-28 shrink-0 text-muted">Track</dt><dd className="text-slate-200">{t.track_id}</dd></div>
            {t.project_idea && <div className="flex gap-2"><dt className="w-28 shrink-0 text-muted">Idea</dt><dd className="text-slate-200">{t.project_idea}</dd></div>}
            <div className="flex gap-2"><dt className="w-28 shrink-0 text-muted">Reference</dt><dd className="font-mono text-slate-200">{t.payment_reference || "—"}</dd></div>
            <div className="flex gap-2"><dt className="w-28 shrink-0 text-muted">Submitted</dt><dd className="text-slate-200">{new Date(t.submitted_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</dd></div>
            <div className="flex gap-2"><dt className="w-28 shrink-0 text-muted">Status</dt><dd className="flex flex-wrap gap-1">{statusBadge(t.registration_status)} {statusBadge(t.payment_status)} {statusBadge(t.confirmation_email_status)}</dd></div>
            {t.rejection_reason && <div className="flex gap-2"><dt className="w-28 shrink-0 text-muted">Note</dt><dd className="text-slate-200">{t.rejection_reason}</dd></div>}
          </dl>

          {t.registration_status === "CONFIRMED" && (
            <div className="mt-4 rounded-xl border border-lime2/30 bg-lime2/5 p-3.5 text-xs text-lime2 space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <span>✓ Payment: VERIFIED</span>
                <span>•</span>
                <span>✓ Registration: CONFIRMED</span>
              </div>
              <div className="text-slate-300">
                ✓ Tickets: {detail.members.filter((m) => m.ticket_id).length} PDF ticket(s) generated
              </div>
              <div className={t.confirmation_email_status === "FAILED" ? "text-red-300 font-semibold" : "text-slate-300"}>
                {t.confirmation_email_status === "SENT"
                  ? `✓ Email: Sent with ${detail.members.filter((m) => m.ticket_id).length} PDF attachment(s)`
                  : t.confirmation_email_status === "FAILED"
                    ? "⚠ Email: FAILED (Existing PDFs intact on disk; click RESEND TICKETS below)"
                    : `• Email: ${t.confirmation_email_status}`}
              </div>
            </div>
          )}

          <h4 className="mt-6 text-xs font-bold uppercase tracking-widest text-slate-400">Members ({detail.members.length})</h4>
          <ul className="mt-2 space-y-2">
            {detail.members.map((m) => (
              <li key={m.id} className="rounded-xl border border-white/10 p-3 text-sm">
                <p className="font-semibold text-white">{m.full_name} {m.is_lead ? <span className="ml-1 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] text-accent">LEAD</span> : null}</p>
                <p className="text-xs text-muted">{m.email} · {m.phone}{m.branch_year ? ` · ${m.branch_year}` : ""}</p>
                {m.ticket_id && (
                  <div className="mt-1 flex flex-wrap items-center gap-2 font-mono text-xs">
                    <span className="text-lime2 font-semibold">🎟 {m.ticket_id}</span>
                    <span className="text-muted">· {m.ticket_status}</span>
                    {m.pdf_filename && <span className="text-accent/90 text-[11px]">📎 {m.pdf_filename}</span>}
                    {m.checked_in_at && (
                      <span className="text-lime2 text-[11px]">
                        · in {new Date(m.checked_in_at).toLocaleString("en-IN", { timeStyle: "short" })}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => downloadTicketPdf(m.ticket_id, m.pdf_filename)}
                      className="ml-auto rounded-md border border-accent/40 bg-accent/10 px-2 py-0.5 text-[10px] font-semibold text-accent transition hover:bg-accent/20"
                    >
                      📥 Download PDF
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
          {detail.decisions.length > 0 && (
            <>
              <h4 className="mt-6 text-xs font-bold uppercase tracking-widest text-slate-400">Decision history</h4>
              <ul className="mt-2 space-y-1.5 text-xs text-muted">
                {detail.decisions.map((d, i) => (
                  <li key={i}>{new Date(d.created_at).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })} — <span className="font-mono text-slate-300">{d.decision}</span> by {d.admin_identity}{d.reason ? ` — ${d.reason}` : ""}</li>
                ))}
              </ul>
            </>
          )}
        </div>
        <div>
          <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400">Payment screenshot</h4>
          <div className="mt-2 overflow-hidden rounded-xl border border-white/10 bg-black/40">
            {shotUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={shotUrl} alt="Payment screenshot" className="max-h-[420px] w-full object-contain" />
            ) : (
              <p className="p-6 text-sm text-muted">No screenshot on file.</p>
            )}
          </div>
          <label className="mt-4 block">
            <span className="mb-1 block text-xs font-semibold text-slate-300">Reason <span className="font-normal text-muted">(required for reject / resubmit, shown to team on request)</span></span>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} maxLength={1000} placeholder="e.g. UPI ref doesn't match the receipt amount" className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-accent/60 focus:outline-none" />
          </label>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <button onClick={() => decide("VERIFY")} disabled={!!busy} className="rounded-full bg-lime2 px-4 py-2.5 text-sm font-bold text-black transition hover:brightness-110 disabled:opacity-60">
              {busy === "VERIFY" ? "Verifying…" : "VERIFY PAYMENT"}
            </button>
            <button onClick={() => decide("REJECT")} disabled={!!busy} className="rounded-full border border-red-400/50 px-4 py-2.5 text-sm font-semibold text-red-300 transition hover:bg-red-400/10 disabled:opacity-60">
              {busy === "REJECT" ? "Rejecting…" : "REJECT PAYMENT"}
            </button>
            <button onClick={() => decide("RESUBMIT")} disabled={!!busy} className="rounded-full border border-orange-400/50 px-4 py-2.5 text-sm font-semibold text-orange-300 transition hover:bg-orange-400/10 disabled:opacity-60">
              {busy === "RESUBMIT" ? "Sending…" : "REQUEST RESUBMISSION"}
            </button>
          </div>
          {t.registration_status === "CONFIRMED" && (
            <button
              onClick={resend}
              disabled={!!busy}
              className={`mt-3 w-full rounded-full border px-4 py-2.5 text-sm font-bold transition disabled:opacity-60 ${
                t.confirmation_email_status === "FAILED"
                  ? "border-lime2 bg-lime2/15 text-lime2 hover:bg-lime2/25 ring-2 ring-lime2/30"
                  : "border-accent/50 text-accent hover:bg-accent/10"
              }`}
            >
              {busy === "RESEND" ? "Re-sending…" : "RESEND TICKETS"}
            </button>
          )}
          {result && (
            <div role="status" className="mt-3 whitespace-pre-line rounded-xl border border-lime2/30 bg-lime2/5 p-3.5 text-xs font-mono text-lime2">
              {result}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function CheckinPanel({ token, onError }: { token: string; onError: (m: string) => void }) {
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function checkin(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/checkin", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ token: input.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        onError(data.message ?? "Check-in failed.");
        return;
      }
      setResult(data.duplicate ? `Already checked in: ${data.memberName} (${data.ticketId}).` : `Checked in: ${data.memberName} — ${data.teamName} (${data.ticketId}).`);
      setInput("");
    } catch {
      onError("Could not reach the check-in API.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <p className="text-sm text-muted">Scan a ticket QR (or type the ticket ID) to mark that participant checked in. Volunteer use only — participants can never self-check-in.</p>
      <form onSubmit={checkin} className="mt-4 flex gap-2">
        <input autoFocus value={input} onChange={(e) => setInput(e.target.value)} placeholder="TECHSIEGE:TICKET:… or TSG26-…" className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 font-mono text-sm text-white placeholder:text-slate-500 focus:border-accent/60 focus:outline-none" />
        <button type="submit" disabled={busy || !input.trim()} className="rounded-full bg-accent px-6 py-2.5 text-sm font-bold text-black transition hover:brightness-110 disabled:opacity-60">
          {busy ? "…" : "Check in"}
        </button>
      </form>
      {result && <p role="status" className="mt-4 rounded-xl border border-lime2/30 bg-lime2/5 p-4 text-sm text-lime2">{result}</p>}
    </div>
  );
}

export default function AdminDashboard() {
  const [token, setToken] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<"analytics" | "payments" | "checkin">("payments");
  const [detailTeamId, setDetailTeamId] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const onError = useCallback((m: string) => setError(m), []);

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

  useEffect(() => {
    if (!detailTeamId || !token) return;
    let cancelled = false;
    setDetailLoading(true);
    setDetailData(null);
    fetch(`/api/admin/registrations/${detailTeamId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok || !data.ok) throw new Error(data.message ?? "Failed to load team details");
        return data;
      })
      .then((data) => {
        if (!cancelled) setDetailData(data);
      })
      .catch((e) => {
        if (!cancelled) onError(e.message ?? "Could not load team details");
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => { cancelled = true; };
  }, [detailTeamId, token, onError]);

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

      <div className="mt-6 flex gap-2" role="tablist" aria-label="Organizer views">
        {(["payments", "analytics", "checkin"] as const).map((v) => (
          <button
            key={v}
            role="tab"
            aria-selected={view === v}
            onClick={() => setView(v)}
            className={`rounded-full px-5 py-2 text-sm font-semibold transition ${view === v ? "bg-accent text-black" : "border border-white/10 text-slate-300 hover:border-accent/40"}`}
          >
            {v === "payments" ? "Payment verification" : v === "analytics" ? "Analytics" : "Check-in scan"}
          </button>
        ))}
      </div>

      {view === "payments" && (
        <div className="mt-6">
          <PaymentQueue token={token} onError={onError} />
        </div>
      )}

      {view === "checkin" && (
        <div className="mt-6 rounded-2xl border border-white/10 p-6">
          <CheckinPanel token={token} onError={onError} />
        </div>
      )}

      {view === "analytics" && (
      <>
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
                      <tr key={r.id} onClick={() => setDetailTeamId(r.id)} className="cursor-pointer transition hover:bg-white/[0.02]">
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
      </>
      )}
      {detailTeamId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setDetailTeamId(null)}>
          <div className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-2xl border border-white/10 bg-[#0b1220] p-6" onClick={e => e.stopPropagation()}>
            {detailLoading ? (
              <p className="text-sm text-muted">Loading…</p>
            ) : detailData ? (
              <>
                <div className="flex items-start justify-between gap-4">
                  <h3 className="font-display text-2xl font-bold text-white">{detailData.team.team_name}</h3>
                  <button onClick={() => setDetailTeamId(null)} className="rounded-full border border-white/15 px-3 py-1 text-xs text-slate-300 hover:border-accent/50">Close</button>
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div><dt className="text-muted">Institution</dt><dd className="text-slate-200">{detailData.team.institution}{detailData.team.city ? ` · ${detailData.team.city}` : ''}</dd></div>
                  <div><dt className="text-muted">Track</dt><dd className="text-slate-200">{TRACK_LABELS[detailData.team.track_id as keyof typeof TRACK_LABELS] ?? detailData.team.track_id}</dd></div>
                  {detailData.team.project_idea && <div className="col-span-2"><dt className="text-muted">Project idea</dt><dd className="mt-1 text-slate-200">{detailData.team.project_idea}</dd></div>}
                </dl>
                <h4 className="mt-6 text-xs font-bold uppercase tracking-widest text-slate-400">Members ({detailData.members.length})</h4>
                <ul className="mt-2 space-y-2">
                  {detailData.members.map((m: any) => (
                    <li key={m.id} className="rounded-xl border border-white/10 p-3 text-sm">
                      <p className="font-semibold text-white">{m.full_name} {m.is_lead && <span className="ml-2 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] text-accent">LEAD</span>}</p>
                      <p className="text-xs text-muted">{m.email} · {m.phone}{m.branch_year ? ` · ${m.branch_year}` : ''}</p>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
