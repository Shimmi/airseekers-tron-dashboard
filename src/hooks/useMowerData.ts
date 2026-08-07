import { useCallback, useEffect, useRef, useState } from "react";
import posthog from "posthog-js";
import { type ConnectionState, FoxgloveClient } from "../lib/foxglove";
import {
  type BatteryData,
  type BatteryHealthData,
  type GpsInfoData,
  type LocalizationData,
  type MowerStatusData,
  type NavSatFixData,
  type OccupancyGridData,
  type PolygonData,
  type RefInfoData,
  type RosLogEntry,
  type TaskData,
  mapBattery,
  mapBatteryHealth,
  mapGeoJsonTask,
  mapGpsInfo,
  mapLocalization,
  mapMowerStatus,
  mapNavSatFix,
  mapOccupancyGrid,
  mapPolygon,
  mapRefInfo,
  mapRosLog,
  mapStringJson,
  mapTask,
  mapHeadingFused,
} from "../lib/parsers";

export interface MowerData {
  battery: BatteryData | null;
  batteryHealth: BatteryHealthData | null;
  mowerStatus: MowerStatusData | null;
  localization: LocalizationData | null;
  gpsInfo: GpsInfoData | null;
  sensorInfo: Record<string, unknown> | null;
  config: Record<string, unknown> | null;
  task: TaskData | null;
  network: Record<string, unknown> | null;
  map: OccupancyGridData | null;
  boundary: PolygonData | null;
  refInfo: RefInfoData | null;
  geojsonTask: unknown | null;
  fix: NavSatFixData | null;
  fixFused: NavSatFixData | null;
  heading: number | null;
}

export interface LogEntry {
  time: string;
  msg: string;
  level: "info" | "ok" | "warn" | "error";
}

export type ServiceCallStatus =
  | { state: "idle" }
  | { state: "pending" }
  | { state: "ok" }
  | { state: "error"; message: string };

export function useMowerData() {
  const [connectionState, setConnectionState] =
    useState<ConnectionState>("disconnected");
  const [data, setData] = useState<MowerData>({
    battery: null,
    batteryHealth: null,
    mowerStatus: null,
    localization: null,
    gpsInfo: null,
    sensorInfo: null,
    config: null,
    task: null,
    network: null,
    map: null,
    boundary: null,
    refInfo: null,
    geojsonTask: null,
    fix: null,
    fixFused: null,
    heading: null,
  });
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [rosLogs, setRosLogs] = useState<RosLogEntry[]>([]);
  const [services, setServices] = useState<string[]>([]);
  const [stopStatus, setStopStatus] = useState<ServiceCallStatus>({ state: "idle" });
  const [clearEstopStatus, setClearEstopStatus] = useState<ServiceCallStatus>({ state: "idle" });
  const clientRef = useRef<FoxgloveClient | null>(null);
  const pendingCallIds = useRef<Map<number, "stop" | "clearEstop">>(new Map());
  const stopResetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearEstopResetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const addLog = useCallback(
    (msg: string, level: "info" | "ok" | "warn" | "error") => {
      setLogs((prev) => {
        const entry: LogEntry = {
          time: new Date().toLocaleTimeString(),
          msg,
          level,
        };
        const next = [...prev, entry];
        return next.length > 100 ? next.slice(-100) : next;
      });
    },
    [],
  );

  const mapLoggedRef = useRef(false);
  const boundaryLoggedRef = useRef<number | null>(null);
  const poseLoggedRef = useRef<boolean | null>(null);
  const geojsonTaskLoggedRef = useRef<boolean | null>(null);
  const fixLoggedRef = useRef<boolean | null>(null);
  const fixFusedLoggedRef = useRef<boolean | null>(null);

  const handleMessage = useCallback(
    (topic: string, msg: Record<string, unknown>) => {
      try {
        switch (topic) {
          case "/battery": {
            const battery = mapBattery(msg);
            setData((d) => ({ ...d, battery }));
            break;
          }
          case "/mower_base/battery_health": {
            const batteryHealth = mapBatteryHealth(msg);
            setData((d) => ({ ...d, batteryHealth }));
            break;
          }
          case "/heading_fused": {
            const heading = mapHeadingFused(msg);
            setData((d) => ({ ...d, heading }));
            break;
          }
          case "/mower_base/status": {
            const mowerStatus = mapMowerStatus(msg);
            setData((d) => ({ ...d, mowerStatus }));
            break;
          }
          case "/mower_localization_info": {
            const localization = mapLocalization(msg);
            setData((d) => ({ ...d, localization }));
            const hasPose = localization.pose !== null;
            if (poseLoggedRef.current !== hasPose) {
              poseLoggedRef.current = hasPose;
              addLog(
                hasPose
                  ? `Localization: fused_pose present (${localization.pose!.x.toFixed(2)}, ${localization.pose!.y.toFixed(2)})`
                  : `Localization: no fused_pose.position — raw fused_pose = ${JSON.stringify(msg.fused_pose)}`,
                hasPose ? "ok" : "warn",
              );
            }
            break;
          }
          case "/mower_gps_node/info": {
            const gpsInfo = mapGpsInfo(msg);
            if (gpsInfo) setData((d) => ({ ...d, gpsInfo }));
            break;
          }
          case "/mower_sensor_info": {
            setData((d) => ({ ...d, sensorInfo: msg }));
            break;
          }
          case "/robot_config": {
            const config = mapStringJson(msg);
            setData((d) => ({ ...d, config }));
            break;
          }
          case "/task_info": {
            const task = mapTask(msg);
            setData((d) => ({ ...d, task }));
            break;
          }
          case "/mower_base/net_status": {
            const network = mapStringJson(msg);
            setData((d) => ({ ...d, network }));
            break;
          }
          case "/mower_gps_node/ref_info": {
            const refInfo = mapRefInfo(msg);
            setData((d) => ({ ...d, refInfo }));
            break;
          }
          case "/map": {
            const map = mapOccupancyGrid(msg);
            if (map) {
              setData((d) => ({ ...d, map }));
              if (!mapLoggedRef.current) {
                mapLoggedRef.current = true;
                addLog(
                  `Map: ${map.width}x${map.height} cells @ ${map.resolution}m, origin (${map.originX.toFixed(2)}, ${map.originY.toFixed(2)})`,
                  "ok",
                );
              }
            } else if (!mapLoggedRef.current) {
              mapLoggedRef.current = true;
              addLog(
                `Map: message received but failed to parse — keys: ${Object.keys(msg).join(", ")}`,
                "warn",
              );
            }
            break;
          }
          case "/cover/polygon": {
            const boundary = mapPolygon(msg);
            setData((d) => ({ ...d, boundary }));
            if (boundaryLoggedRef.current !== boundary.points.length) {
              boundaryLoggedRef.current = boundary.points.length;
              addLog(`Boundary polygon: ${boundary.points.length} points`, "info");
            }
            break;
          }
          case "/geojson_task": {
            const geojsonTask = mapGeoJsonTask(msg);
            setData((d) => ({ ...d, geojsonTask }));
            const ok = geojsonTask !== null;
            if (geojsonTaskLoggedRef.current !== ok) {
              geojsonTaskLoggedRef.current = ok;
              addLog(
                ok
                  ? `geojson_task: parsed OK — ${JSON.stringify(geojsonTask).slice(0, 300)}`
                  : `geojson_task: failed to parse — keys: ${Object.keys(msg).join(", ")}`,
                ok ? "ok" : "warn",
              );
            }
            break;
          }
          case "/fix_fused": {
            const fixFused = mapNavSatFix(msg);
            setData((d) => ({ ...d, fixFused }));
            const hasFix = fixFused !== null;
            if (fixFusedLoggedRef.current !== hasFix) {
              fixFusedLoggedRef.current = hasFix;
              addLog(
                hasFix
                  ? `fix_fused: fix present (${fixFused!.lat.toFixed(7)}, ${fixFused!.lon.toFixed(7)})`
                  : "fix_fused: no fix yet",
                hasFix ? "ok" : "warn",
              );
            }
            break;
          }
          case "/fix": {
            const fix = mapNavSatFix(msg);
            setData((d) => ({ ...d, fix }));
            const hasFix = fix !== null;
            if (fixLoggedRef.current !== hasFix) {
              fixLoggedRef.current = hasFix;
              addLog(
                hasFix
                  ? `fix: fix present (${fix!.lat.toFixed(7)}, ${fix!.lon.toFixed(7)})`
                  : "fix: no fix yet",
                hasFix ? "ok" : "warn",
              );
            }
            break;
          }
          case "/rosout": {
            const entry = mapRosLog(msg);
            if (entry.level === "debug") break;
            setRosLogs((prev) => {
              const next = [...prev, entry];
              return next.length > 200 ? next.slice(-200) : next;
            });
            break;
          }
        }
      } catch (e) {
        console.error(`Parse error for ${topic}:`, e);
      }
    },
    [addLog],
  );

  const onServiceResult = useCallback(
    (callId: number, _name: string, ok: boolean, detail: string) => {
      const kind = pendingCallIds.current.get(callId);
      if (!kind) return;
      pendingCallIds.current.delete(callId);
      const result: ServiceCallStatus = ok
        ? { state: "ok" }
        : { state: "error", message: detail || "Unknown error" };
      if (kind === "stop") {
        posthog.capture("mower_stop_result", { success: ok });
        setStopStatus(result);
        if (stopResetTimer.current) clearTimeout(stopResetTimer.current);
        stopResetTimer.current = setTimeout(() => setStopStatus({ state: "idle" }), 5000);
      } else {
        posthog.capture("mower_estop_cleared_result", { success: ok });
        setClearEstopStatus(result);
        if (clearEstopResetTimer.current) clearTimeout(clearEstopResetTimer.current);
        clearEstopResetTimer.current = setTimeout(() => setClearEstopStatus({ state: "idle" }), 5000);
      }
    },
    [],
  );

  useEffect(() => {
    const client = new FoxgloveClient({
      onStateChange: setConnectionState,
      onMessage: handleMessage,
      onLog: addLog,
      onServicesAvailable: setServices,
      onServiceResult,
    });
    clientRef.current = client;
    return () => {
      client.disconnect();
      if (stopResetTimer.current) clearTimeout(stopResetTimer.current);
      if (clearEstopResetTimer.current) clearTimeout(clearEstopResetTimer.current);
    };
  }, [handleMessage, addLog, onServiceResult]);

  const connect = useCallback((url: string) => {
    clientRef.current?.connect(url);
  }, []);

  const disconnect = useCallback(() => {
    clientRef.current?.disconnect();
  }, []);

  const stop = useCallback(() => {
    const callId = clientRef.current?.callService("/controller/ctrl", { arg: "stop" });
    if (callId != null) {
      pendingCallIds.current.set(callId, "stop");
      posthog.capture("mower_stop_sent");
      setStopStatus({ state: "pending" });
    }
  }, []);

  const clearEstop = useCallback(() => {
    const callId = clientRef.current?.callService("/clear_estop", {});
    if (callId != null) {
      pendingCallIds.current.set(callId, "clearEstop");
      posthog.capture("mower_estop_cleared");
      setClearEstopStatus({ state: "pending" });
    }
  }, []);

  return {
    connectionState,
    data,
    logs,
    rosLogs,
    services,
    stopStatus,
    clearEstopStatus,
    connect,
    disconnect,
    stop,
    clearEstop,
  };
}
