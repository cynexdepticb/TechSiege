"use client";
import { useEffect, useState } from "react";
import { SITE } from "@/lib/content";

function parts(target: string) {
  const diff = Math.max(0, new Date(target).getTime() - Date.now());
  return {
    d: Math.floor(diff / 86400000),
    h: Math.floor(diff / 3600000) % 24,
    m: Math.floor(diff / 60000) % 60,
    s: Math.floor(diff / 1000) % 60,
  };
}

type Parts = ReturnType<typeof parts>;

export function useCountdown(target = SITE.eventStartISO) {
  // Null on first render so SSR and client hydration match exactly;
  // real values start ticking after mount.
  const [t, setT] = useState<Parts | null>(null);
  useEffect(() => {
    setT(parts(target));
    const id = setInterval(() => setT(parts(target)), 1000);
    return () => clearInterval(id);
  }, [target]);
  return t;
}

export default function Countdown({ compact = false }: { compact?: boolean }) {
  const t = useCountdown();
  const cells: ReadonlyArray<readonly [string, string]> = t
    ? [
        [String(t.d).padStart(2, "0"), "Days"],
        [String(t.h).padStart(2, "0"), "Hrs"],
        [String(t.m).padStart(2, "0"), "Min"],
        [String(t.s).padStart(2, "0"), "Sec"],
      ]
    : [
        ["--", "Days"],
        ["--", "Hrs"],
        ["--", "Min"],
        ["--", "Sec"],
      ];
  return (
    <div className={`flex gap-2 sm:gap-3 ${compact ? "" : "justify-center"}`} role="timer" aria-label={`Countdown to ${SITE.name}`}>
      {cells.map(([v, l]) => (
        <div key={l} className="glass min-w-[64px] rounded-xl px-3 py-2 text-center sm:min-w-[76px]">
          <div className="font-display text-xl font-bold tabular-nums text-white sm:text-2xl" suppressHydrationWarning={!t}>{v}</div>
          <div className="text-[10px] uppercase tracking-widest text-muted">{l}</div>
        </div>
      ))}
    </div>
  );
}
