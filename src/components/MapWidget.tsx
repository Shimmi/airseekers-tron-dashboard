import type { NavSatFixData } from "../lib/parsers";
import { MapView } from "./MapView";

export function MapWidget({
  geojsonTask,
  position,
  heading,
}: {
  geojsonTask: unknown | null;
  position: NavSatFixData | null;
  heading: number | null;
}) {
  // No Card wrapper here: the map fills the whole widget edge-to-edge (no title,
  // no padding), so we render a bare card shell and let MapView own the space.
  return (
    <div className="card card--wide map-card">
      {geojsonTask || position ? (
        <MapView geojsonTask={geojsonTask} position={position} heading={heading} />
      ) : (
        <div className="map-empty">Waiting for map data…</div>
      )}
    </div>
  );
}
