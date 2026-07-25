import { useState } from "react";
import type { MowerStatusData } from "../lib/parsers";
import { Badge, Card } from "./Card";

const STATE_VARIANT: Record<string, "green" | "yellow" | "red" | "blue" | "gray"> = {
  MOWING: "green",
  MOVING: "blue",
  CHARGING: "yellow",
  DOCKED: "blue",
  STOPPED: "red",
  IDLE: "gray",
};

// Only these represent an actual safety condition; everything else in
// MowerStatusData.triggers is routine activity/config state.
const SAFETY_KEYS = new Set([
  "stop_triggered",
  "bumper_triggered",
  "left_bumper_triggered",
  "right_bumper_triggered",
  "rain_triggered",
  "lift_triggered",
]);

const TRIGGER_GROUPS: { label: string; items: [key: string, label: string][] }[] = [
  {
    label: "Activity",
    items: [
      ["is_cutting", "Cutting"],
      ["is_moving", "Moving"],
      ["is_cmd_moving", "Cmd Moving"],
      ["is_charging", "Charging"],
    ],
  },
  {
    label: "Bumper",
    items: [
      ["left_bumper_triggered", "Left"],
      ["bumper_triggered", "Center"],
      ["right_bumper_triggered", "Right"],
      ["bumper_routing_enabled", "Routing Enabled"],
      ["bumper_routing", "Routing Active"],
    ],
  },
  {
    label: "Safety",
    items: [
      ["stop_triggered", "E-Stop"],
      ["rain_triggered", "Rain"],
      ["lift_triggered", "Lifted"],
    ],
  },
  {
    label: "Other",
    items: [
      ["battery_gate_open", "Battery Gate Open"],
      ["press_module", "Press Module"],
    ],
  },
];

function FilterIcon({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="14"
      height="14"
      fill={active ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 5h16l-6 7v5l-4 2v-7z" />
    </svg>
  );
}

export function StatusWidget({ data, id }: { data: MowerStatusData | null; id?: string }) {
  const [showAll, setShowAll] = useState(true);
  const activeCount = data
    ? Object.values(data.triggers).filter(Boolean).length
    : 0;

  return (
    <Card title="Mower Status" id={id}>
      <div className="status-header">
        <Badge variant={data ? STATE_VARIANT[data.state] || "gray" : "gray"}>
          {data?.state ?? "--"}
        </Badge>
        {data && (
          <button
            className={`triggers-toggle${showAll ? "" : " triggers-toggle--active"}`}
            onClick={() => setShowAll((s) => !s)}
            title={showAll ? "Show only active triggers" : "Show all triggers"}
            aria-pressed={!showAll}
          >
            <FilterIcon active={!showAll} />
          </button>
        )}
      </div>

      {data && (
        activeCount === 0 && !showAll ? (
          <div className="triggers-clear">No triggers active</div>
        ) : (
          <div className="trigger-groups">
            {TRIGGER_GROUPS.map((group) => {
              const items = showAll
                ? group.items
                : group.items.filter(([key]) => data.triggers[key]);
              if (items.length === 0) return null;
              return (
                <div className="trigger-group" key={group.label}>
                  <div className="trigger-group-label">{group.label}</div>
                  <div className="trigger-group-items">
                    {items.map(([key, label]) => {
                      const active = Boolean(data.triggers[key]);
                      return (
                        <span
                          key={key}
                          className={`trigger-chip${active ? " trigger-chip--active" : ""}${active && SAFETY_KEYS.has(key) ? " trigger-chip--alert" : ""}`}
                        >
                          <span className="trigger-chip-dot" />
                          {label}
                        </span>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}
    </Card>
  );
}
