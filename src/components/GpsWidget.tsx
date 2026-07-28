import type { GpsInfoData, LocalizationData, RefInfoData } from "../lib/parsers";
import { colorForValue, getFusionError, getLocState, getPrecision, rssiColor, type Health } from "../lib/status";
import { Badge, Card } from "./Card";

export function GpsWidget({
  localization,
  gpsInfo,
  refInfo,
  nrtkEnabled,
  nrtkNetMode,
  id,
}: {
  localization: LocalizationData | null;
  gpsInfo: GpsInfoData | null;
  refInfo: RefInfoData | null;
  nrtkEnabled: boolean | null;
  nrtkNetMode: string | null;
  id?: string;
}) {
  const satsVisible = localization?.satellites ?? null;
  const satsTracked = gpsInfo?.satellitesTracked ?? null;
  const precision = localization ? getPrecision(localization.rtkStatus) : null;
  const satColor = satsTracked != null ? colorForValue(satsTracked, 12, 8) : "gray";
  const fusion = localization ? getFusionError(localization.fusionError) : null;
  const locAlert = fusion && fusion.health === "red";
  const visionActive = localization?.locState != null && localization.locState > 0;
  const locState = visionActive ? getLocState(localization!.locState) : null;

  const loraRssi = localization?.loraRssi;
  const refStation = localization?.refStation;
  // Corrections actively flowing = link is FINE or COARSE (not FAIL, not null)
  const loraLinkOk = refStation === "FINE" || refStation === "COARSE";
  // RTK Base is the active correction source only when link is up AND NRTK is off
  const loraActive = loraLinkOk && nrtkEnabled !== true;
  const baseOnline = refInfo?.online ?? null;

  return (
    <Card title="GPS / RTK" id={id}>
      {/* Localization alert */}
      {locAlert && (
        <div className="gps-precision gps-precision--red gps-loc-alert">
          <div className="gps-precision-row">
            <span className="gps-precision-label">Localization</span>
            <span className="gps-precision-value">{fusion.label}</span>
          </div>
          <span className="gps-precision-detail">Machine cannot navigate — check environment and RTK signal</span>
        </div>
      )}

      {/* Precision banner */}
      {precision && precision.label !== "--" && (
        <div className={`gps-precision gps-precision--${precision.variant}`}>
          <div className="gps-precision-row">
            <span className="gps-precision-label">Positioning</span>
            <span className="gps-precision-value">{precision.label}</span>
          </div>
          <span className="gps-precision-detail">{precision.detail}</span>
        </div>
      )}

      {/* Satellite hero */}
      <div className="gps-hero">
        <div className="gps-sats">
          <span className={`gps-sats-value gps-sats-value--${satColor}`}>
            {satsTracked ?? "--"}
          </span>
          <span className="gps-sats-unit">
            tracked{satsVisible != null && ` / ${satsVisible} visible`}
          </span>
        </div>
        <div className="gps-rtk-badge">
          {localization
            ? <Badge variant={precision?.variant ?? "gray"}>
                {localization.rtkStatus.replace("NARROW_", "").replace("WIDE_", "W-")}
              </Badge>
            : <Badge>--</Badge>}
        </div>
      </div>

      {/* ── CORRECTIONS ── */}
      <div className="gps-section-header">Corrections</div>
      <div className="gps-corrections">
        <CorrectionChannel
          label="RTK Base"
          hint="LoRa radio link"
          active={loraActive}
          dimmed={!loraLinkOk && baseOnline === false}
          metrics={[
            { label: "RSSI", value: loraRssi != null ? `${loraRssi} dBm` : "--", color: loraRssi != null ? rssiColor(loraRssi) : undefined },
            { label: "Link", value: refStation ?? "--", color: refStation === "FINE" ? "green" : refStation === "COARSE" ? "yellow" : refStation === "FAIL" ? "red" : undefined },
            { label: "Base FW", value: baseOnline === true && refInfo!.version ? refInfo!.version : "--" },
          ]}
        />
        <CorrectionChannel
          label="NRTK"
          hint="Corrections via cellular"
          active={nrtkEnabled === true}
          metrics={[
            { label: "Status", value: nrtkEnabled != null ? (nrtkEnabled ? "Enabled" : "Off") : "--", color: nrtkEnabled ? "green" : undefined },
            ...(nrtkNetMode ? [{ label: "Mode", value: nrtkNetMode === "auto" ? "Adaptive" : nrtkNetMode }] : []),
          ]}
        />
      </div>

      {/* ── MOWER ── */}
      <div className="gps-section-header">Mower</div>
      <div className="gps-metrics">
        <GpsMetric
          label="Satellites"
          hint="Locked by mower's own antenna"
          value={satsTracked ?? "--"}
          color={satColor !== "gray" ? satColor : undefined}
        />
        <GpsMetric
          label="GPS Quality"
          hint="Overall signal quality · 80+ is good"
          value={gpsInfo?.quality ?? "--"}
          unit="%"
          color={typeof gpsInfo?.quality === "number" ? colorForValue(gpsInfo.quality, 80, 50) : undefined}
        />
        <GpsMetric
          label="SNR"
          hint="Signal clarity · 30+ good, 40+ excellent"
          value={gpsInfo?.snr ?? "--"}
          unit=" dB-Hz"
          color={typeof gpsInfo?.snr === "number" ? colorForValue(gpsInfo.snr, 30, 20) : undefined}
        />
        {locState && (
          <GpsMetric
            label="Vision Loc"
            hint="Camera/SLAM localization · separate from RTK"
            value={locState.label}
            color={locState.health}
          />
        )}
      </div>
    </Card>
  );
}

function CorrectionChannel({
  label,
  hint,
  active,
  dimmed,
  metrics,
}: {
  label: string;
  hint: string;
  active: boolean;
  dimmed?: boolean;
  metrics: { label: string; value: React.ReactNode; color?: Health }[];
}) {
  const cls = `gps-correction-card${active ? " gps-correction-card--active" : ""}${dimmed ? " gps-correction-card--dimmed" : ""}`;
  return (
    <div className={cls}>
      <div className="gps-correction-header">
        <span className={`gps-correction-dot${active ? " gps-correction-dot--on" : ""}`} />
        <span className="gps-correction-label">{label}</span>
      </div>
      <span className="gps-correction-hint">{hint}</span>
      {metrics.map((m) => (
        <div key={m.label} className="gps-correction-metric">
          <span className="gps-correction-metric-label">{m.label}</span>
          <span className={`gps-correction-metric-value${m.color ? ` gps-metric-value--${m.color}` : ""}`}>
            {m.value}
          </span>
        </div>
      ))}
    </div>
  );
}

function GpsMetric({
  label,
  hint,
  value,
  unit,
  color,
}: {
  label: string;
  hint: string;
  value: React.ReactNode;
  unit?: string;
  color?: Health;
}) {
  return (
    <div className="gps-metric">
      <div className="gps-metric-left">
        <span className="gps-metric-label">{label}</span>
        <span className="gps-metric-hint">{hint}</span>
      </div>
      <span className={`gps-metric-value${color ? ` gps-metric-value--${color}` : ""}`}>
        {value}{unit && typeof value === "number" ? unit : ""}
      </span>
    </div>
  );
}
