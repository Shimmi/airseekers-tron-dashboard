import type { ReactNode } from "react";
import posthog from "posthog-js";
import type { BatteryData, LocalizationData, MowerStatusData } from "../lib/parsers";
import {
  batteryColor,
  getFusionError,
  getPrecision,
  healthVar,
  rssiColor,
  type Health,
} from "../lib/status";
import { Card } from "./Card";

// Safety triggers, in priority order — the first active one is surfaced.
const SAFETY_TRIGGERS: [key: string, label: string][] = [
  ["stop_triggered", "E-Stop"],
  ["lift_triggered", "Lifted"],
  ["rain_triggered", "Rain"],
  ["bumper_triggered", "Bumper"],
  ["left_bumper_triggered", "Bumper"],
  ["right_bumper_triggered", "Bumper"],
];

const STATE_HEALTH: Record<string, Health> = {
  MOWING: "green",
  MOVING: "green",
  CHARGING: "yellow",
  DOCKED: "gray",
  IDLE: "gray",
  STOPPED: "red",
};

function num(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function StatusStripWidget({
  battery,
  network,
  localization,
  mowerStatus,
  nrtkEnabled,
}: {
  battery: BatteryData | null;
  network: Record<string, unknown> | null;
  localization: LocalizationData | null;
  mowerStatus: MowerStatusData | null;
  nrtkEnabled: boolean | null;
}) {
  // WiFi
  const wifiDbm = num(network?.wifi_dbm);
  const wifiHealth: Health = wifiDbm != null ? rssiColor(wifiDbm) : "gray";
  const wifiSsid = (network?.ssid as string) || undefined;

  // Battery
  const pct = battery?.percentage ?? null;
  const charging = battery?.status === "CHARGING" || battery?.status === "FULL";
  const battHealth: Health = pct != null ? batteryColor(pct) : "gray";

  // RTK positioning
  const precision = localization ? getPrecision(localization.rtkStatus) : null;

  // 4G / cellular
  const has4g = Boolean(network?.["4g_ip"]);
  const simActive = Boolean(network?.sim_active);
  const cellHealth: Health = !network
    ? "gray"
    : simActive && has4g
      ? "green"
      : simActive
        ? "yellow"
        : "gray";
  const cellValue = !network ? "—" : simActive && has4g ? "Active" : simActive ? "No IP" : "Off";

  // Mower state
  const state = mowerStatus?.state ?? null;
  const stateHealth: Health = state ? STATE_HEALTH[state] ?? "gray" : "gray";

  // LoRa base-station link
  const loraRssi = localization?.loraRssi ?? null;
  const loraHealth: Health = loraRssi != null ? rssiColor(loraRssi) : "gray";

  // Navigation fusion
  const fusion = localization ? getFusionError(localization.fusionError) : null;
  const navHealth: Health = fusion?.health ?? "gray";
  const navValue = fusion?.label ?? "—";

  // Safety
  const activeSafety = mowerStatus
    ? SAFETY_TRIGGERS.find(([key]) => mowerStatus.triggers[key])
    : null;
  const safetyHealth: Health = !mowerStatus ? "gray" : activeSafety ? "red" : "green";
  const safetyValue = !mowerStatus ? "—" : activeSafety ? activeSafety[1] : "Clear";

  return (
    <Card title="Status" className="card--wide status-strip-card">
      <div className="status-strip">
        <Indicator
          health={wifiHealth}
          label="WiFi"
          value={wifiDbm != null ? `${wifiDbm} dBm` : "—"}
          title={wifiSsid ? `${wifiSsid} · ${wifiDbm} dBm` : "WiFi signal"}
          icon={<WifiIcon level={wifiDbm != null ? rssiLevel(wifiDbm) : 0} />}
          target="widget-network"
        />
        <Indicator
          health={battHealth}
          label={charging ? "Charging" : "Battery"}
          value={pct != null ? `${pct}%` : "—"}
          title={battery ? `${pct}% · ${battery.status}` : "Battery"}
          icon={<BatteryIcon pct={pct ?? 0} charging={charging} />}
          target="widget-battery"
        />
        <Indicator
          health={precision?.variant ?? "gray"}
          label="RTK"
          value={precision?.short ?? "—"}
          title={precision?.detail ?? "Positioning"}
          icon={<TargetIcon />}
          target="widget-gps"
        />
        <Indicator
          health={nrtkEnabled ? "green" : "gray"}
          label="nRTK"
          value={nrtkEnabled == null ? "—" : nrtkEnabled ? "On" : "Off"}
          title="Network RTK corrections via cellular"
          icon={<GlobeIcon />}
          target="widget-gps"
        />
        <Indicator
          health={cellHealth}
          label="4G"
          value={cellValue}
          title="Cellular / SIM connectivity"
          icon={<CellularIcon active={simActive} />}
          target="widget-network"
        />
        <Indicator
          health={stateHealth}
          label="State"
          value={state ?? "—"}
          title="Mower operating state"
          icon={<CogIcon />}
          target="widget-mower-status"
        />
        <Indicator
          health={loraHealth}
          label="LoRa"
          value={loraRssi != null ? `${loraRssi} dBm` : "—"}
          title="Base-station radio link"
          icon={<BroadcastIcon />}
          target="widget-gps"
        />
        <Indicator
          health={navHealth}
          label="Nav"
          value={navValue}
          title={fusion?.health === "red" ? `${fusion.label} — machine cannot navigate` : "Navigation OK"}
          icon={<CompassIcon alert={fusion?.health === "red"} />}
          target="widget-gps"
        />
        <Indicator
          health={safetyHealth}
          label="Safety"
          value={safetyValue}
          title={activeSafety ? `${activeSafety[1]} triggered` : "No safety triggers"}
          icon={<ShieldIcon alert={Boolean(activeSafety)} />}
          target="widget-mower-status"
        />
      </div>
    </Card>
  );
}

function Indicator({
  health,
  label,
  value,
  title,
  icon,
  target,
}: {
  health: Health;
  label: string;
  value: string;
  title: string;
  icon: ReactNode;
  target?: string;
}) {
  const scrollToTarget = () => {
    if (!target) return;
    posthog.capture("strip_indicator_clicked", { indicator: label.toLowerCase() });
    document.getElementById(target)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div
      className="status-ind"
      style={{ color: healthVar(health) }}
      title={title}
      data-umami-event={`strip-${label.toLowerCase()}`}
      onClick={target ? scrollToTarget : undefined}
      role={target ? "button" : undefined}
      tabIndex={target ? 0 : undefined}
      onKeyDown={
        target
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                scrollToTarget();
              }
            }
          : undefined
      }
    >
      <div className="status-ind-icon">{icon}</div>
      <span className="status-ind-value">{value}</span>
      <span className="status-ind-label">{label}</span>
    </div>
  );
}

// ── Icons ──────────────────────────────────────────────────────────
// All icons draw in currentColor, inheriting the indicator's health color.

/** Map dBm to 0–3 lit arcs/bars. */
function rssiLevel(rssi: number): number {
  if (rssi >= -60) return 3;
  if (rssi >= -70) return 2;
  if (rssi >= -80) return 1;
  return 0;
}

function WifiIcon({ level }: { level: number }) {
  const arcs = [
    "M8.5 14.5a5 5 0 0 1 7 0",
    "M5.5 11.5a9 9 0 0 1 13 0",
    "M2.5 8.5a13 13 0 0 1 19 0",
  ];
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      {arcs.map((d, i) => (
        <path key={i} d={d} opacity={i < level ? 1 : 0.22} />
      ))}
      <circle cx="12" cy="18" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  );
}

function BatteryIcon({ pct, charging }: { pct: number; charging: boolean }) {
  const fillW = Math.max(0, Math.min(1, pct / 100)) * 17;
  return (
    <svg viewBox="0 0 28 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="2" y="7" width="20" height="10" rx="2.5" />
      <rect x="23.2" y="10" width="2.2" height="4" rx="1" fill="currentColor" stroke="none" />
      <rect
        x="3.5"
        y="8.5"
        width={fillW}
        height="7"
        rx="1"
        fill="currentColor"
        stroke="none"
        style={{ transition: "width 0.5s ease" }}
      />
      {charging && (
        <path
          d="M13.5 8l-3 4.2h2.4L11.5 16l3.4-4.6h-2.5L13.5 8z"
          fill="currentColor"
          stroke="var(--surface)"
          strokeWidth="0.9"
        />
      )}
    </svg>
  );
}

function TargetIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="1.8" fill="currentColor" stroke="none" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <ellipse cx="12" cy="12" rx="4" ry="9" />
    </svg>
  );
}

function CellularIcon({ active }: { active: boolean }) {
  const bars = [
    { x: 3, y: 15, h: 6 },
    { x: 8.5, y: 12, h: 9 },
    { x: 14, y: 8.5, h: 12.5 },
    { x: 19.5, y: 5, h: 16 },
  ];
  return (
    <svg viewBox="0 0 24 24" fill="currentColor">
      {bars.map((b, i) => (
        <rect key={i} x={b.x} y={b.y} width="3" height={b.h} rx="1" opacity={active ? 1 : 0.22} />
      ))}
    </svg>
  );
}

function CogIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round">
      <path d="M12 3.5l1.6.9 1.8-.3.9 1.6 1.6.9-.3 1.8.9 1.6-.9 1.6.3 1.8-1.6.9-.9 1.6-1.8-.3-1.6.9-1.6-.9-1.8.3-.9-1.6-1.6-.9.3-1.8-.9-1.6.9-1.6-.3-1.8 1.6-.9.9-1.6 1.8.3z" />
      <circle cx="12" cy="12" r="2.6" />
    </svg>
  );
}

function BroadcastIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
      <circle cx="12" cy="12" r="2.2" fill="currentColor" stroke="none" />
      <path d="M7.8 7.8a6 6 0 0 0 0 8.4M16.2 7.8a6 6 0 0 1 0 8.4" />
      <path d="M5 5a10 10 0 0 0 0 14M19 5a10 10 0 0 1 0 14" opacity="0.55" />
    </svg>
  );
}

function CompassIcon({ alert }: { alert: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      {alert ? (
        <path d="M12 8.5v4M12 15.4v.1" />
      ) : (
        <polygon points="12,5 14.5,14 12,12.5 9.5,14" fill="currentColor" stroke="none" />
      )}
    </svg>
  );
}

function ShieldIcon({ alert }: { alert: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l7 2.5v5c0 4.5-3 8-7 9.5-4-1.5-7-5-7-9.5v-5L12 3z" />
      {alert ? (
        <path d="M12 8.5v4M12 15.4v.1" />
      ) : (
        <path d="M9 12l2 2 4-4" />
      )}
    </svg>
  );
}
