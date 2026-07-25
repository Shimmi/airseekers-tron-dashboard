import { useCallback, useState } from "react";
import type { ConnectionState } from "../lib/foxglove";

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
}: {
  connectionState: ConnectionState;
  onDisconnect: () => void;
}) {
  const [theme, setTheme] = useState(
    () => document.documentElement.getAttribute("data-theme") || "dark",
  );

  const toggleTheme = useCallback(() => {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("tron-theme", next);
    setTheme(next);
  }, [theme]);

  return (
    <header className="header">
      <div className="header-left">
        <h1 className="header-title">Tron</h1>
      </div>

      <div className="header-right">
        {connectionState !== "disconnected" && (
          <div className="header-status">
            <div className={DOT_CLASS[connectionState]} />
            <span className="header-status-label">
              {LABEL[connectionState]}
            </span>
            <button className="header-disconnect" onClick={onDisconnect}>
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
