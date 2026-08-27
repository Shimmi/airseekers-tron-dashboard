import { useCallback, useEffect, useMemo, useState } from "react";
import type { ServiceCallStatus } from "../hooks/useMowerData";
import { CAMERAS } from "../lib/cameras";
import type { ImageMessage } from "../lib/foxglove";
import { CAMERA_CONFIG_KEY } from "../lib/constants";
import { CameraFeedWidget } from "./CameraFeedWidget";

const COLUMN_OPTIONS = [4, 3, 2, 1] as const;

interface CameraConfig {
  enabled: string[];
  columns?: number;
  colorize?: boolean;
}

function readConfig(): CameraConfig {
  try {
    const raw = localStorage.getItem(CAMERA_CONFIG_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { enabled: CAMERAS.filter((c) => !c.defaultOff).map((c) => c.key) };
}

function saveConfig(patch: Partial<CameraConfig>) {
  try {
    const all = readConfig();
    const merged = { ...all, ...patch };
    localStorage.setItem(CAMERA_CONFIG_KEY, JSON.stringify(merged));
  } catch { /* quota */ }
}

export function CamerasPage({
  setDynamicTopics,
  subscribeImage,
  unsubscribeImage,
  services,
  cameraStatus,
  onStartCamera,
  onStopCamera,
}: {
  setDynamicTopics: (topics: string[]) => void;
  subscribeImage: (topic: string, handler: (msg: ImageMessage) => void) => void;
  unsubscribeImage: (topic: string) => void;
  services: string[];
  cameraStatus: Record<string, ServiceCallStatus>;
  onStartCamera: (name: string) => void;
  onStopCamera: (name: string) => void;
}) {
  const initial = readConfig();
  const [enabledKeys, setEnabledKeys] = useState<Set<string>>(
    () => new Set(initial.enabled),
  );
  const [columns, setColumns] = useState(() => initial.columns ?? 3);
  const [colorize, setColorize] = useState(() => initial.colorize ?? true);

  const enabledTopics = useMemo(
    () => CAMERAS.filter((c) => enabledKeys.has(c.key)).map((c) => c.topic),
    [enabledKeys],
  );

  useEffect(() => {
    setDynamicTopics(enabledTopics);
    return () => {
      setDynamicTopics([]);
      for (const cam of CAMERAS) {
        if (cam.needsCapture && cam.serviceKey) onStopCamera(cam.serviceKey);
      }
    };
  }, [enabledTopics, setDynamicTopics, onStopCamera]);

  useEffect(() => {
    for (const cam of CAMERAS) {
      if (cam.needsCapture && cam.serviceKey && enabledKeys.has(cam.key)) {
        if (services.includes(`/${cam.serviceKey}/start_capture`)) {
          const status = cameraStatus[cam.serviceKey];
          if (!status || status.state === "idle") {
            onStartCamera(cam.serviceKey);
          }
        }
      }
    }
  }, [enabledKeys, services, cameraStatus, onStartCamera]);

  const toggleCamera = useCallback((key: string) => {
    setEnabledKeys((prev) => {
      const next = new Set(prev);
      const cam = CAMERAS.find((c) => c.key === key);
      if (next.has(key)) {
        next.delete(key);
        if (cam?.serviceKey) onStopCamera(cam.serviceKey);
      } else {
        next.add(key);
      }
      saveConfig({ enabled: [...next] });
      return next;
    });
  }, [onStopCamera]);

  const toggleAll = useCallback(() => {
    setEnabledKeys((prev) => {
      const allEnabled = CAMERAS.every((c) => prev.has(c.key));
      const next = allEnabled ? new Set<string>() : new Set(CAMERAS.map((c) => c.key));
      if (allEnabled) {
        for (const cam of CAMERAS) {
          if (cam.serviceKey) onStopCamera(cam.serviceKey);
        }
      }
      saveConfig({ enabled: [...next] });
      return next;
    });
  }, [onStopCamera]);

  const changeColumns = useCallback((n: number) => {
    setColumns(n);
    saveConfig({ columns: n });
  }, []);

  const toggleColorize = useCallback(() => {
    setColorize((prev) => {
      const next = !prev;
      saveConfig({ colorize: next });
      return next;
    });
  }, []);

  const enabledCameras = CAMERAS.filter((c) => enabledKeys.has(c.key));

  return (
    <main className="cameras-page">
      <div className="cameras-toolbar">
        <div className="cameras-toolbar-left">
          <span className="cameras-title">Cameras</span>
          <span className="cameras-count">
            {enabledCameras.length}/{CAMERAS.length}
          </span>
          <span className="cameras-grid-label">Grid</span>
          <div className="cameras-col-btns">
            {COLUMN_OPTIONS.map((n) => (
              <button
                key={n}
                className={`cameras-col-btn${columns === n ? " cameras-col-btn--active" : ""}`}
                onClick={() => changeColumns(n)}
                title={`${n} column${n > 1 ? "s" : ""}`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
        <div className="cameras-toolbar-right">
          {CAMERAS.map((cam) => (
            <button
              key={cam.key}
              className={`cameras-chip${enabledKeys.has(cam.key) ? " cameras-chip--active" : ""}`}
              onClick={() => toggleCamera(cam.key)}
              title={cam.description || cam.topic}
            >
              {cam.label}
            </button>
          ))}
          <button className="cameras-chip cameras-chip--toggle" onClick={toggleAll}>
            {CAMERAS.every((c) => enabledKeys.has(c.key)) ? "Hide All" : "Show All"}
          </button>
        </div>
      </div>
      {enabledCameras.length === 0 ? (
        <div className="cameras-empty">No cameras enabled</div>
      ) : (
        <div
          className="cameras-grid"
          style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
        >
          {enabledCameras.map((cam) => (
            <CameraFeedWidget
              key={cam.key}
              camera={cam}
              colorize={cam.colorize ? colorize : false}
              onToggleColorize={cam.colorize ? toggleColorize : undefined}
              subscribeImage={subscribeImage}
              unsubscribeImage={unsubscribeImage}
            />
          ))}
        </div>
      )}
    </main>
  );
}
