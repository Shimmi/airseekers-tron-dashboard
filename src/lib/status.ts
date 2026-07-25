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

export function getPrecision(status: string): PrecisionLevel {
  if (status.includes("NARROW_INT"))
    return { label: "Centimeter", short: "Fixed", detail: "RTK fixed integer — highest accuracy", variant: "green" };
  if (status.includes("NARROW_FLOAT"))
    return { label: "Sub-meter", short: "Float", detail: "RTK float — converging to full fix", variant: "yellow" };
  if (status.includes("WIDE_INT"))
    return { label: "Decimeter", short: "W-Int", detail: "Wide-lane integer fix", variant: "yellow" };
  if (status.includes("WIDE_FLOAT"))
    return { label: "Sub-meter", short: "W-Float", detail: "Wide-lane float solution", variant: "yellow" };
  if (status === "DGPS")
    return { label: "1–2 m", short: "DGPS", detail: "Differential GPS correction only", variant: "red" };
  if (status === "SINGLE")
    return { label: "2–5 m", short: "Single", detail: "Standalone GPS — no RTK corrections", variant: "red" };
  return { label: "--", short: "--", detail: "No positioning data", variant: "gray" };
}
