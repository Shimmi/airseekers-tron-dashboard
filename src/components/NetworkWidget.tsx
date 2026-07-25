import { Card, MetricRow } from "./Card";
import { healthVar, rssiColor } from "../lib/status";

export function NetworkWidget({
  data,
  id,
}: {
  data: Record<string, unknown> | null;
  id?: string;
}) {
  const wifiDbm = data?.wifi_dbm != null ? Number(data.wifi_dbm) : null;

  return (
    <Card title="Network" id={id}>
      <MetricRow label="WiFi SSID" value={(data?.ssid as string) || "--"} />
      <MetricRow label="WiFi IP" value={(data?.wifi_ip as string) || "--"} />
      <MetricRow
        label="WiFi Signal"
        value={
          wifiDbm != null ? (
            <span style={{ color: healthVar(rssiColor(wifiDbm)) }}>
              {wifiDbm} dBm
            </span>
          ) : (
            "--"
          )
        }
      />
      <MetricRow label="4G IP" value={(data?.["4g_ip"] as string) || "--"} />
      <MetricRow
        label="SIM Active"
        value={data ? (data.sim_active ? "Yes" : "No") : "--"}
      />
    </Card>
  );
}
