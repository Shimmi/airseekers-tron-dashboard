const HEALTH_NAMES = [
  "UNKNOWN", "GOOD", "OVERHEAT", "DEAD", "OVERVOLTAGE", "UNSPEC_FAILURE", "COLD", "WATCHDOG", "SAFETY_TIMER",
] as const;

export type BatteryHealth = (typeof HEALTH_NAMES)[number];

export interface BatteryData {
  voltage: number;
  percentage: number;
  current: number;
  status: "UNKNOWN" | "CHARGING" | "DISCHARGING" | "NOT_CHARGING" | "FULL";
  health: BatteryHealth;
}

const BATTERY_STATUS_NAMES = [
  "UNKNOWN", "CHARGING", "DISCHARGING", "NOT_CHARGING", "FULL",
] as const;

function fin(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function mapBattery(msg: Record<string, unknown>): BatteryData {
  const voltage = fin(msg.voltage);
  const current = fin(msg.current);
  const raw = fin(msg.percentage);
  const statusIdx = fin(msg.power_supply_status);
  const healthIdx = fin(msg.power_supply_health);

  return {
    voltage: parseFloat((voltage / 10).toFixed(1)),
    percentage: Math.round(raw * 100),
    current: parseFloat((current / 10).toFixed(1)),
    status: BATTERY_STATUS_NAMES[statusIdx] || "UNKNOWN",
    health: HEALTH_NAMES[healthIdx] || "UNKNOWN",
  };
}

export interface BatteryHealthData {
  temperature: number | null;
  error: string;
}

export function mapBatteryHealth(msg: Record<string, unknown>): BatteryHealthData {
  const temp = fin(msg.battery_temperature);
  const rawError = msg.battery_error;
  const error = typeof rawError === "bigint" ? String(rawError) : String(fin(rawError));
  return {
    temperature: temp > 0 ? temp : null,
    error,
  };
}

export interface MowerStatusData {
  state: string;
  triggers: Record<string, boolean>;
}

export function mapMowerStatus(msg: Record<string, unknown>): MowerStatusData {
  const bool = (key: string) => Boolean(msg[key]);

  const is_cutting = bool("is_cutting");
  const is_moving = bool("is_moving");
  const is_charging = bool("is_charging");
  const is_docking_done = bool("is_docking_done");
  const stop_triggered = bool("stop_triggered");

  let state = "IDLE";
  if (is_cutting) state = "MOWING";
  else if (is_moving) state = "MOVING";
  else if (is_charging) state = "CHARGING";
  else if (is_docking_done) state = "DOCKED";
  if (stop_triggered) state = "STOPPED";

  const triggers: Record<string, boolean> = {};
  for (const key of [
    "is_cutting", "is_moving", "is_cmd_moving", "is_charging",
    "bumper_routing_enabled", "battery_gate_open", "press_module",
    "stop_triggered", "bumper_triggered", "left_bumper_triggered",
    "right_bumper_triggered", "rain_triggered", "lift_triggered",
  ]) {
    triggers[key] = bool(key);
  }
  const brs = Number(msg.bumper_routing_status ?? 0);
  triggers.bumper_routing = brs > 0;

  return { state, triggers };
}

export interface LocalizationData {
  rtkStatus: string;
  refStation: string;
  satellites: number | null;
  loraRssi: number | null;
  pose: { x: number; y: number; yaw: number } | null;
  locState: number | null;
  fusionError: number | null;
  motionStatus: number | null;
}

export function mapLocalization(msg: Record<string, unknown>): LocalizationData {
  const rtkStatus = String(msg.rtk_status ?? "--");
  const refStation = String(msg.ref_station_status ?? "--");
  const satellites = msg.num_satellites != null ? Number(msg.num_satellites) : null;
  const loraRssi = msg.lora_rssi_dbm != null ? Number(msg.lora_rssi_dbm) : null;
  const locState = msg.loc_state != null ? Number(msg.loc_state) : null;
  const fusionError = msg.fusion_error != null ? Number(msg.fusion_error) : null;
  const motionStatus = msg.motion_status != null ? Number(msg.motion_status) : null;

  const fusedPose = msg.fused_pose as Record<string, unknown> | undefined;
  const poseStamped = fusedPose?.pose as Record<string, unknown> | undefined;
  const position = poseStamped?.position as Record<string, unknown> | undefined;
  let pose: LocalizationData["pose"] = null;
  if (position) {
    const orientation = poseStamped?.orientation as Record<string, unknown> | undefined;
    const qx = Number(orientation?.x ?? 0);
    const qy = Number(orientation?.y ?? 0);
    const qz = Number(orientation?.z ?? 0);
    const qw = Number(orientation?.w ?? 1);
    const yaw = Math.atan2(2 * (qw * qz + qx * qy), 1 - 2 * (qy * qy + qz * qz));
    pose = { x: Number(position.x ?? 0), y: Number(position.y ?? 0), yaw };
  }

  return { rtkStatus, refStation, satellites, loraRssi, pose, locState, fusionError, motionStatus };
}

export interface OccupancyGridData {
  width: number;
  height: number;
  resolution: number;
  originX: number;
  originY: number;
  data: Int8Array;
}

export function mapOccupancyGrid(
  msg: Record<string, unknown>,
): OccupancyGridData | null {
  const info = msg.info as Record<string, unknown> | undefined;
  const width = Number(info?.width ?? 0);
  const height = Number(info?.height ?? 0);
  const resolution = Number(info?.resolution ?? 0);
  if (!width || !height || !resolution) return null;

  const origin = info?.origin as Record<string, unknown> | undefined;
  const position = origin?.position as Record<string, unknown> | undefined;
  const raw = msg.data;
  const data =
    raw instanceof Int8Array ? raw : new Int8Array((raw as ArrayLike<number>) ?? []);
  if (data.length < width * height) return null;

  return {
    width,
    height,
    resolution,
    originX: Number(position?.x ?? 0),
    originY: Number(position?.y ?? 0),
    data,
  };
}

export interface PolygonData {
  points: { x: number; y: number }[];
}

export function mapPolygon(msg: Record<string, unknown>): PolygonData {
  const rawPoints = (msg.points as Array<Record<string, unknown>> | undefined) ?? [];
  return {
    points: rawPoints.map((p) => ({ x: Number(p.x ?? 0), y: Number(p.y ?? 0) })),
  };
}

export interface GpsInfoData {
  quality: number;
  snr: number;
  satellitesTracked: number | null;
  nrtkEnabled: boolean | null;
  sn: string;
  version: string;
  hardwareVersion: string;
  loraVersion: string;
}

export function mapGpsInfo(msg: Record<string, unknown>): GpsInfoData | null {
  const q = msg.quality as Record<string, unknown> | undefined;
  const quality = Number(q?.quality ?? 0);
  const snr = Number(q?.snr ?? 0);
  const rawTracked = q?.num_satellites_tracked;
  const satellitesTracked = rawTracked != null ? Number(rawTracked) : null;

  let nrtkEnabled: boolean | null = null;
  if (msg.nrtk_enable !== undefined) nrtkEnabled = Boolean(msg.nrtk_enable);

  return {
    quality,
    snr,
    satellitesTracked,
    nrtkEnabled,
    sn: String(msg.sn ?? ""),
    version: String(msg.version ?? ""),
    hardwareVersion: String(msg.hardware_version ?? ""),
    loraVersion: String(msg.lora_version ?? ""),
  };
}

export interface RefInfoData {
  version: string;
  runTime: number;
  online: boolean;
}

export function mapRefInfo(msg: Record<string, unknown>): RefInfoData {
  const version = String(msg.version ?? "");
  const runTime = Number(msg.run_time ?? 0);
  const online = version !== "" || runTime > 0;
  return { version, runTime, online };
}

export interface RosLogEntry {
  time: string;
  level: "debug" | "info" | "warn" | "error" | "fatal";
  node: string;
  msg: string;
}

const ROS_LOG_LEVELS: Record<number, RosLogEntry["level"]> = {
  1: "debug",
  2: "info",
  4: "warn",
  8: "error",
  16: "fatal",
};

export function mapRosLog(msg: Record<string, unknown>): RosLogEntry {
  const levelByte = Number(msg.level ?? 2);
  const level = ROS_LOG_LEVELS[levelByte] ?? "info";
  const node = String(msg.name ?? "");
  const header = msg.header as Record<string, unknown> | undefined;
  const stamp = header?.stamp as Record<string, unknown> | undefined;
  let time: string;
  if (stamp) {
    const secs = Number(stamp.secs ?? stamp.sec ?? 0);
    const d = new Date(secs * 1000);
    time = d.toLocaleTimeString();
  } else {
    time = new Date().toLocaleTimeString();
  }
  return { time, level, node, msg: String(msg.msg ?? "") };
}

export function mapStringJson(msg: Record<string, unknown>): Record<string, unknown> {
  const raw = String(msg.data ?? "");
  try {
    return JSON.parse(raw);
  } catch {
    return { raw };
  }
}

// ── Task ──

export interface TaskZoneParams {
  areaId: string;
  cutterHeight: number;
  cutSpeed: number;
  zigzagDis: number;
  numPerimeters: number;
}

export interface TaskData {
  state: string;
  type: string;
  runTime: string;
  topArea: number | null;
  remainingArea: number | null;
  mowed: number | null;
  params: TaskZoneParams[];
}

const MIN_RUNTIME_SECONDS = 30;

function parseRunTimeSeconds(rt: string): number {
  const parts = rt.split(":").map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return 0;
  return parts[0] * 3600 + parts[1] * 60 + parts[2];
}

export function mapTask(msg: Record<string, unknown>): TaskData {
  const raw = mapStringJson(msg);
  const state = String(raw.state ?? "");
  const type = String(raw.type ?? "");
  const runTime = String(raw.runTime ?? "");
  const topArea = raw.topArea != null ? Number(raw.topArea) : null;
  const remainingArea = raw.remainingArea != null ? Number(raw.remainingArea) : null;

  let mowed: number | null = null;
  if (topArea != null && remainingArea != null) {
    const diff = topArea - remainingArea;
    const runtimeOk = parseRunTimeSeconds(runTime) >= MIN_RUNTIME_SECONDS;
    const valuesOk = remainingArea <= topArea && diff >= 0;
    mowed = runtimeOk && valuesOk ? diff : null;
  }

  const rawParams = Array.isArray(raw.params) ? raw.params : [];
  const params: TaskZoneParams[] = rawParams.map((p: Record<string, unknown>) => ({
    areaId: String(p.areaId ?? ""),
    cutterHeight: Number(p.cutterHeight ?? 0),
    cutSpeed: Number(p.cutSpeed ?? 0),
    zigzagDis: Number(p.zigzagDis ?? 0),
    numPerimeters: Number(p.numPerimeters ?? 0),
  }));

  return { state, type, runTime, topArea, remainingArea, mowed, params };
}

export interface NavSatFixData {
  lat: number;
  lon: number;
  alt: number;
}

/**
 * sensor_msgs/NavSatFix. status.status is int8: -1 = STATUS_NO_FIX, 0+ = has
 * a fix. Returns null when there's no fix yet, since 0/0 would otherwise
 * look like a (very wrong) valid anchor point.
 */
export function mapNavSatFix(msg: Record<string, unknown>): NavSatFixData | null {
  const status = msg.status as Record<string, unknown> | undefined;
  const statusCode = Number(status?.status ?? -1);
  if (statusCode < 0) return null;

  const lat = Number(msg.latitude ?? 0);
  const lon = Number(msg.longitude ?? 0);
  if (lat === 0 && lon === 0) return null;

  return { lat, lon, alt: Number(msg.altitude ?? 0) };
}

/**
 * foxglove_msgs/GeoJSON carries a single `geojson` string field with the raw
 * GeoJSON text — already in real-world lat/lng, no local-frame transform
 * needed. Returns the parsed object as-is for Leaflet's L.geoJSON to consume.
 */
export function mapGeoJsonTask(msg: Record<string, unknown>): unknown | null {
  const text = msg.geojson;
  if (typeof text !== "string") return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
