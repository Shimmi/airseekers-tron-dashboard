import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";

let glowSeq = 0;

export function updateHash(hash: string) {
  glowSeq++;
  history.replaceState(null, "", hash || location.pathname + location.search);
  window.dispatchEvent(new HashChangeEvent("hashchange"));
}

let globalListenerActive = false;
function ensureGlobalClickListener() {
  if (globalListenerActive) return;
  globalListenerActive = true;
  document.addEventListener("click", (e) => {
    if (!location.hash.startsWith("#widget-")) return;
    if ((e.target as Element).closest?.(".card")) return;
    updateHash("");
  });
}

export function useTargeted(id: string | undefined) {
  const [targeted, setTargeted] = useState(() => !!id && location.hash === `#${id}`);
  const ref = useRef<HTMLDivElement>(null);
  const lastSeq = useRef(glowSeq);

  useEffect(() => {
    if (!id) return;
    ensureGlobalClickListener();
    const check = () => {
      const match = location.hash === `#${id}`;
      setTargeted(match);
      if (match && ref.current && glowSeq !== lastSeq.current) {
        lastSeq.current = glowSeq;
        const el = ref.current;
        el.classList.remove("card--targeted");
        void el.offsetWidth;
        el.classList.add("card--targeted");
      }
    };
    window.addEventListener("hashchange", check);
    return () => window.removeEventListener("hashchange", check);
  }, [id]);

  const handleClick = useCallback(() => {
    if (!id) return;
    updateHash(`#${id}`);
  }, [id]);

  return { ref, targeted, handleClick };
}

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
  const { ref: cardRef, targeted, handleClick } = useTargeted(id);

  return (
    <div
      ref={cardRef}
      className={`card ${className}${targeted ? " card--targeted" : ""}`}
      id={id}
      onClick={id ? handleClick : undefined}
    >
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
