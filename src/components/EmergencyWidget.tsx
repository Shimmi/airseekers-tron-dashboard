import type { ServiceCallStatus } from "../hooks/useMowerData";
import { Card } from "./Card";

export function ControlWidget({
  stopAvailable,
  clearEstopAvailable,
  stopStatus,
  clearEstopStatus,
  onStop,
  onClearEstop,
}: {
  stopAvailable: boolean;
  clearEstopAvailable: boolean;
  stopStatus: ServiceCallStatus;
  clearEstopStatus: ServiceCallStatus;
  onStop: () => void;
  onClearEstop: () => void;
}) {
  return (
    <Card title="Mower Control">
      <div className="ctrl-stack">
        <ActionButton
          label="STOP"
          confirmLabel="STOPPED"
          variant="danger"
          status={stopStatus}
          available={stopAvailable}
          onClick={onStop}
        />
        <ActionButton
          label="CLEAR E-STOP"
          confirmLabel="E-STOP CLEARED"
          variant="warn"
          status={clearEstopStatus}
          available={clearEstopAvailable}
          onClick={onClearEstop}
        />
      </div>
    </Card>
  );
}

function ActionButton({
  label,
  confirmLabel,
  variant,
  status,
  available,
  onClick,
}: {
  label: string;
  confirmLabel: string;
  variant: "danger" | "warn";
  status: ServiceCallStatus;
  available: boolean;
  onClick: () => void;
}) {
  const isPending = status.state === "pending";
  const isOk = status.state === "ok";
  const isError = status.state === "error";

  const text = isPending ? "Sending…" : isOk ? confirmLabel : label;

  return (
    <button
      className={`ctrl-btn ctrl-btn--${variant} ctrl-btn--${status.state}`}
      onClick={onClick}
      disabled={!available || isPending}
      title={isError ? status.message : undefined}
    >
      <span className="ctrl-btn-label">{text}</span>
      {isOk && <span className="ctrl-btn-check" />}
      {isError && <span className="ctrl-btn-error">!</span>}
    </button>
  );
}
