"use client";

import { Activity, ArrowRight, MessageSquareText } from "lucide-react";
import { useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis } from "recharts";

const momentumData = [
  { over: "11.0", value: 64 },
  { over: "12.0", value: 68 },
  { over: "13.0", value: 72 },
  { over: "14.0", value: 61 },
  { over: "15.0", value: 76 },
  { over: "16.0", value: 82 },
  { over: "17.0", value: 88 },
];

const promptChips = ["Why the swing?", "Powerplay strain", "Death-over pressure", "Who changed it?"];

export function MatchMemoShell() {
  const [mode, setMode] = useState<"Quick Recap 15s" | "Detailed Recap 30s">("Quick Recap 15s");

  return (
    <aside className="rounded-[30px] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4 shadow-panel sm:p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">MatchMemo</p>
          <h3 className="mt-2 text-2xl font-black tracking-[-0.06em] text-[var(--text-primary)]">
            Never miss the story of a match
          </h3>
        </div>
        <div className="rounded-full border border-[var(--border-strong)] bg-[var(--bg-secondary)] px-2.5 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-[var(--accent-primary)]">
          AI
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-secondary)]">
            <Activity className="h-4 w-4 text-[var(--accent-primary)]" />
            Away-and-return catch-up
          </div>
          <span className="rounded-full border border-[var(--border-strong)] bg-[var(--surface-primary)] px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-[var(--text-primary)]">
            Live
          </span>
        </div>

        <div className="mt-4 flex items-center gap-2 text-xs text-[var(--text-secondary)]">
          <span>When You Left:</span>
          <span className="font-semibold text-[var(--text-primary)] tabular-nums">85/1 (11.2)</span>
          <ArrowRight className="h-3.5 w-3.5 text-[var(--text-muted)]" />
          <span className="font-semibold text-[var(--accent-primary)] tabular-nums">Now: 112/5 (15.4)</span>
        </div>

        <div className="mt-4 flex gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-1">
          {(["Quick Recap 15s", "Detailed Recap 30s"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setMode(option)}
              className={`flex-1 rounded-lg px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] transition ${
                mode === option
                  ? "bg-[var(--accent-primary)] text-white"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              {option}
            </button>
          ))}
        </div>

        <div className="mt-5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4">
          <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">Turning Point</div>
          <p className="mt-2 text-sm leading-6 text-[var(--text-primary)]">
            Australia broke the middle-over rhythm with a sharp spell of variations after 12.2, squeezing India from
            72/1 to 112/5 by the 15th over.
          </p>
        </div>

        <div className="mt-5 h-36 w-full rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={momentumData} margin={{ top: 10, right: 10, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="momentum-fill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent-primary)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--accent-primary)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--border-subtle)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="over" tick={{ fill: "var(--text-muted)", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis hide domain={[55, 90]} />
              <Area type="monotone" dataKey="value" stroke="var(--accent-primary)" strokeWidth={2} fill="url(#momentum-fill)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-secondary)]">
          <MessageSquareText className="h-4 w-4 text-[var(--silver-accent)]" />
          Ask MatchMemo
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {promptChips.map((chip) => (
            <button
              key={chip}
              type="button"
              className="rounded-full border border-[var(--border-strong)] bg-[var(--surface-primary)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] transition hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)]"
            >
              {chip}
            </button>
          ))}
        </div>

        <button className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent-primary)] px-3 py-2.5 text-sm font-bold text-white transition hover:bg-[var(--accent-hover)]">
          Ask MatchMemo
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </aside>
  );
}
