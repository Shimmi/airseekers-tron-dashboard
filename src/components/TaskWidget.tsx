import { Badge, Card, MetricRow } from "./Card";

const STATE_VARIANT: Record<string, "green" | "yellow" | "blue" | "gray"> = {
  running: "green",
  paused: "yellow",
  finished: "blue",
  idle: "gray",
};

export function TaskWidget({ data }: { data: Record<string, unknown> | null }) {
  const state = (data?.state as string) || "";
  const isIdle = !data || state === "" || state === "idle";

  if (isIdle) {
    return (
      <Card title="Task">
        <div className="task-idle">No active task</div>
      </Card>
    );
  }

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
      <MetricRow label="Type" value={(data?.type as string) || "--"} />
      <MetricRow label="Run Time" value={(data?.runTime as string) || "--"} />
      <MetricRow
        label="Area (total)"
        value={
          data?.topArea != null
            ? `${(data.topArea as number).toFixed(1)} m²`
            : "--"
        }
      />
      <MetricRow
        label="Remaining"
        value={
          data?.remainingArea != null
            ? `${(data.remainingArea as number).toFixed(1)} m²`
            : "--"
        }
      />
    </Card>
  );
}
