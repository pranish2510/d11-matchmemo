export type MatchStatus = "live" | "paused" | "completed";

export interface MatchSummary {
  id: string;
  title: string;
  status: MatchStatus;
  updatedAt: string;
}
