/**
 * Local "map" frame ↔ WGS84 coordinate transform.
 *
 * The mower's ROS map frame is a 2-D Cartesian grid whose x-axis points at an
 * arbitrary geographic bearing (determined when the yard was mapped). This
 * module converts between that frame and WGS84 lat/lon using the dock geometry
 * from /geojson_task (charge→undock bearing gives the x-axis direction).
 */

const R_EARTH = 6378137;
const DEG = Math.PI / 180;

export interface TransformParams {
  anchorLat: number;
  anchorLon: number;
  anchorX: number;
  anchorY: number;
  theta: number;
}

export function mapToWgs84(
  x: number,
  y: number,
  p: TransformParams,
): { lat: number; lon: number } {
  const dx = x - p.anchorX;
  const dy = y - p.anchorY;
  const cosT = Math.cos(p.theta);
  const sinT = Math.sin(p.theta);
  const east = dx * cosT - dy * sinT;
  const north = dx * sinT + dy * cosT;
  const lat = p.anchorLat + (north / R_EARTH) / DEG;
  const lon =
    p.anchorLon + (east / (R_EARTH * Math.cos(p.anchorLat * DEG))) / DEG;
  return { lat, lon };
}

export function gridCornersToWgs84(
  originX: number,
  originY: number,
  width: number,
  height: number,
  resolution: number,
  p: TransformParams,
): [[number, number], [number, number], [number, number], [number, number]] {
  const w = width * resolution;
  const h = height * resolution;
  const bl = mapToWgs84(originX, originY, p);
  const br = mapToWgs84(originX + w, originY, p);
  const tr = mapToWgs84(originX + w, originY + h, p);
  const tl = mapToWgs84(originX, originY + h, p);
  // Mapbox ImageSource wants: top-left, top-right, bottom-right, bottom-left
  return [
    [tl.lon, tl.lat],
    [tr.lon, tr.lat],
    [br.lon, br.lat],
    [bl.lon, bl.lat],
  ];
}

/**
 * Derive the initial transform from the dock geometry in /geojson_task.
 *
 * The dock (charge_point) sits at local ≈ (0, 0). The dock bearing
 * (charge → undock) gives the geographic direction of the local x-axis:
 *
 *   theta = (90 - dockBearingDeg) * π/180   (convert CW-from-North to CCW-from-East)
 *
 * Verified by Procrustes fit on a sampled localization↔GPS pair (θ ≈ 140.9°,
 * matching 90 - (-50.9°) = 140.9° to within 0.5°).
 */
export function transformFromDock(
  chargeLat: number,
  chargeLon: number,
  dockBearingDeg: number,
): TransformParams {
  const theta = (90 - dockBearingDeg) * DEG;
  return {
    anchorLat: chargeLat,
    anchorLon: chargeLon,
    anchorX: 0,
    anchorY: 0,
    theta,
  };
}
