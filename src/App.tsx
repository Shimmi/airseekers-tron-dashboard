import { useEffect, useRef } from "react";
import { useMowerData } from "./hooks/useMowerData";
import { usePage } from "./hooks/usePage";
import { Header } from "./components/Header";
import { ConnectScreen } from "./components/ConnectScreen";
import { Dashboard } from "./components/Dashboard";
import { CamerasPage } from "./components/CamerasPage";
import { WS_URL_KEY } from "./lib/constants";
import "./App.css";

export function App() {
  const { page, navigate } = usePage();
  const {
    connectionState,
    data,
    logs,
    rosLogs,
    notices,
    services,
    stopStatus,
    clearEstopStatus,
    cameraStatus,
    connect,
    disconnect,
    stop,
    clearEstop,
    startCamera,
    stopCamera,
    setDynamicTopics,
    setOverlayTopics,
    subscribeImage,
    unsubscribeImage,
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
      <Header
        connectionState={connectionState}
        onDisconnect={disconnect}
        page={page}
        onNavigate={navigate}
      />
      {showDashboard ? (
        page === "cameras" ? (
          <CamerasPage
            setDynamicTopics={setDynamicTopics}
            subscribeImage={subscribeImage}
            unsubscribeImage={unsubscribeImage}
            services={services}
            cameraStatus={cameraStatus}
            onStartCamera={startCamera}
            onStopCamera={stopCamera}
          />
        ) : (
          <Dashboard
            data={data}
            logs={logs}
            rosLogs={rosLogs}
            notices={notices}
            services={services}
            stopStatus={stopStatus}
            clearEstopStatus={clearEstopStatus}
            onStop={stop}
            onClearEstop={clearEstop}
            setOverlayTopics={setOverlayTopics}
          />
        )
      ) : (
        <ConnectScreen onConnect={connect} />
      )}
    </>
  );
}
