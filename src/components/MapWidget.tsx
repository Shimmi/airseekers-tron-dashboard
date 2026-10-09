import type { WalkPoint } from "../lib/localApi";
import type { CoverageImageData, NavSatFixData, OccupancyGridData, PathData } from "../lib/parsers";
import { MapView } from "./MapView";

export function MapWidget({
  geojsonTask,
  position,
  heading,
  planningPath,
  coverageImage,
  occupancyGrid,
  walkPath,
  walkPathError,
  setOverlayTopics,
  setWalkPathEnabled,
  id,
}: {
  geojsonTask: unknown | null;
  position: NavSatFixData | null;
  heading: number | null;
  planningPath: PathData | null;
  coverageImage: CoverageImageData | null;
  occupancyGrid: OccupancyGridData | null;
  walkPath: WalkPoint[] | null;
  walkPathError: string | null;
  setOverlayTopics: (topics: string[]) => void;
  setWalkPathEnabled: (enabled: boolean) => void;
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
          walkPath={walkPath}
          walkPathError={walkPathError}
          setOverlayTopics={setOverlayTopics}
          setWalkPathEnabled={setWalkPathEnabled}
        />
      ) : (
        <div className="map-empty">Waiting for map data…</div>
      )}
    </div>
  );
}
