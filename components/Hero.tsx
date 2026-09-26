"use client";
import { useEffect, useRef } from "react";
import { motion, useMotionValue, useTransform } from "framer-motion";
import { ArrowRight } from "@phosphor-icons/react";
import Countdown from "./Countdown";
import Typewriter from "./Typewriter";
import { SITE } from "@/lib/content";

// Lightweight canvas particle network — nodes + connecting lines (agent motif).
// Renders one static frame under prefers-reduced-motion.
function NetworkCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;
    let raf = 0;
    let w = 0, h = 0;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const N = 70;
    const pts = Array.from({ length: N }, () => ({ x: Math.random(), y: Math.random(), vx: (Math.random() - 0.5) * 0.0009, vy: (Math.random() - 0.5) * 0.0009 }));
    const resize = () => {
      w = canvas.width = canvas.offsetWidth * devicePixelRatio;
      h = canvas.height = canvas.offsetHeight * devicePixelRatio;
    };
    resize();
    window.addEventListener("resize", resize);
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      ctx.lineWidth = 1;
      for (let i = 0; i < N; i++) {
        for (let j = i + 1; j < N; j++) {
          const dx = (pts[i].x - pts[j].x) * w, dy = (pts[i].y - pts[j].y) * h;
          const d = Math.hypot(dx, dy);
          const max = 170 * devicePixelRatio;
          if (d < max) {
            ctx.strokeStyle = `rgba(34,211,238,${(1 - d / max) * 0.25})`;
            ctx.beginPath();
            ctx.moveTo(pts[i].x * w, pts[i].y * h);
            ctx.lineTo(pts[j].x * w, pts[j].y * h);
            ctx.stroke();
          }
        }
      }
      for (const p of pts) {
        ctx.fillStyle = "rgba(34,211,238,.8)";
        ctx.beginPath();
        ctx.arc(p.x * w, p.y * h, 1.8 * devicePixelRatio, 0, Math.PI * 2);
        ctx.fill();
      }
    };
    const tick = () => {
      for (const p of pts) {
        p.x = (p.x + p.vx + 1) % 1; p.y = (p.y + p.vy + 1) % 1;
      }
      draw();
      raf = requestAnimationFrame(tick);
    };
    if (reduced) draw();
    else raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={ref} className="absolute inset-0 h-full w-full opacity-70" aria-hidden="true" />;
}

export default function Hero() {
  // Pointer-reactive glow (motion values = no re-renders). Static under reduced motion.
  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.35);
  const glowX = useTransform(mx, (v) => `${v * 100}%`);
  const glowY = useTransform(my, (v) => `${v * 100}%`);

  return (
    <section
      id="top"
      className="relative overflow-hidden pt-16"
      onMouseMove={(e) => {
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        const r = e.currentTarget.getBoundingClientRect();
        mx.set((e.clientX - r.left) / r.width);
        my.set((e.clientY - r.top) / r.height);
      }}
    >
      <div className="bg-grid absolute inset-0" aria-hidden="true" />
      <NetworkCanvas />
      <motion.div
        style={{ left: glowX, top: glowY }}
        className="pointer-events-none absolute h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/10 blur-[120px]"
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-7xl px-4 pb-16 pt-14 text-center sm:px-6 sm:pt-20">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <p className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs text-slate-300">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
            24-hour offline hackathon · {SITE.city} · {SITE.datesDisplay}
          </p>
          <h1 className="font-display text-5xl font-bold leading-none tracking-tighter text-white sm:text-7xl">
            {SITE.name}
          </h1>
          <p className="font-display mt-4 min-h-[2rem] text-xl font-semibold tracking-wide text-accent sm:min-h-[2.5rem] sm:text-2xl">
            <Typewriter text={SITE.tagline} />
          </p>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted">
            24 hours. {SITE.participants} builders. One campus. Ship real agentic AI — not chatbot wrappers.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.15 }}
          className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
        >
          <a href={SITE.registrationUrl}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-accent px-8 py-3.5 text-sm font-bold text-black transition hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0 active:scale-[0.98] sm:w-auto">
            Register your team <ArrowRight size={16} weight="bold" />
          </a>
          <a href="#tracks"
            className="inline-flex w-full items-center justify-center rounded-full border border-white/15 bg-white/5 px-8 py-3.5 text-sm font-semibold text-white backdrop-blur transition hover:-translate-y-0.5 hover:border-accent/50 active:translate-y-0 active:scale-[0.98] sm:w-auto">
            View tracks
          </a>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="mt-10">
          <Countdown />
        </motion.div>
      </div>
    </section>
  );
}
