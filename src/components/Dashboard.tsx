import { useMemo } from "react";
import type { ServiceCallStatus, MowerData, LogEntry } from "../hooks/useMowerData";
import type { NoticeEntry, RosLogEntry } from "../lib/parsers";
import { BatteryWidget } from "./BatteryWidget";
import { DeviceWidget } from "./DeviceWidget";
import { ControlWidget } from "./EmergencyWidget";
import { GpsWidget } from "./GpsWidget";
import { LogWidget } from "./LogWidget";
import { MapWidget } from "./MapWidget";
import { MotorsWidget } from "./MotorsWidget";
import { NetworkWidget } from "./NetworkWidget";
import { NoticeLogWidget } from "./NoticeLogWidget";
import { RosLogWidget } from "./RosLogWidget";
import { StatusStripWidget } from "./StatusStripWidget";
import { StatusWidget } from "./StatusWidget";
import { GITHUB_URL } from "../lib/constants";
import { TaskWidget } from "./TaskWidget";
import { buildDebugInfo } from "../lib/debugInfo";

export function Dashboard({
  data,
  logs,
  rosLogs,
  notices,
  services,
  stopStatus,
  clearEstopStatus,
  onStop,
  onClearEstop,
  setOverlayTopics,
  setWalkPathEnabled,
  walkPathError,
}: {
  data: MowerData;
  logs: LogEntry[];
  rosLogs: RosLogEntry[];
  notices: NoticeEntry[];
  services: string[];
  stopStatus: ServiceCallStatus;
  clearEstopStatus: ServiceCallStatus;
  onStop: () => void;
  onClearEstop: () => void;
  setOverlayTopics: (topics: string[]) => void;
  setWalkPathEnabled: (enabled: boolean) => void;
  walkPathError: string | null;
}) {
  const nrtkEnabled =
    data.gpsInfo?.nrtkEnabled ??
    (data.config?.EnableNRTK === "1"
      ? true
      : data.config?.EnableNRTK === "0"
        ? false
        : null);

  const nrtkNetMode = data.config?.NRTKNetMode as string | undefined ?? null;

  const debugText = useMemo(
    () => buildDebugInfo(data, nrtkEnabled),
    [data, nrtkEnabled],
  );

  return (
    <main className="dashboard">
      <div className="dashboard-grid">
        <DeviceWidget
          gpsInfo={data.gpsInfo}
          sensorInfo={data.sensorInfo}
          config={data.config}
          network={data.network}
          bmsVersion={data.devBaseInfo?.bmsVersion ?? null}
          debugText={debugText}
        />
        <StatusStripWidget
          battery={data.battery}
          network={data.network}
          localization={data.localization}
          mowerStatus={data.mowerStatus}
          nrtkEnabled={nrtkEnabled}
        />
        <BatteryWidget
          data={data.battery}
          batteryHealth={data.batteryHealth}
          sensorBatteryTemp={data.sensorInfo?.battery_temperature != null ? Number(data.sensorInfo.battery_temperature) : null}
          id="widget-battery"
        />
        <GpsWidget
          localization={data.localization}
          gpsInfo={data.gpsInfo}
          refInfo={data.refInfo}
          nrtkEnabled={nrtkEnabled}
          nrtkNetMode={nrtkNetMode}
          id="widget-gps"
        />
        <StatusWidget
          data={data.mowerStatus}
          rainSensorValue={data.sensorInfo?.rain_sensor_value != null ? Number(data.sensorInfo.rain_sensor_value) : null}
          robotMode={data.robotMode}
          alarms={data.alarms}
          id="widget-mower-status"
        />
        <TaskWidget data={data.task} geojsonTask={data.geojsonTask} planner={data.plannerInfo} id="widget-task" />
        <MotorsWidget
          data={data.motors}
          cutterHeight={data.task?.params[0]?.cutterHeight ?? null}
          id="widget-motors"
        />
        <NetworkWidget data={data.network} id="widget-network" />
        <ControlWidget
          stopAvailable={services.includes("/controller/ctrl")}
          clearEstopAvailable={services.includes("/clear_estop")}
          stopStatus={stopStatus}
          clearEstopStatus={clearEstopStatus}
          onStop={onStop}
          onClearEstop={onClearEstop}
          id="widget-control"
        />
        <MapWidget
          geojsonTask={data.geojsonTask}
          position={data.fixFused ?? data.fix}
          heading={data.heading ?? data.localization?.pose?.yaw ?? null}
          planningPath={data.planningPath}
          coverageImage={data.coverageImage}
          occupancyGrid={data.map}
          walkPath={data.walkPath}
          walkPathError={walkPathError}
          setOverlayTopics={setOverlayTopics}
          setWalkPathEnabled={setWalkPathEnabled}
          id="widget-map"
        />
        <NoticeLogWidget notices={notices} id="widget-notices" />
        <RosLogWidget logs={rosLogs} id="widget-roslog" />
        <LogWidget logs={logs} id="widget-log" />
      </div>
      <footer className="dashboard-footer">
        <span>Made with <span className="dashboard-footer-heart">♥</span> by <a href="https://github.com/Shimmi" target="_blank" rel="noopener noreferrer">Shimmi</a> in Czechia</span>
        <span className="dashboard-footer-version">v{__APP_VERSION__}</span>
        <span className="dashboard-footer-links">
          <a href={`${GITHUB_URL}/issues`} target="_blank" rel="noopener noreferrer" data-umami-event="footer-bugs">Bug?</a>
          <span className="connect-links-sep">·</span>
          <a href={`${GITHUB_URL}/discussions`} target="_blank" rel="noopener noreferrer" data-umami-event="footer-feedback">Feedback</a>
          <span className="connect-links-sep">·</span>
          <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" data-umami-event="footer-github">GitHub</a>
          <span className="connect-links-sep">·</span>
          <span className="dashboard-footer-version dashboard-footer-version--mobile">v{__APP_VERSION__}</span>
        </span>
      </footer>
    </main>
  );
}
