import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RosLogEntry } from "../lib/parsers";
import { Chevron } from "./Card";

type LevelFilter = "all" | "warn" | "error";

interface CollapsedEntry {
  entry: RosLogEntry;
  count: number;
}

function collapseRepeats(logs: RosLogEntry[]): CollapsedEntry[] {
  const result: CollapsedEntry[] = [];
  for (const entry of logs) {
    const prev = result[result.length - 1];
    if (prev && prev.entry.node === entry.node && prev.entry.msg === entry.msg) {
      prev.count++;
      prev.entry = entry;
    } else {
      result.push({ entry, count: 1 });
    }
  }
  return result;
}

const LEVEL_SEVERITY: Record<string, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  fatal: 4,
};

export function RosLogWidget({ logs }: { logs: RosLogEntry[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [pinned, setPinned] = useState(true);
  const [filter, setFilter] = useState<LevelFilter>("all");
  const unseenRef = useRef(0);
  const [unseen, setUnseen] = useState(0);
  const hasBeenOpened = useRef(false);
  const collapsedBaseline = useRef(0);

  if (!hasBeenOpened.current) collapsedBaseline.current = logs.length;

  const collapsedUnseen = expanded ? 0 : logs.length - collapsedBaseline.current;
  const collapsedHasAlert =
    !expanded &&
    logs
      .slice(collapsedBaseline.current)
      .some((e) => LEVEL_SEVERITY[e.level] >= LEVEL_SEVERITY.warn);

  const toggleExpanded = useCallback(() => {
    hasBeenOpened.current = true;
    collapsedBaseline.current = logs.length;
    setExpanded((prev) => !prev);
  }, [logs.length]);

  const filtered = useMemo(() => {
    const minLevel = filter === "error" ? 3 : filter === "warn" ? 2 : 0;
    const entries = minLevel > 0
      ? logs.filter((e) => LEVEL_SEVERITY[e.level] >= minLevel)
      : logs;
    return collapseRepeats(entries);
  }, [logs, filter]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 24;
    setPinned(atBottom);
    if (atBottom) {
      unseenRef.current = 0;
      setUnseen(0);
    }
  }, []);

  useEffect(() => {
    if (!expanded) return;
    const el = scrollRef.current;
    if (!el) return;
    if (pinned) {
      el.scrollTop = el.scrollHeight;
      unseenRef.current = 0;
      setUnseen(0);
    } else {
      unseenRef.current++;
      setUnseen(unseenRef.current);
    }
  }, [logs, pinned, expanded]);

  useEffect(() => {
    if (expanded && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [expanded]);

  const jumpToBottom = () => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
    setPinned(true);
    unseenRef.current = 0;
    setUnseen(0);
  };

  return (
    <div className="card card--wide roslog-card">
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
          <h2 className="card-title">System Log</h2>
          {logs.length > 0 && (
            <span className={`log-badge${collapsedHasAlert ? " log-badge--alert" : ""}`}>
              {expanded ? logs.length : collapsedUnseen || logs.length}
            </span>
          )}
        </div>
        <div className="expandable-header-extra">
          {expanded ? (
            <div className="roslog-filters" onClick={(e) => e.stopPropagation()}>
              {(["all", "warn", "error"] as const).map((level) => (
                <button
                  key={level}
                  className={`roslog-pill${filter === level ? " roslog-pill--active" : ""}${level === "error" ? " roslog-pill--error" : level === "warn" ? " roslog-pill--warn" : ""}`}
                  onClick={() => setFilter(level)}
                >
                  {level.toUpperCase()}
                </button>
              ))}
            </div>
          ) : (
            <span className="expand-hint">more</span>
          )}
          <Chevron expanded={expanded} />
        </div>
      </div>
      {expanded && (
        <div className="roslog-wrap">
          <div className="log-area roslog-area" ref={scrollRef} onScroll={handleScroll}>
            {filtered.length === 0 && (
              <div className="log-line log-line--info">
                {logs.length === 0
                  ? "Waiting for /rosout messages..."
                  : "No messages match this filter."}
              </div>
            )}
            {filtered.map((item, i) => (
              <div key={i} className={`log-line log-line--${item.entry.level}`}>
                <span className="roslog-time">[{item.entry.time}]</span>
                <span className={`roslog-level roslog-level--${item.entry.level}`}>
                  {item.entry.level.toUpperCase()}
                </span>
                <span className="roslog-node">{item.entry.node}</span>
                <span className="roslog-msg">{item.entry.msg}</span>
                {item.count > 1 && (
                  <span className="roslog-count">&times;{item.count}</span>
                )}
              </div>
            ))}
          </div>
          {!pinned && (
            <button className="roslog-jump" onClick={jumpToBottom}>
              &#8595; Latest{unseen > 0 ? ` (${unseen})` : ""}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
