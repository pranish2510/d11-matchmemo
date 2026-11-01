import { Activity, Gauge, Play, RotateCcw } from "lucide-react";

const statBlocks = [
  { label: "Score", value: "112/5", accent: "text-[var(--text-primary)]" },
  { label: "Overs", value: "15.4", accent: "text-[var(--text-primary)]" },
  { label: "CRR", value: "7.15", accent: "text-[var(--accent-primary)]" },
  { label: "Pressure", value: "High", accent: "text-[var(--silver-accent)]" },
];

const recentDeliveries = ["W", "1", "4", "1", "0", "2", "1", "W"];

const commentary = [
  { over: "15.4", text: "Cummins yorker, Pandya misses and the field closes in." },
  { over: "15.3", text: "Back-of-length ball punched into the gap for a single." },
  { over: "15.2", text: "Fuller ball, Jadeja nudges it into square leg for one." },
  { over: "15.1", text: "Cummins strikes! Short ball takes the edge and falls into the cordon." },
];

export function ScoreboardShell() {
  return (
    <section className="rounded-[30px] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4 shadow-panel sm:p-5">
      <div className="flex flex-col gap-4 border-b border-[var(--border-subtle)] pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">Live Match</p>
          <h2 className="mt-2 text-3xl font-black tracking-[-0.06em] text-[var(--text-primary)]">
            <span className="tabular-nums">IND</span>
            <span className="mx-2 text-[var(--text-muted)]">vs</span>
            <span className="tabular-nums text-[var(--text-secondary)]">AUS</span>
          </h2>
        </div>

        <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border-strong)] bg-[var(--bg-secondary)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
          <span className="h-2 w-2 rounded-full bg-[var(--accent-primary)] animate-pulse" />
          Live • 15.4 ov
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {statBlocks.map((item) => (
          <div key={item.label} className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-4">
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">{item.label}</div>
            <div className={`mt-3 text-3xl font-black tracking-[-0.06em] tabular-nums ${item.accent}`}>{item.value}</div>
          </div>
        ))}
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-secondary)]">
              <Activity className="h-4 w-4 text-[var(--accent-primary)]" />
              Batting Summary
            </div>
            <span className="text-xs text-[var(--text-muted)]">Run chase</span>
          </div>

          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between rounded-xl bg-[var(--surface-primary)] p-3">
              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">Pandya</p>
                <p className="text-xs text-[var(--text-secondary)]">Strike rate 127.3</p>
              </div>
              <div className="text-right">
                <p className="tabular-nums text-lg font-black tracking-[-0.05em] text-[var(--accent-primary)]">14* (11)</p>
                <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]">Not out</p>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-[var(--surface-primary)] p-3">
              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">Jadeja</p>
                <p className="text-xs text-[var(--text-secondary)]">Strike rate 66.7</p>
              </div>
              <div className="text-right">
                <p className="tabular-nums text-lg font-black tracking-[-0.05em] text-[var(--accent-primary)]">4* (6)</p>
                <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]">Not out</p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-secondary)]">
            <Gauge className="h-4 w-4 text-[var(--silver-accent)]" />
            Bowling Summary
          </div>

          <div className="mt-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-3">
            <p className="text-sm font-semibold text-[var(--text-primary)]">Cummins</p>
            <p className="mt-1 tabular-nums text-xs text-[var(--text-secondary)]">3.4-0-24-2</p>
            <div className="mt-5 h-2 w-full overflow-hidden rounded-full bg-[var(--bg-secondary)]">
              <div className="h-full w-[68%] rounded-full bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-hover)]" />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-secondary)]">
            <Activity className="h-4 w-4 text-[var(--accent-primary)]" />
            Recent deliveries
          </div>
          <span className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]">W • 4 • 1 • 6</span>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {recentDeliveries.map((delivery, index) => (
            <span
              key={`${delivery}-${index}`}
              className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-black tabular-nums ${
                delivery === "W"
                  ? "bg-[var(--accent-primary)] text-white shadow-glow"
                  : "border border-[var(--border-strong)] bg-[var(--surface-primary)] text-[var(--text-primary)]"
              }`}
            >
              {delivery}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-4 py-3">
        <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">Simulation Controls</span>
        <button type="button" className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent-primary)] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[var(--accent-hover)]">
          <Play className="h-4 w-4" />
          +1 Ball
        </button>
        <button type="button" className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-strong)] bg-[var(--surface-primary)] px-3 py-2 text-sm font-semibold text-[var(--text-primary)] transition hover:border-[var(--silver-accent)]">
          <RotateCcw className="h-4 w-4" />
          +1 Over
        </button>
        <button type="button" className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-strong)] bg-[var(--surface-primary)] px-3 py-2 text-sm font-semibold text-[var(--text-primary)] transition hover:border-[var(--silver-accent)]">
          <Activity className="h-4 w-4 text-[var(--accent-primary)]" />
          Simulate 15m Away
        </button>
      </div>

      <div className="mt-5">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--text-secondary)]">
          <Activity className="h-4 w-4 text-[var(--silver-accent)]" />
          Ball-by-ball commentary
        </div>

        <div className="space-y-3">
          {commentary.map((item) => (
            <div key={item.over} className="flex gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-3">
              <span className="tabular-nums inline-flex h-7 min-w-10 items-center justify-center rounded-md bg-[var(--surface-primary)] px-2 text-[11px] font-black text-[var(--accent-primary)]">
                {item.over}
              </span>
              <p className="text-sm leading-6 text-[var(--text-secondary)]">{item.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
