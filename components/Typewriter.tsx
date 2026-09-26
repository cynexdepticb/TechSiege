"use client";
import { useEffect, useState } from "react";

/** Types out text once on mount (terminal feel). Shows full text under reduced motion. */
export default function Typewriter({ text, speed = 60 }: { text: string; speed?: number }) {
  const [n, setN] = useState(0);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setReduced(true);
      return;
    }
    if (n >= text.length) return;
    const id = setTimeout(() => setN(n + 1), n === 0 ? 700 : speed);
    return () => clearTimeout(id);
  }, [n, text, speed]);

  const done = reduced || n >= text.length;
  return (
    <span>
      {reduced ? text : text.slice(0, n)}
      <span className={`${done ? "opacity-0" : "animate-pulse"} text-accent`} aria-hidden="true">
        {"\u258D"}
      </span>
    </span>
  );
}
