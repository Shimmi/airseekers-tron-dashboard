import { useEffect, useRef } from "react";
import { useMowerData } from "./hooks/useMowerData";
import { Header } from "./components/Header";
import { ConnectScreen } from "./components/ConnectScreen";
import { Dashboard } from "./components/Dashboard";
import { WS_URL_KEY } from "./lib/constants";
import "./App.css";

export function App() {
  const {
    connectionState,
    data,
    logs,
    rosLogs,
    services,
    stopStatus,
    clearEstopStatus,
    connect,
    disconnect,
    stop,
    clearEstop,
  } = useMowerData();

  const autoConnected = useRef(false);

  useEffect(() => {
    if (autoConnected.current) return;
    const saved = localStorage.getItem(WS_URL_KEY);
    if (saved) {
      autoConnected.current = true;
      connect(saved);
    }
  }, [connect]);

  const showDashboard = connectionState !== "disconnected";

  return (
    <>
      <Header connectionState={connectionState} onDisconnect={disconnect} />
      {showDashboard ? (
        <Dashboard
          data={data}
          logs={logs}
          rosLogs={rosLogs}
          services={services}
          stopStatus={stopStatus}
          clearEstopStatus={clearEstopStatus}
          onStop={stop}
          onClearEstop={clearEstop}
        />
      ) : (
        <ConnectScreen onConnect={connect} />
      )}
    </>
  );
}
