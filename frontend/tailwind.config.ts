import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: "var(--bg-main)",
          bgSecondary: "var(--bg-secondary)",
          surface: "var(--surface-primary)",
          elevated: "var(--surface-elevated)",
          text: "var(--text-primary)",
          textSecondary: "var(--text-secondary)",
          textMuted: "var(--text-muted)",
          border: "var(--border-subtle)",
          borderStrong: "var(--border-strong)",
          accent: "var(--accent-primary)",
          accentHover: "var(--accent-hover)",
          accentSubtle: "var(--accent-subtle)",
          silver: "var(--silver-accent)",
          charcoal: "var(--charcoal-surface)",
        },
      },
      boxShadow: {
        panel: "0 20px 55px rgba(25, 27, 32, 0.18)",
        glow: "0 0 0 1px rgba(229, 57, 69, 0.2), 0 10px 30px rgba(229, 57, 69, 0.14)",
      },
    },
  },
  plugins: [],
};

export default config;
