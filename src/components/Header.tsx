import { useCallback, useState } from "react";
import posthog from "posthog-js";
import type { ConnectionState } from "../lib/foxglove";
import type { Page } from "../hooks/usePage";

const DOT_CLASS: Record<ConnectionState, string> = {
  disconnected: "header-dot",
  connecting: "header-dot header-dot--connecting",
  connected: "header-dot header-dot--connected",
};

const LABEL: Record<ConnectionState, string> = {
  disconnected: "Disconnected",
  connecting: "Connecting...",
  connected: "Connected",
};

export function Header({
  connectionState,
  onDisconnect,
  page,
  onNavigate,
}: {
  connectionState: ConnectionState;
  onDisconnect: () => void;
  page: Page;
  onNavigate: (target: Page) => void;
}) {
  const [theme, setTheme] = useState(
    () => document.documentElement.getAttribute("data-theme") || "dark",
  );

  const toggleTheme = useCallback(() => {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("tron-theme", next);
    posthog.capture("theme_toggled", { theme: next });
    setTheme(next);
  }, [theme]);

  const connected = connectionState !== "disconnected";

  return (
    <header className="header">
      <div className="header-left">
        <h1 className="header-title">Tron</h1>
        {connected && (
          <nav className="header-nav">
            <button
              className={`header-nav-link${page === "dashboard" ? " header-nav-link--active" : ""}`}
              onClick={() => onNavigate("dashboard")}
              data-umami-event="nav-dashboard"
            >
              Dashboard
            </button>
            <button
              className={`header-nav-link${page === "cameras" ? " header-nav-link--active" : ""}`}
              onClick={() => onNavigate("cameras")}
              data-umami-event="nav-cameras"
            >
              Cameras
            </button>
          </nav>
        )}
      </div>

      <div className="header-right">
        {connected && (
          <div className="header-status">
            <div className={DOT_CLASS[connectionState]} />
            <span className="header-status-label">
              {LABEL[connectionState]}
            </span>
            <button
              className="header-disconnect"
              onClick={() => {
                posthog.capture("mower_disconnected");
                onDisconnect();
              }}
            >
              Disconnect
            </button>
          </div>
        )}
        <button
          className="header-theme-btn"
          onClick={toggleTheme}
          title="Toggle theme"
        >
          {theme === "dark" ? "☀️" : "🌙"}
        </button>
      </div>
    </header>
  );
}
