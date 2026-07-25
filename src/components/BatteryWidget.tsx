import type { BatteryData } from "../lib/parsers";
import { batteryColor, healthVar } from "../lib/status";
import { Badge, Card, MetricRow } from "./Card";

const STATUS_VARIANT = {
  CHARGING: "green",
  DISCHARGING: "yellow",
  FULL: "blue",
  NOT_CHARGING: "gray",
  UNKNOWN: "gray",
} as const;

export function BatteryWidget({ data, id }: { data: BatteryData | null; id?: string }) {
  const pct = data?.percentage ?? 0;
  const color = data ? healthVar(batteryColor(pct)) : "var(--text3)";

  return (
    <Card title="Battery" id={id}>
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
        label="Current"
        value={data ? `${data.current} A` : "--"}
      />
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
