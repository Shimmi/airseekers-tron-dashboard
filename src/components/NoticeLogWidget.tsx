import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import type { NoticeEntry } from "../lib/parsers";
import { useLogPanel } from "../hooks/useLogPanel";
import { Chevron, useTargeted } from "./Card";

const LEVEL_CLASS: Record<string, string> = {
  info: "notice-line--info",
  warn: "notice-line--warn",
  error: "notice-line--error",
};

interface CollapsedNotice {
  entry: NoticeEntry;
  count: number;
}

function collapseRepeats(notices: NoticeEntry[]): CollapsedNotice[] {
  const result: CollapsedNotice[] = [];
  for (const entry of notices) {
    const prev = result[result.length - 1];
    if (prev && prev.entry.code === entry.code) {
      prev.count++;
      prev.entry = entry;
    } else {
      result.push({ entry, count: 1 });
    }
  }
  return result;
}

export function NoticeLogWidget({ notices, id }: { notices: NoticeEntry[]; id?: string }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [pinned, setPinned] = useState(true);
  const collapsedBaseline = useRef(0);
  const { ref: targetRef, targeted } = useTargeted(id);
  const { height, expanded, toggleExpanded, fullscreen, toggleFullscreen, resizeProps } = useLogPanel(id ?? "notice");

  if (!expanded) collapsedBaseline.current = notices.length;

  const collapsedUnseen = expanded ? 0 : notices.length - collapsedBaseline.current;
  const collapsedHasAlert =
    !expanded &&
    notices.slice(collapsedBaseline.current).some((n) => n.level !== "info");

  const collapsed = useMemo(() => collapseRepeats(notices), [notices]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 24;
    setPinned(atBottom);
  }, []);

  useEffect(() => {
    if (!expanded) return;
    const el = scrollRef.current;
    if (!el) return;
    if (pinned) el.scrollTop = el.scrollHeight;
  }, [notices, pinned, expanded]);

  useEffect(() => {
    if (expanded && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [expanded]);

  const jumpToBottom = () => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
    setPinned(true);
  };

  return (
    <div
      ref={targetRef}
      className={`card card--wide notice-card${targeted ? " card--targeted" : ""}${fullscreen ? " log-fullscreen" : ""}`}
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
          <h2 className="card-title">Event Log</h2>
          {notices.length > 0 && (
            <span className={`log-badge${collapsedHasAlert ? " log-badge--alert" : ""}`}>
              {expanded ? notices.length : collapsedUnseen || notices.length}
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
        <div className="notice-wrap">
          <div
            className="log-area notice-area"
            ref={scrollRef}
            onScroll={handleScroll}
            style={fullscreen ? undefined : { height }}
          >
            {notices.length === 0 && (
              <div className="notice-line notice-line--info">
                Waiting for events...
              </div>
            )}
            {collapsed.map((item, i) => (
              <div key={i} className={`notice-line ${LEVEL_CLASS[item.entry.level] ?? ""}`}>
                <span className="notice-time">[{item.entry.time}]</span>
                <span className={`notice-level notice-level--${item.entry.level}`}>
                  {item.entry.level === "error" ? "ERR" : item.entry.level === "warn" ? "WRN" : "INF"}
                </span>
                <span className="notice-module">{item.entry.module}</span>
                <span className="notice-msg">{item.entry.label}</span>
                {item.entry.repeat && (
                  <span
                    className="notice-count notice-count--repeat"
                    title={`Re-sent ${item.entry.repeat.count}× since ${item.entry.time}, last at ${item.entry.repeat.lastTime}. The mower re-broadcasts its latest notice about once a second, so this is likely one condition, not new events.`}
                  >
                    &#8635; {item.entry.repeat.lastTime}
                  </span>
                )}
                {item.count > 1 && (
                  <span className="notice-count">&times;{item.count}</span>
                )}
              </div>
            ))}
          </div>
          {!pinned && (
            <button className="notice-jump" onClick={jumpToBottom}>
              &#8595; Latest
            </button>
          )}
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
