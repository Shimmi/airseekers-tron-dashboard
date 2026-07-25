import type { ReactNode } from "react";

export function Card({
  title,
  children,
  className = "",
  id,
  hideTitle = false,
}: {
  title: string;
  children: ReactNode;
  className?: string;
  id?: string;
  hideTitle?: boolean;
}) {
  return (
    <div className={`card ${className}`} id={id}>
      {!hideTitle && <h2 className="card-title">{title}</h2>}
      {children}
    </div>
  );
}

export function MetricRow({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="metric-row">
      <span className="metric-label">{label}</span>
      <span className="metric-value">{value}</span>
    </div>
  );
}

/** Shared right-pointing chevron, rotated 90deg to point down when expanded.
 * Used by every collapsible widget header so they all share one visual language. */
export function Chevron({ expanded }: { expanded?: boolean }) {
  return (
    <svg
      className={`chevron-icon${expanded ? " chevron-icon--open" : ""}`}
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

export function Badge({
  children,
  variant = "gray",
}: {
  children: ReactNode;
  variant?: "green" | "yellow" | "red" | "blue" | "gray";
}) {
  return <span className={`badge badge--${variant}`}>{children}</span>;
}
