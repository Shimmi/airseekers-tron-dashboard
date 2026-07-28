import type { MowerData } from "../hooks/useMowerData";

function str(v: unknown): string | undefined {
  if (v == null) return undefined;
  const s = String(v);
  return s && s !== "undefined" ? s : undefined;
}

function maskSsid(ssid: string): string {
  if (ssid.length <= 3) return ssid[0] + "***";
  return ssid.slice(0, 3) + "***";
}

export function buildDebugInfo(
  data: MowerData,
  nrtkEnabled: boolean | null,
): string {
  const lines: string[] = [];

  const fw = str(data.sensorInfo?.mower_package_version);
  lines.push(`Airseekers Tron · ${fw ?? "unknown"}`);

  const b = data.battery;
  const bh = data.batteryHealth;
  if (b) {
    const parts = [
      `${b.percentage}%`,
      `${b.voltage}V`,
      `${Math.abs(b.current)}A`,
    ];
    if (bh?.temperature != null) parts.push(`${bh.temperature}°C`);
    parts.push(b.status);
    lines.push(`Battery:     ${parts.join(" · ")}`);
  }

  const loc = data.localization;
  const gps = data.gpsInfo;
  if (loc || gps) {
    const parts: string[] = [];
    if (loc?.rtkStatus) parts.push(loc.rtkStatus);
    if (loc?.satellites != null) parts.push(`${loc.satellites} sats`);
    if (gps?.snr) parts.push(`SNR ${gps.snr} dB-Hz`);
    if (parts.length) lines.push(`GPS Fix:     ${parts.join(" · ")}`);
  }

  const ref = data.refInfo;
  {
    const parts: string[] = [];
    parts.push(nrtkEnabled ? "Enabled" : nrtkEnabled === false ? "Disabled" : "Unknown");
    if (loc?.refStation) parts.push(`Base ${loc.refStation}`);
    if (ref?.version) parts.push(`v${ref.version}`);
    lines.push(`NRTK:        ${parts.join(" · ")}`);
  }

  if (loc?.loraRssi != null || gps?.loraVersion) {
    const parts: string[] = [];
    if (loc?.loraRssi != null) parts.push(`${loc.loraRssi} dBm`);
    if (gps?.loraVersion) parts.push(gps.loraVersion);
    lines.push(`LoRa:        ${parts.join(" · ")}`);
  }

  const net = data.network;
  if (net) {
    const parts: string[] = [];
    const dbm = net.wifi_dbm;
    if (dbm != null) parts.push(`${dbm} dBm`);
    const ssid = str(net.ssid);
    if (ssid) parts.push(maskSsid(ssid));
    const ip = str(net.wifi_ip);
    if (ip) parts.push(ip);
    if (parts.length) lines.push(`WiFi:        ${parts.join(" · ")}`);
  }

  if (gps) {
    const parts: string[] = [];
    if (gps.version) parts.push(`v${gps.version}`);
    if (gps.hardwareVersion) parts.push(`HW r${gps.hardwareVersion}`);
    if (gps.sn) parts.push(`SN ${gps.sn}`);
    if (parts.length) lines.push(`GPS Module:  ${parts.join(" · ")}`);
  }

  const chassis = str(data.sensorInfo?.chassis_board_version);
  if (chassis) lines.push(`Chassis FW:  ${chassis}`);

  const cutterFw = str(data.sensorInfo?.cutter_board_version);
  if (cutterFw) lines.push(`Cutter FW:   ${cutterFw}`);

  {
    const taskState = str(data.task?.state);
    const taskType = str(data.task?.type);
    const parts: string[] = [];
    parts.push(taskState ? taskState.toUpperCase() : "Idle");
    if (taskType && taskState && taskState !== "idle") parts.push(taskType);
    lines.push(`Task:        ${parts.join(" · ")}`);
  }

  lines.push(`Timestamp:   ${new Date().toISOString()}`);

  return lines.join("\n");
}

export async function copyToClipboard(text: string): Promise<boolean> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch { /* fall through */ }
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}
