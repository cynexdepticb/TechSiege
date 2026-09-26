"use client";
import { motion, useScroll } from "framer-motion";

// Thin reading-progress bar pinned above the nav (systemic layer).
export default function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  return (
    <motion.div
      style={{ scaleX: scrollYProgress }}
      className="fixed inset-x-0 top-0 z-[60] h-[2px] origin-left bg-accent"
      aria-hidden="true"
    />
  );
}
