import type { GpsInfoData, LocalizationData } from "../lib/parsers";
import { colorForValue, getFusionError, getLocState, getPrecision, rssiColor, type Health } from "../lib/status";
import { Badge, Card } from "./Card";

export function GpsWidget({
  localization,
  gpsInfo,
  nrtkEnabled,
  id,
}: {
  localization: LocalizationData | null;
  gpsInfo: GpsInfoData | null;
  nrtkEnabled: boolean | null;
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

      {/* Metrics with descriptions */}
      <div className="gps-metrics">
        <GpsMetric
          label="Satellites"
          hint="Locked by receiver · 12+ green, 8+ yellow, <8 red"
          value={satsTracked ?? "--"}
          color={satColor !== "gray" ? satColor : undefined}
        />
        <GpsMetric
          label="LoRa RSSI"
          hint="Base station signal · above −60 is good"
          value={localization?.loraRssi != null ? `${localization.loraRssi} dBm` : "--"}
          color={localization?.loraRssi != null ? rssiColor(localization.loraRssi) : undefined}
        />
        <GpsMetric
          label="Base Station"
          hint="RTK correction detail · FINE = full accuracy"
          value={localization?.refStation ?? "--"}
          color={localization?.refStation === "FINE" ? "green" : localization?.refStation === "COARSE" ? "yellow" : undefined}
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
        <GpsMetric
          label="NRTK"
          hint="Network RTK corrections via cellular"
          value={
            nrtkEnabled != null
              ? <Badge variant={nrtkEnabled ? "green" : "gray"}>
                  {nrtkEnabled ? "ENABLED" : "DISABLED"}
                </Badge>
              : "--"
          }
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
