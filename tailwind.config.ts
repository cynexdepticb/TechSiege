import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        void: "#04060d",
        navy: "#0a0f1e",
        panel: "#0c1329",
        accent: "#22d3ee",
        violet2: "#8b5cf6",
        lime2: "#a3e635",
        muted: "#94a3b8",
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 24px rgba(34,211,238,.35)",
        "glow-lg": "0 0 48px rgba(34,211,238,.28)",
      },
    },
  },
  plugins: [],
};
export default config;
