// ---------------------------------------------------------------------------
// Emission Target types
// ---------------------------------------------------------------------------

export type TargetScope = "Fleet" | "Carlist";
export type TargetPeriod = "Annual" | "Monthly";

export type TargetStatus = "on-track" | "at-risk" | "off-track" | "completed";

export type Milestone = {
  label: string;
  date: Date;
  expectedValue: number;
  achieved: boolean;
  onTrack: boolean;
};

export type TargetProgress = {
  targetValue: number;
  currentValue: number;
  percentage: number;
  remaining: number;
  status: TargetStatus;
  milestones: Milestone[];
};

// ---------------------------------------------------------------------------
// UI labels
// ---------------------------------------------------------------------------

export const TARGET_SCOPE_LABELS: Record<TargetScope, string> = {
  Fleet: "Intera Flotta",
  Carlist: "Carlist",
};

export const TARGET_PERIOD_LABELS: Record<TargetPeriod, string> = {
  Annual: "Annuale",
  Monthly: "Mensile",
};

export const TARGET_STATUS_LABELS: Record<TargetStatus, string> = {
  "on-track": "In linea",
  "at-risk": "A rischio",
  "off-track": "Fuori obiettivo",
  completed: "Completato",
};
