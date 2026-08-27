import { useEffect, useRef } from "react";
import type { LogEntry } from "../hooks/useMowerData";
import { useLogPanel } from "../hooks/useLogPanel";
import { Chevron, useTargeted } from "./Card";

export function LogWidget({ logs, id }: { logs: LogEntry[]; id?: string }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const collapsedBaseline = useRef(0);
  const { ref: targetRef, targeted } = useTargeted(id);
  const { height, expanded, toggleExpanded, fullscreen, toggleFullscreen, resizeProps } = useLogPanel(id ?? "log", 180);

  if (!expanded) collapsedBaseline.current = logs.length;

  const collapsedUnseen = expanded ? 0 : logs.length - collapsedBaseline.current;
  const collapsedHasAlert =
    !expanded &&
    logs.slice(collapsedBaseline.current).some((e) => e.level === "error");

  useEffect(() => {
    if (expanded && scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [logs, expanded]);

  return (
    <div
      ref={targetRef}
      className={`card card--wide${targeted ? " card--targeted" : ""}${fullscreen ? " log-fullscreen" : ""}`}
      id={id}
    >
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
          {expanded && (
            <button
              className="log-fullscreen-btn"
              onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }}
              title={fullscreen ? "Exit fullscreen" : "Fullscreen"}
            >
              <FullscreenIcon active={fullscreen} />
            </button>
          )}
          {!expanded && <span className="expand-hint">more</span>}
          <Chevron expanded={expanded} />
        </div>
      </div>
      {expanded && (
        <div className="log-wrap">
          <div
            className="log-area"
            ref={scrollRef}
            style={fullscreen ? undefined : { height }}
          >
            {logs.map((entry, i) => (
              <div key={i} className={`log-line log-line--${entry.level}`}>
                [{entry.time}] {entry.msg}
              </div>
            ))}
          </div>
          {!fullscreen && <div className="log-resize-handle" {...resizeProps} />}
        </div>
      )}
    </div>
  );
}

function FullscreenIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {active ? (
        <>
          <path d="M4 14h6v6" /><path d="M14 10h6V4" />
          <path d="M20 4l-6 6" /><path d="M4 20l6-6" />
        </>
      ) : (
        <>
          <path d="M15 3h6v6" /><path d="M9 21H3v-6" />
          <path d="M21 3l-7 7" /><path d="M3 21l7-7" />
        </>
      )}
    </svg>
  );
}
