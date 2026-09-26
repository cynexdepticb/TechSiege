"use client";
import { motion } from "framer-motion";
import type { ReactNode } from "react";

export function Reveal({ children, delay = 0, className = "" }: { children: ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

export function SectionHeading({
  kicker,
  title,
  sub,
  align = "center",
}: {
  kicker?: string;
  title: string;
  sub?: string;
  align?: "center" | "left";
}) {
  const centered = align === "center";
  return (
    <Reveal className={`mb-10 max-w-3xl ${centered ? "mx-auto text-center" : ""}`}>
      {kicker && (
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-accent">{kicker}</p>
      )}
      <h2 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">{title}</h2>
      {sub && <p className="mt-3 max-w-[65ch] text-sm leading-relaxed text-muted sm:text-base">{sub}</p>}
    </Reveal>
  );
}
