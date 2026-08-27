import type { NavSatFixData } from "../lib/parsers";
import { MapView } from "./MapView";

export function MapWidget({
  geojsonTask,
  position,
  heading,
  id,
}: {
  geojsonTask: unknown | null;
  position: NavSatFixData | null;
  heading: number | null;
  id?: string;
}) {
  return (
    <div className="card card--wide map-card" id={id}>
      {geojsonTask || position ? (
        <MapView geojsonTask={geojsonTask} position={position} heading={heading} />
      ) : (
        <div className="map-empty">Waiting for map data…</div>
      )}
    </div>
  );
}
