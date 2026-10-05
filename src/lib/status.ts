// Shared health-color logic so the at-a-glance Status strip and the detailed
// Battery / GPS / Network widgets always render the same verdict for the same
// signal. Change a threshold here and every widget stays in agreement.

export type Health = "green" | "yellow" | "red" | "gray";

/** Map a health token to a CSS custom property. */
export function healthVar(h: Health): string {
  switch (h) {
    case "green":
      return "var(--green)";
    case "yellow":
      return "var(--yellow)";
    case "red":
      return "var(--red)";
    default:
      return "var(--text3)";
  }
}

/** Higher is better: >= green → green, >= yellow → yellow, else red. */
export function colorForValue(value: number, green: number, yellow: number): Health {
  if (value >= green) return "green";
  if (value >= yellow) return "yellow";
  return "red";
}

/** Signal strength in dBm (less negative is stronger). 0 = no signal. Tuned on LoRa, reused for WiFi. */
export function rssiColor(rssi: number): Health {
  if (rssi === 0) return "gray";
  if (rssi >= -60) return "green";
  if (rssi >= -80) return "yellow";
  return "red";
}

/** Battery percentage → health. Matches the Battery widget's ring thresholds. */
export function batteryColor(pct: number): Health {
  if (pct > 60) return "green";
  if (pct > 25) return "yellow";
  return "red";
}

export interface PrecisionLevel {
  label: string; // long form for the GPS widget, e.g. "Centimeter"
  short: string; // compact form for the Status strip, e.g. "Fixed"
  detail: string;
  variant: Health;
}

const LOC_STATE_LABELS: Record<number, string> = {
  0: "Standby", 1: "Unconfigured", 2: "Standby", 3: "Ready", 4: "Initializing", 5: "Tracking", 6: "Error",
};

const FUSION_ERROR_LABELS: Record<number, [string, Health]> = {
  0: ["OK", "green"],
  10: ["MAP LOST", "red"],
  20: ["LOC LOST", "red"],
};

const MOTION_STATUS_LABELS: Record<number, string> = {
  0: "Normal", 1: "Static", 2: "Static slip", 3: "Moving slip",
};

export function getLocState(state: number | null): { label: string; health: Health } {
  if (state == null) return { label: "--", health: "gray" };
  const label = LOC_STATE_LABELS[state] ?? `Unknown (${state})`;
  const health: Health = state === 6 ? "red" : state === 5 ? "green" : state >= 3 ? "yellow" : "gray";
  return { label, health };
}

export function getFusionError(error: number | null): { label: string; health: Health } {
  if (error == null) return { label: "--", health: "gray" };
  const entry = FUSION_ERROR_LABELS[error];
  if (entry) return { label: entry[0], health: entry[1] };
  return { label: `Error (${error})`, health: "red" };
}

export function getMotionStatus(status: number | null): string {
  if (status == null) return "--";
  return MOTION_STATUS_LABELS[status] ?? `Unknown (${status})`;
}

const LOC_ERROR_LABELS: Record<number, [string, Health]> = {
  0: ["None", "green"],
  1: ["Position init failed", "red"],
  2: ["Heading init failed", "red"],
  3: ["RTK alignment failed", "red"],
  4: ["RTK + Vision lost", "red"],
};

export function getLocError(code: number | null): { label: string; health: Health } {
  if (code == null) return { label: "--", health: "gray" };
  const entry = LOC_ERROR_LABELS[code];
  if (entry) return { label: entry[0], health: entry[1] };
  return { label: `Error (${code})`, health: "red" };
}

// ── Positioning precision ───────────────────────────────────────────
// Classifies the GNSS receiver's position type (Unicore UM980, NovAtel-style
// tokens) by the actual SOLUTION, not by signal / correction health: a FINE base
// link and a high "GPS Quality" can coexist with a non-RTK solution (e.g. PSRDIFF).
// Semantics + sources: airseekers-tron/docs/kb/rtk-positioning-states.md
//
// Rules:
//  * Only an RTK integer fix is green. Float / wide-lane = yellow. Code-differential,
//    SBAS, single-point and stale solutions = red.
//  * An unrecognised-but-present token is SURFACED (yellow "Unknown"), never folded
//    into "no data" — that is how PSRDIFF used to disappear from the UI.
//  * Empty / missing status keeps label "--" so the GPS banner stays hidden.

// Ordered: exact match first, then the first token contained in the raw status
// (keeps the previous `includes()` tolerance; specific tokens come before generic ones).
const PRECISION_TABLE: [token: string, level: PrecisionLevel][] = [
  // RTK fixed — centimeter
  ["NARROW_INT", { label: "Centimeter", short: "Fixed", detail: "RTK fixed — carrier-phase ambiguities resolved; may toggle near threshold", variant: "green" }],
  ["L1_INT", { label: "Centimeter", short: "Fixed", detail: "Single-frequency RTK fixed — ambiguities resolved", variant: "green" }],
  ["INS_RTKFIXED", { label: "Centimeter", short: "Fixed", detail: "INS-aided RTK fixed solution", variant: "green" }],
  // Converging — decimeter / sub-meter
  ["WIDE_INT", { label: "Decimeter", short: "W-Int", detail: "Wide-lane ambiguities resolved — intermediate accuracy, not yet a full fix", variant: "yellow" }],
  ["NARROW_FLOAT", { label: "Sub-meter", short: "Float", detail: "RTK float — ambiguities not yet fixed; can toggle even when signal looks unchanged", variant: "yellow" }],
  ["L1_FLOAT", { label: "Sub-meter", short: "Float", detail: "Single-frequency RTK float — ambiguities not yet fixed", variant: "yellow" }],
  ["IONOFREE_FLOAT", { label: "Sub-meter", short: "Float", detail: "Iono-free RTK float — ambiguities not yet fixed", variant: "yellow" }],
  ["WIDE_FLOAT", { label: "Sub-meter", short: "W-Float", detail: "Wide-lane float — ambiguities not yet fixed", variant: "yellow" }],
  ["INS_RTKFLOAT", { label: "Sub-meter", short: "Float", detail: "INS-aided RTK float", variant: "yellow" }],
  // No RTK solution — low precision
  ["PSRDIFF", { label: "Low precision", short: "PSRDIFF", detail: "Pseudorange differential (DGPS, ~0.4 m) — corrections are arriving, but no RTK carrier-phase fix yet", variant: "red" }],
  ["DGPS", { label: "Low precision", short: "DGPS", detail: "Differential GPS (same class as PSRDIFF, ~0.4 m) — no RTK fix", variant: "red" }],
  ["WAAS", { label: "Low precision", short: "SBAS", detail: "SBAS-corrected single point — no RTK fix", variant: "red" }],
  ["SBAS", { label: "Low precision", short: "SBAS", detail: "SBAS-corrected single point — no RTK fix", variant: "red" }],
  ["SINGLE", { label: "2–5 m", short: "Single", detail: "Standalone GPS — no RTK corrections applied", variant: "red" }],
  ["PSRSP", { label: "2–5 m", short: "Single", detail: "Pseudorange single point — no corrections applied", variant: "red" }],
  ["PROPAGATED", { label: "Stale", short: "Stale", detail: "Propagated from the last solution — position may be drifting", variant: "red" }],
  ["DOPPLER_VELOCITY", { label: "No position", short: "Doppler", detail: "Doppler velocity only — no usable position fix", variant: "red" }],
  ["FIXEDPOS", { label: "Manual", short: "FixedPos", detail: "Position fixed by configuration, not computed from GNSS", variant: "gray" }],
  ["FIXEDHEIGHT", { label: "Manual", short: "FixedHt", detail: "Height constrained by configuration", variant: "gray" }],
  ["NONE", { label: "No fix", short: "No fix", detail: "Receiver reports no position solution", variant: "red" }],
];

const PRECISION_BY_TOKEN = new Map(PRECISION_TABLE);

const NO_PRECISION: PrecisionLevel = { label: "--", short: "--", detail: "No positioning data", variant: "gray" };

export function getPrecision(status: string | null | undefined): PrecisionLevel {
  const token = (status ?? "").trim().toUpperCase();
  if (!token) return NO_PRECISION;

  const exact = PRECISION_BY_TOKEN.get(token);
  if (exact) return exact;

  const partial = PRECISION_TABLE.find(([t]) => token.includes(t));
  if (partial) return partial[1];

  // Present but unrecognised: show it instead of hiding it.
  return {
    label: "Unknown",
    short: token.length > 10 ? `${token.slice(0, 9)}…` : token,
    detail: `Unrecognised positioning mode "${status}" — precision not verified. Please report it.`,
    variant: "yellow",
  };
}

/** True only for a genuine RTK integer (centimeter) fix. */
export function isRtkFixed(status: string | null | undefined): boolean {
  return getPrecision(status).variant === "green";
}
