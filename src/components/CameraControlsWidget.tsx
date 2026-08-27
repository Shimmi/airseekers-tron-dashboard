import type { ServiceCallStatus } from "../hooks/useMowerData";
import { CAMERAS_NEEDING_CAPTURE } from "../lib/cameras";
import { Card } from "./Card";

export function CameraControlsWidget({
  services,
  cameraStatus,
  onStart,
  onStop,
  id,
}: {
  services: string[];
  cameraStatus: Record<string, ServiceCallStatus>;
  onStart: (name: string) => void;
  onStop: (name: string) => void;
  id?: string;
}) {
  return (
    <Card title="Camera Controls" id={id}>
      <div className="cam-ctrl-grid">
        {CAMERAS_NEEDING_CAPTURE.map(({ serviceKey, label }) => {
          const key = serviceKey!;
          const startAvail = services.includes(`/${key}/start_capture`);
          const stopAvail = services.includes(`/${key}/stop_capture`);
          const status = cameraStatus[key] ?? { state: "idle" };
          const pending = status.state === "pending";
          const ok = status.state === "ok";
          const error = status.state === "error";

          return (
            <div key={key} className="cam-ctrl-row">
              <span className="cam-ctrl-label">{label}</span>
              <div className="cam-ctrl-btns">
                <button
                  className={`cam-btn cam-btn--start ${ok ? "cam-btn--ok" : ""}`}
                  onClick={() => onStart(key)}
                  disabled={!startAvail || pending}
                  title={error ? (status as { state: "error"; message: string }).message : undefined}
                >
                  {pending ? "..." : ok ? "✓" : "▶"}
                </button>
                <button
                  className="cam-btn cam-btn--stop"
                  onClick={() => onStop(key)}
                  disabled={!stopAvail || pending}
                >
                  {"■"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
