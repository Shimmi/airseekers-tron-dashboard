import { useEffect, useMemo, useRef } from "react";
import { Badge, Card, MetricRow } from "./Card";
import type { TaskData } from "../lib/parsers";
import { resolveTaskZones, formatArea, type ZoneInfo } from "../lib/geojson";

const STATE_VARIANT: Record<string, "green" | "yellow" | "blue" | "gray"> = {
  running: "green",
  paused: "yellow",
  finished: "blue",
  idle: "gray",
};

function ZoneRow({ zone, params }: {
  zone: ZoneInfo;
  params: { cutterHeight: number; cutSpeed: number; zigzagDis: number; numPerimeters: number };
}) {
  const details = [
    `${params.cutterHeight} mm`,
    `speed ${params.cutSpeed}`,
    `${(params.zigzagDis * 100).toFixed(0)} cm spacing`,
    `${params.numPerimeters}x edge`,
  ].join(" · ");

  return (
    <div className="task-zone">
      <div className="task-zone-header">
        <span className="task-zone-name">{zone.name || "Unnamed zone"}</span>
        <span className="task-zone-area">{formatArea(zone.netArea)}</span>
      </div>
      <div className="task-zone-params">{details}</div>
    </div>
  );
}

function ProgressBar({ fraction }: { fraction: number }) {
  const pct = Math.max(0, Math.min(100, fraction * 100));
  return (
    <div className="task-progress">
      <div className="task-progress-bar">
        <div className="task-progress-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="task-progress-label">{Math.round(pct)}%</span>
    </div>
  );
}

export function TaskWidget({ data, geojsonTask }: {
  data: TaskData | null;
  geojsonTask: unknown;
}) {
  const state = data?.state || "";
  const isIdle = !data || state === "" || state === "idle";

  const areaIds = useMemo(
    () => (data?.params ?? []).map((p) => p.areaId).filter(Boolean),
    [data?.params],
  );

  const zones = useMemo(
    () => resolveTaskZones(geojsonTask, areaIds),
    [geojsonTask, areaIds],
  );

  const totalSelectedArea = useMemo(
    () => zones.reduce((sum, z) => sum + z.netArea, 0),
    [zones],
  );

  const joinWarnedRef = useRef(false);
  useEffect(() => {
    if (geojsonTask != null && areaIds.length > 0 && zones.length === 0) {
      if (!joinWarnedRef.current) {
        joinWarnedRef.current = true;
        console.warn(
          "[TaskWidget] Zone join produced 0 results — areaIds from task_info did not match any MOWING feature ids in geojson_task.",
          { areaIds },
        );
      }
    } else {
      joinWarnedRef.current = false;
    }
  }, [geojsonTask, areaIds, zones]);

  if (isIdle) {
    return (
      <Card title="Task">
        <div className="task-idle">No active task</div>
      </Card>
    );
  }

  const isMowing = data!.type === "mowing";
  const mowed = data!.mowed;
  const progress = mowed != null && totalSelectedArea > 0
    ? mowed / totalSelectedArea
    : null;

  return (
    <Card title="Task">
      <MetricRow
        label="State"
        value={
          <Badge variant={STATE_VARIANT[state] || "gray"}>
            {state.toUpperCase()}
          </Badge>
        }
      />
      <MetricRow label="Type" value={data!.type || "--"} />
      <MetricRow label="Run Time" value={data!.runTime || "--"} />

      {isMowing && zones.length > 0 && (
        <div className="task-zones">
          {zones.map((zone) => {
            const params = data!.params.find((p) => p.areaId === zone.id);
            return params ? <ZoneRow key={zone.id} zone={zone} params={params} /> : null;
          })}
        </div>
      )}

      {isMowing && (
        <>
          <MetricRow
            label="Mowed"
            value={
              mowed != null
                ? `${formatArea(mowed)}${totalSelectedArea > 0 ? ` of ~${formatArea(totalSelectedArea)}` : ""}`
                : "--"
            }
          />
          {progress != null && <ProgressBar fraction={progress} />}
        </>
      )}
    </Card>
  );
}
