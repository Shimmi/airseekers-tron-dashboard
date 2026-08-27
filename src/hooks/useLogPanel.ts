import { useCallback, useEffect, useRef, useState } from "react";
import { WIDGET_CONFIG_KEY } from "../lib/constants";

interface WidgetConfig {
  height?: number;
  expanded?: boolean;
}

function readAll(): Record<string, WidgetConfig> {
  try {
    return JSON.parse(localStorage.getItem(WIDGET_CONFIG_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function save(id: string, patch: Partial<WidgetConfig>) {
  try {
    const all = readAll();
    all[id] = { ...all[id], ...patch };
    localStorage.setItem(WIDGET_CONFIG_KEY, JSON.stringify(all));
  } catch { /* quota or private mode */ }
}

export function useLogPanel(widgetId: string, defaultHeight = 260) {
  const saved = useRef(readAll()[widgetId]);
  const [height, setHeight] = useState(saved.current?.height ?? defaultHeight);
  const [expanded, setExpanded] = useState(saved.current?.expanded ?? false);
  const [fullscreen, setFullscreen] = useState(false);
  const dragging = useRef(false);
  const startY = useRef(0);
  const startH = useRef(0);

  const toggleExpanded = useCallback(() => {
    setExpanded((prev) => {
      const next = !prev;
      save(widgetId, { expanded: next });
      return next;
    });
  }, [widgetId]);

  const toggleFullscreen = useCallback(() => setFullscreen((f) => !f), []);

  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFullscreen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fullscreen]);

  const persistHeight = useCallback((h: number) => {
    setHeight(h);
    save(widgetId, { height: h });
  }, [widgetId]);

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    startY.current = e.clientY;
    startH.current = height;
    dragging.current = true;
  }, [height]);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    const delta = e.clientY - startY.current;
    const next = Math.max(48, Math.min(startH.current + delta, window.innerHeight * 0.8));
    setHeight(next);
  }, []);

  const onPointerUp = useCallback(() => {
    if (!dragging.current) return;
    dragging.current = false;
    persistHeight(height);
  }, [height, persistHeight]);

  return {
    height,
    expanded,
    toggleExpanded,
    fullscreen,
    toggleFullscreen,
    resizeProps: { onPointerDown, onPointerMove, onPointerUp },
  };
}
