import type { CoverageImageData, NavSatFixData, OccupancyGridData, PathData } from "../lib/parsers";
import { MapView } from "./MapView";

export function MapWidget({
  geojsonTask,
  position,
  heading,
  planningPath,
  coverageImage,
  occupancyGrid,
  setOverlayTopics,
  id,
}: {
  geojsonTask: unknown | null;
  position: NavSatFixData | null;
  heading: number | null;
  planningPath: PathData | null;
  coverageImage: CoverageImageData | null;
  occupancyGrid: OccupancyGridData | null;
  setOverlayTopics: (topics: string[]) => void;
  id?: string;
}) {
  return (
    <div className="card card--wide map-card" id={id}>
      {geojsonTask || position ? (
        <MapView
          geojsonTask={geojsonTask}
          position={position}
          heading={heading}
          planningPath={planningPath}
          coverageImage={coverageImage}
          occupancyGrid={occupancyGrid}
          setOverlayTopics={setOverlayTopics}
        />
      ) : (
        <div className="map-empty">Waiting for map data…</div>
      )}
    </div>
  );
}
