import { useState, type FormEvent } from "react";
import posthog from "posthog-js";
import { GITHUB_URL, WS_URL_KEY } from "../lib/constants";

const DEFAULT_PROTOCOL = "ws://";
const DEFAULT_PORT = "8765";

function detectPnaBlock(): boolean {
  const isChromium = /Chrome\//.test(navigator.userAgent) && !/Firefox\//.test(navigator.userAgent);
  const isLocal = location.hostname === "localhost" || location.hostname === "127.0.0.1";
  return isChromium && !isLocal;
}

function parseStoredUrl(stored: string): { ip: string; full: string } {
  if (!stored) return { ip: "", full: "" };
  try {
    const match = stored.match(/^wss?:\/\/([^:/]+)/);
    return { ip: match?.[1] ?? "", full: stored };
  } catch {
    return { ip: "", full: stored };
  }
}

export function ConnectScreen({
  onConnect,
}: {
  onConnect: (url: string) => void;
}) {
  const stored = localStorage.getItem(WS_URL_KEY) || "";
  const parsed = parseStoredUrl(stored);

  const [ip, setIp] = useState(parsed.ip);
  const [advanced, setAdvanced] = useState(false);
  const [fullUrl, setFullUrl] = useState(parsed.full);
  const pnaBlocked = detectPnaBlock();

  const buildUrl = () => `${DEFAULT_PROTOCOL}${ip.trim()}:${DEFAULT_PORT}/`;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const url = advanced ? fullUrl.trim() : buildUrl();
    if (!url || (!advanced && !ip.trim())) return;
    localStorage.setItem(WS_URL_KEY, url);
    posthog.capture("mower_connected", { advanced_mode: advanced });
    onConnect(url);
  };

  const toggleAdvanced = () => {
    if (!advanced) {
      setFullUrl(ip.trim() ? buildUrl() : "");
    } else {
      const parsed = parseStoredUrl(fullUrl);
      setIp(parsed.ip);
    }
    posthog.capture("advanced_mode_toggled", { enabled: !advanced });
    setAdvanced(!advanced);
  };

  return (
    <div className="connect-screen">
      <div className="connect-card">
        <img className="connect-icon" src="/tron.png" alt="Airseekers Tron" />
        <h2 className="connect-title">Tron Dashboard</h2>
        <p className="connect-subtitle">
          Connect to your Airseekers Tron mower
        </p>

        {pnaBlocked && (
          <div className="connect-pna-warning">
            <strong>Chrome cannot connect to local devices</strong> from a hosted page.
            Use <strong>Firefox</strong>, or run the dashboard locally
            (<code>npm run serve</code>).
          </div>
        )}

        <form className="connect-form" onSubmit={handleSubmit}>
          <label className="connect-label" htmlFor={advanced ? "ws-full" : "ws-ip"}>
            {advanced ? "WebSocket URL" : "Mower IP address"}
          </label>

          {advanced ? (
            <input
              id="ws-full"
              className="connect-input"
              type="text"
              value={fullUrl}
              onChange={(e) => setFullUrl(e.target.value)}
              placeholder="ws://192.168.x.x:8765/"
              spellCheck={false}
              autoComplete="url"
            />
          ) : (
            <div className="connect-ip-row">
              <span className="connect-ip-affix">ws://</span>
              <input
                id="ws-ip"
                className="connect-input connect-ip-input"
                type="text"
                value={ip}
                onChange={(e) => setIp(e.target.value)}
                placeholder="192.168.x.x"
                spellCheck={false}
                autoComplete="off"
                inputMode="url"
              />
              <span className="connect-ip-affix">:8765</span>
            </div>
          )}

          <button className="connect-btn" type="submit" data-umami-event="connect">
            Connect
          </button>
        </form>

        <button className="connect-advanced-toggle" type="button" onClick={toggleAdvanced} data-umami-event="connect-advanced-toggle">
          {advanced ? "Simple mode" : "Advanced"}
        </button>

        <p className="connect-hint">
          Make sure you're on the same WiFi network as your mower
        </p>

        <div className="connect-links">
          <a href={`${GITHUB_URL}/issues`} target="_blank" rel="noopener noreferrer" data-umami-event="link-bugs">
            Report a bug
          </a>
          <span className="connect-links-sep">·</span>
          <a href={`${GITHUB_URL}/discussions`} target="_blank" rel="noopener noreferrer" data-umami-event="link-discussions">
            Discussions
          </a>
          <span className="connect-links-sep">·</span>
          <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" data-umami-event="link-github">
            GitHub
          </a>
        </div>
      </div>
    </div>
  );
}
