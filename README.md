# Tron Dashboard

Real-time telemetry dashboard for the Airseekers Tron robotic mower.
Connects directly to the mower's Foxglove WebSocket bridge — no cloud, no account, no official app needed.

## Stack

- **Vite + React + TypeScript**
- **PWA** — installable on Android/desktop via "Add to Home Screen"
- **Foxglove WebSocket v1** protocol with schema-based ROS message deserialization (`@foxglove/rosmsg` + `@foxglove/rosmsg-serialization`)
- Dark/light theme, auto-connect to last known IP

## Widgets

| Widget | Data source (ROS topic) |
|--------|------------------------|
| Battery | `/battery` — voltage, percentage, current, charge status (SVG ring gauge) |
| GPS / RTK | `/mower_localization_info`, `/mower_gps_node/info` — satellites, RTK fix, LoRa RSSI, NRTK |
| Mower Status | `/mower_base/status` — state (mowing/docked/charging/stopped), trigger flags |
| Task | `/task_info` — state, type, run time, area, remaining |
| Network | `/mower_base/net_status` — WiFi SSID/IP/signal, 4G IP, SIM |
| Emergency Stop | `/controller/ctrl` service call |
| Connection Log | Internal — WebSocket events and diagnostics |

## Getting started

```bash
npm install
npm run dev        # dev server with HMR
npm run build      # production build
npm run serve      # build + serve on LAN (port 8080)
```

## Hosting & network constraints

The app connects to the mower's local WebSocket (`ws://192.168.x.x:8765/`).
You must be on the **same WiFi network** as the mower.

**Chrome's Private Network Access** policy blocks public-origin web pages from
connecting to private IPs. This means hosting on Surge/Vercel/GitHub Pages
won't work in Chrome or Chromium-based browsers. It does work in **Firefox**.

For Chrome, serve the app from a local/private origin:

```bash
npm run serve      # serves on http://0.0.0.0:8080
```

Then access from any device on the same network via `http://<your-pc-ip>:8080`.
