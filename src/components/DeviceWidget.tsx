import { useCallback, useState } from "react";
import posthog from "posthog-js";
import type { GpsInfoData } from "../lib/parsers";
import { Card, Chevron } from "./Card";
import { copyToClipboard } from "../lib/debugInfo";

function cleanFirmware(raw: string): { short: string; full: string } {
  const match = raw.match(/v?(\d+\.\d+\.\d+)/);
  return { short: match ? `v${match[1]}` : raw, full: raw };
}

export function DeviceWidget({
  gpsInfo,
  sensorInfo,
  config,
  network,
  debugText,
}: {
  gpsInfo: GpsInfoData | null;
  sensorInfo: Record<string, unknown> | null;
  config: Record<string, unknown> | null;
  network: Record<string, unknown> | null;
  debugText: string;
}) {
  const rawFw = str(sensorInfo?.mower_package_version);
  const fw = rawFw ? cleanFirmware(rawFw) : null;
  const chassis = str(sensorInfo?.chassis_board_version);
  const cutter = str(sensorInfo?.cutter_board_version);
  const ip = str(network?.wifi_ip);
  const locked = config?.DeviceLock === "1";

  return (
    <Card title="Device" hideTitle className="device-card card--wide">
      <details className="device-details">
        <summary className="expandable-header device-summary">
          <img src="/tron.png" alt="Airseekers Tron" className="device-img" />
          <div className="device-hero-text">
            <span className="device-name">Airseekers Tron</span>
            {fw && <span className="device-firmware" title={fw.full}>{fw.short}</span>}
            {locked && <span className="device-lock">Device Locked</span>}
          </div>
          <CopyDebugButton debugText={debugText} />
          <span className="expand-hint">more</span>
          <Chevron />
        </summary>

        <div className="device-metrics">
          {ip && <DeviceRow label="IP" value={ip} />}
          <DeviceRow label="Firmware" value={fw?.full} hint="Main software package" />
          <DeviceRow label="Chassis" value={chassis} hint="Drive & sensor board" />
          <DeviceRow label="Cutter Deck" value={cutter} hint="Blade controller board" />
          <DeviceRow label="RTK" value={gpsInfo?.version} hint="GPS positioning module" />
          <DeviceRow label="RTK Hardware" value={gpsInfo?.hardwareVersion ? `v${gpsInfo.hardwareVersion}` : undefined} />
          <DeviceRow label="LoRa" value={gpsInfo?.loraVersion} hint="Base station radio link" />
        </div>
      </details>
    </Card>
  );
}

function str(v: unknown): string | undefined {
  if (v == null) return undefined;
  const s = String(v);
  return s && s !== "undefined" ? s : undefined;
}

function CopyDebugButton({ debugText }: { debugText: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    copyToClipboard(debugText).then((ok) => {
      if (ok) {
        posthog.capture("debug_info_copied");
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    });
  }, [debugText]);

  return (
    <button className="debug-copy-btn" onClick={handleCopy}>
      {copied ? "Copied!" : "Copy Debug Info"}
    </button>
  );
}

function DeviceRow({ label, value, hint }: { label: string; value?: string; hint?: string }) {
  return (
    <div className="device-row">
      <div className="device-row-left">
        <span className="device-row-label">{label}</span>
        {hint && <span className="device-row-hint">{hint}</span>}
      </div>
      <span className={`device-row-value${!value ? " device-row-value--empty" : ""}`}>
        {value || "--"}
      </span>
    </div>
  );
}
