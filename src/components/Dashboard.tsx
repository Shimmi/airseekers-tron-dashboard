import type { ServiceCallStatus, MowerData, LogEntry } from "../hooks/useMowerData";
import type { RosLogEntry } from "../lib/parsers";
import { BatteryWidget } from "./BatteryWidget";
import { DeviceWidget } from "./DeviceWidget";
import { ControlWidget } from "./EmergencyWidget";
import { GpsWidget } from "./GpsWidget";
import { LogWidget } from "./LogWidget";
import { MapWidget } from "./MapWidget";
import { NetworkWidget } from "./NetworkWidget";
import { RosLogWidget } from "./RosLogWidget";
import { StatusStripWidget } from "./StatusStripWidget";
import { StatusWidget } from "./StatusWidget";
import { GITHUB_URL } from "../lib/constants";
import { TaskWidget } from "./TaskWidget";

export function Dashboard({
  data,
  logs,
  rosLogs,
  services,
  stopStatus,
  clearEstopStatus,
  onStop,
  onClearEstop,
}: {
  data: MowerData;
  logs: LogEntry[];
  rosLogs: RosLogEntry[];
  services: string[];
  stopStatus: ServiceCallStatus;
  clearEstopStatus: ServiceCallStatus;
  onStop: () => void;
  onClearEstop: () => void;
}) {
  const nrtkEnabled =
    data.gpsInfo?.nrtkEnabled ??
    (data.config?.EnableNRTK === "1"
      ? true
      : data.config?.EnableNRTK === "0"
        ? false
        : null);

  return (
    <main className="dashboard">
      <div className="dashboard-grid">
        <DeviceWidget
          gpsInfo={data.gpsInfo}
          sensorInfo={data.sensorInfo}
          config={data.config}
          network={data.network}
        />
        <StatusStripWidget
          battery={data.battery}
          network={data.network}
          localization={data.localization}
          mowerStatus={data.mowerStatus}
          nrtkEnabled={nrtkEnabled}
        />
        <BatteryWidget data={data.battery} id="widget-battery" />
        <GpsWidget
          localization={data.localization}
          gpsInfo={data.gpsInfo}
          nrtkEnabled={nrtkEnabled}
          id="widget-gps"
        />
        <StatusWidget data={data.mowerStatus} id="widget-mower-status" />
        <TaskWidget data={data.task} />
        <NetworkWidget data={data.network} id="widget-network" />
        <ControlWidget
          stopAvailable={services.includes("/controller/ctrl")}
          clearEstopAvailable={services.includes("/clear_estop")}
          stopStatus={stopStatus}
          clearEstopStatus={clearEstopStatus}
          onStop={onStop}
          onClearEstop={onClearEstop}
        />
        <MapWidget
          geojsonTask={data.geojsonTask}
          position={data.fixFused ?? data.fix}
        />
        <RosLogWidget logs={rosLogs} />
        <LogWidget logs={logs} />
      </div>
      <footer className="dashboard-footer">
        <span>Made with <span className="dashboard-footer-heart">♥</span> by <a href="https://github.com/Shimmi" target="_blank" rel="noopener noreferrer">Shimmi</a> in Czechia</span>
        <span className="dashboard-footer-links">
          <a href={`${GITHUB_URL}/issues`} target="_blank" rel="noopener noreferrer">Bug?</a>
          <span className="connect-links-sep">·</span>
          <a href={`${GITHUB_URL}/discussions`} target="_blank" rel="noopener noreferrer">Feedback</a>
          <span className="connect-links-sep">·</span>
          <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">GitHub</a>
        </span>
      </footer>
    </main>
  );
}
