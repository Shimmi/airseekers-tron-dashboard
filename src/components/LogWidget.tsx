import { useCallback, useEffect, useRef, useState } from "react";
import type { LogEntry } from "../hooks/useMowerData";
import { Chevron } from "./Card";

export function LogWidget({ logs }: { logs: LogEntry[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const hasBeenOpened = useRef(false);
  const collapsedBaseline = useRef(0);

  if (!hasBeenOpened.current) collapsedBaseline.current = logs.length;

  const collapsedUnseen = expanded ? 0 : logs.length - collapsedBaseline.current;
  const collapsedHasAlert =
    !expanded &&
    logs.slice(collapsedBaseline.current).some((e) => e.level === "error");

  const toggleExpanded = useCallback(() => {
    hasBeenOpened.current = true;
    collapsedBaseline.current = logs.length;
    setExpanded((prev) => !prev);
  }, [logs.length]);

  useEffect(() => {
    if (expanded && ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [logs, expanded]);

  return (
    <div className="card card--wide">
      <div
        className={`expandable-header${expanded ? "" : " expandable-header--collapsed"}`}
        onClick={toggleExpanded}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            toggleExpanded();
          }
        }}
      >
        <div className="expandable-header-title">
          <h2 className="card-title">Connection Log</h2>
          {logs.length > 0 && (
            <span className={`log-badge${collapsedHasAlert ? " log-badge--alert" : ""}`}>
              {expanded ? logs.length : collapsedUnseen || logs.length}
            </span>
          )}
        </div>
        <div className="expandable-header-extra">
          {!expanded && <span className="expand-hint">more</span>}
          <Chevron expanded={expanded} />
        </div>
      </div>
      {expanded && (
        <div className="log-area" ref={ref}>
          {logs.map((entry, i) => (
            <div key={i} className={`log-line log-line--${entry.level}`}>
              [{entry.time}] {entry.msg}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
