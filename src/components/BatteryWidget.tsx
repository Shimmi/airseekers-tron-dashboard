import type { BatteryData, BatteryHealthData } from "../lib/parsers";
import { batteryColor, healthVar } from "../lib/status";
import { Badge, Card, MetricRow } from "./Card";

const STATUS_VARIANT = {
  CHARGING: "green",
  DISCHARGING: "yellow",
  FULL: "blue",
  NOT_CHARGING: "gray",
  UNKNOWN: "gray",
} as const;

const HEALTH_VARIANT: Record<string, "green" | "yellow" | "red" | "gray"> = {
  OVERHEAT: "red",
  DEAD: "red",
  OVERVOLTAGE: "red",
  UNSPEC_FAILURE: "red",
  COLD: "yellow",
  WATCHDOG: "red",
  SAFETY_TIMER: "red",
};

function tempColor(t: number): string {
  if (t >= 45) return "var(--red)";
  if (t >= 38) return "var(--yellow)";
  return "var(--text)";
}

function currentLabel(status: BatteryData["status"]): { label: string; arrow: string; cssClass: string } {
  if (status === "CHARGING") return { label: "Charging", arrow: "▲ ", cssClass: "battery-current-arrow--in" };
  if (status === "DISCHARGING") return { label: "Draw", arrow: "▼ ", cssClass: "" };
  return { label: "Standby", arrow: "", cssClass: "" };
}

export function BatteryWidget({
  data,
  batteryHealth,
  id,
}: {
  data: BatteryData | null;
  batteryHealth: BatteryHealthData | null;
  id?: string;
}) {
  const pct = data?.percentage ?? 0;
  const color = data ? healthVar(batteryColor(pct)) : "var(--text3)";

  const temp = batteryHealth?.temperature ?? null;
  const error = batteryHealth?.error ?? "0";
  const health = data?.health;
  const showHealthBadge = health && health !== "UNKNOWN" && health !== "GOOD";
  const cur = data ? currentLabel(data.status) : null;

  return (
    <Card title="Battery" id={id}>
      {error !== "0" && (
        <div className="battery-error-alert">
          Battery error: {error}
        </div>
      )}
      {showHealthBadge && (
        <div className="battery-health-alert">
          <Badge variant={HEALTH_VARIANT[health] ?? "red"}>{health}</Badge>
        </div>
      )}

      <div className="battery-hero">
        <div className="battery-gauge">
          <svg viewBox="0 0 120 120" className="battery-ring">
            <circle
              cx="60"
              cy="60"
              r="52"
              fill="none"
              stroke="var(--border)"
              strokeWidth="8"
            />
            <circle
              cx="60"
              cy="60"
              r="52"
              fill="none"
              stroke={color}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 52}`}
              strokeDashoffset={`${2 * Math.PI * 52 * (1 - (data ? pct / 100 : 0))}`}
              transform="rotate(-90 60 60)"
              style={{ transition: "stroke-dashoffset 0.6s ease, stroke 0.3s" }}
            />
          </svg>
          <div className="battery-gauge-text">
            <span className="battery-pct">{data ? pct : "--"}</span>
            <span className="battery-pct-sign">%</span>
          </div>
        </div>

        <div className="battery-voltage">
          <span className="battery-voltage-value">
            {data ? data.voltage : "--"}
          </span>
          <span className="battery-voltage-unit">V</span>
        </div>
      </div>

      <MetricRow
        label={cur?.label ?? "Current"}
        value={
          data ? (
            <>
              {cur?.arrow && (
                <span className={`battery-current-arrow ${cur.cssClass}`}>{cur.arrow}</span>
              )}
              {Math.abs(data.current)} A
            </>
          ) : (
            "--"
          )
        }
      />

      {temp !== null && (
        <MetricRow
          label="Temperature"
          value={<span style={{ color: tempColor(temp) }}>{temp} °C</span>}
        />
      )}

      <MetricRow
        label="Status"
        value={
          data ? (
            <Badge variant={STATUS_VARIANT[data.status]}>{data.status}</Badge>
          ) : (
            "--"
          )
        }
      />
    </Card>
  );
}
