import type { MotorData, MotorsData } from "../lib/parsers";
import { healthVar } from "../lib/status";
import { Card } from "./Card";

const BLADE_MAX_RPM = 3600;
const TEMP_MAX = 80;

function statusColor(motor: MotorData): string {
  if (motor.error) return healthVar("red");
  if (motor.status === "Running") return healthVar("green");
  return healthVar("gray");
}

function tempColor(t: number): string {
  if (t >= 70) return "var(--red)";
  if (t >= 55) return "var(--yellow)";
  return "var(--green)";
}

function BladeHero({ motor }: { motor: MotorData }) {
  const rpm = Math.abs(motor.rpm);
  const fraction = Math.min(rpm / BLADE_MAX_RPM, 1);
  const circumference = 2 * Math.PI * 38;
  const color = statusColor(motor);
  const active = motor.status === "Running";

  return (
    <div className="motor-blade-hero">
      <div className="motor-blade-gauge">
        <svg viewBox="0 0 96 96" className="motor-blade-ring">
          <circle
            cx="48" cy="48" r="38"
            fill="none" stroke="var(--border)" strokeWidth="6"
          />
          <circle
            cx="48" cy="48" r="38"
            fill="none" stroke={color} strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - fraction)}
            transform="rotate(-90 48 48)"
            style={{ transition: "stroke-dashoffset 0.6s ease, stroke 0.3s" }}
          />
        </svg>
        <div className="motor-blade-gauge-text">
          <span className="motor-blade-rpm">{rpm}</span>
          <span className="motor-blade-rpm-unit">RPM</span>
        </div>
      </div>
      <div className="motor-blade-info">
        <div className="motor-blade-title">
          <span className="motor-blade-dot" style={{ background: color }} />
          Cutter
          <span className={`motor-blade-status${active ? " motor-blade-status--active" : ""}`}>
            {motor.status}
          </span>
        </div>
        <div className="motor-blade-stats">
          <span className="motor-stat">
            <span className="motor-stat-value" style={{ color: tempColor(motor.temperature) }}>{motor.temperature}</span>
            <span className="motor-stat-unit">°C</span>
          </span>
          <span className="motor-stat">
            <span className="motor-stat-value">{motor.current.toFixed(1)}</span>
            <span className="motor-stat-unit">A</span>
          </span>
        </div>
      </div>
    </div>
  );
}

function WheelCard({ label, motor }: { label: string; motor: MotorData }) {
  const active = motor.status === "Running";
  const color = statusColor(motor);
  const tempFraction = Math.min(motor.temperature / TEMP_MAX, 1);

  return (
    <div className={`motor-wheel-card${motor.error ? " motor-wheel-card--error" : ""}`}>
      <div className="motor-wheel-header">
        <span className="motor-wheel-dot" style={{ background: color }} />
        <span className="motor-wheel-label">{label}</span>
        <span
          className={`motor-wheel-status${active ? " motor-wheel-status--active" : ""}`}
          title={motor.status === "Holding" ? "Position hold: motor energised at standstill (normal when docked)" : undefined}
        >
          {motor.status}
        </span>
      </div>
      <div className="motor-wheel-metrics">
        <div className="motor-wheel-metric">
          <span className="motor-wheel-metric-value">{Math.abs(motor.rpm)}</span>
          <span className="motor-wheel-metric-unit">RPM</span>
        </div>
        <div className="motor-wheel-metric">
          <span className="motor-wheel-metric-value">{motor.current.toFixed(1)}</span>
          <span className="motor-wheel-metric-unit">A</span>
        </div>
      </div>
      <div className="motor-temp-bar-wrap">
        <div className="motor-temp-bar-track">
          <div
            className="motor-temp-bar-fill"
            style={{
              width: `${tempFraction * 100}%`,
              background: tempColor(motor.temperature),
              transition: "width 0.4s ease, background 0.3s",
            }}
          />
        </div>
        <span className="motor-temp-bar-label" style={{ color: tempColor(motor.temperature) }}>
          {motor.temperature} °C
        </span>
      </div>
    </div>
  );
}

export function MotorsWidget({
  data,
  cutterHeight,
  id,
}: {
  data: MotorsData | null;
  cutterHeight: number | null;
  id?: string;
}) {
  if (!data) {
    return (
      <Card title="Motors" id={id}>
        <div className="motors-empty">Waiting for data…</div>
      </Card>
    );
  }

  const heightColor = statusColor(data.height);

  return (
    <Card title="Motors" id={id}>
      <BladeHero motor={data.cutter} />

      <div className="motor-section-header">Drive</div>
      <div className="motor-wheels">
        <WheelCard label="Left" motor={data.left} />
        <WheelCard label="Right" motor={data.right} />
      </div>

      <div className="motor-section-header">Deck</div>
      <div className="motor-deck-card">
        <div className="motor-deck-top">
          <span className="motor-wheel-dot" style={{ background: heightColor }} />
          <span className="motor-wheel-label">Height</span>
          {cutterHeight != null && (
            <span className="motor-deck-height">
              <span className="motor-stat-value">{cutterHeight}</span>
              <span className="motor-stat-unit">mm</span>
            </span>
          )}
          <span className={`motor-wheel-status${data.height.status === "Running" ? " motor-wheel-status--active" : ""}`}>
            {data.height.status}
          </span>
        </div>
      </div>
    </Card>
  );
}
