"use client";

import { Activity, CheckCircle2, Moon, SunMedium } from "lucide-react";
import { useEffect, useState } from "react";

import { checkBackendHealth } from "@/lib/api";

export function Header() {
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [simulated, setSimulated] = useState(false);

  useEffect(() => {
    const applyTheme = (nextTheme: "dark" | "light") => {
      const root = document.documentElement;
      root.setAttribute("data-theme", nextTheme);
      root.style.colorScheme = nextTheme;
      setTheme(nextTheme);
      localStorage.setItem("d11-theme", nextTheme);
    };

    const storedTheme = localStorage.getItem("d11-theme");
    const initialTheme = storedTheme === "light" || storedTheme === "dark" ? storedTheme : "dark";
    applyTheme(initialTheme);

    let isMounted = true;

    const pingBackend = async () => {
      try {
        await checkBackendHealth();
        if (isMounted) setBackendOnline(true);
      } catch {
        if (isMounted) setBackendOnline(false);
      }
    };

    pingBackend();
    const interval = window.setInterval(pingBackend, 15000);

    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", nextTheme);
    document.documentElement.style.colorScheme = nextTheme;
    localStorage.setItem("d11-theme", nextTheme);
    setTheme(nextTheme);
  };

  const badgeTone =
    backendOnline === null
      ? "border-[var(--border-strong)] bg-[var(--bg-secondary)] text-[var(--text-secondary)]"
      : backendOnline
        ? "border-[var(--border-strong)] bg-[var(--accent-subtle)] text-[var(--text-primary)]"
        : "border-[var(--border-strong)] bg-[var(--surface-elevated)] text-[var(--text-primary)]";

  const pulseColor =
    backendOnline === null
      ? "bg-[var(--silver-accent)]"
      : backendOnline
        ? "bg-[var(--accent-primary)]"
        : "bg-[var(--text-muted)]";

  return (
    <header className="rounded-[28px] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4 shadow-panel backdrop-blur-sm sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--accent-primary)] text-lg font-black text-white shadow-glow">
            D11
          </div>

          <div>
            <p className="text-xl font-black tracking-[-0.04em] text-[var(--text-primary)]">D11</p>
            <p className="text-sm text-[var(--text-secondary)]">Every ball matters.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] ${badgeTone}`}>
            <span className={`h-2.5 w-2.5 rounded-full ${pulseColor} ${backendOnline !== false ? "animate-pulse" : ""}`} />
            <span className="tabular-nums">IND vs AUS • 112/5</span>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border-strong)] bg-[var(--bg-secondary)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-primary)]">
            <span className="h-2 w-2 rounded-full bg-[var(--accent-primary)]" />
            MatchMemo AI Ready
          </div>

          <button
            type="button"
            onClick={toggleTheme}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--border-strong)] bg-[var(--bg-secondary)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-primary)] transition hover:border-[var(--silver-accent)]"
          >
            {theme === "dark" ? <SunMedium className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            {theme === "dark" ? "Light" : "Dark"} Mode
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 border-t border-[var(--border-subtle)] pt-4 text-xs text-[var(--text-secondary)] sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-3.5 w-3.5 text-[var(--accent-primary)]" />
          <span>Live match feed synced</span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setSimulated((value) => !value)}
            className="inline-flex items-center gap-2 rounded-full bg-[var(--accent-primary)] px-3 py-1.5 font-semibold text-white transition hover:bg-[var(--accent-hover)]"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            {simulated ? "Catch-up queued" : "Simulate Return Catch-Up"}
          </button>

          <div className="inline-flex items-center gap-2 text-[var(--text-secondary)]">
            <span className={`h-2 w-2 rounded-full ${backendOnline === false ? "bg-[var(--text-muted)]" : "bg-[var(--accent-primary)]"}`} />
            {backendOnline === null
              ? "Checking backend"
              : backendOnline
                ? "Backend live"
                : "Backend offline"}
          </div>
        </div>
      </div>
    </header>
  );
}
