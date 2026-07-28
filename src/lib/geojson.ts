import area from "@turf/area";

export const ZONE_TYPE = {
  MOWING: 1,
  NO_GO: 2,
  CHANNEL: 3,
  DOCK_APPROACH: 4,
  DOCK_STATION: 5,
  CHARGE_POINT: 6,
  UNDOCK_POINT: 7,
  NRTK_REF: 8,
  OBSTACLE: 9,
} as const;

export const AREA_TYPES = new Set<number>([ZONE_TYPE.MOWING, ZONE_TYPE.NO_GO]);

export function formatArea(m2: number): string {
  if (m2 < 10) return `${m2.toFixed(1)} m²`;
  return `${Math.round(m2)} m²`;
}

export interface ZoneInfo {
  id: string;
  name: string;
  grossArea: number;
  netArea: number;
}

export function resolveTaskZones(
  geojsonTask: unknown,
  areaIds: string[],
): ZoneInfo[] {
  const fc = geojsonTask as GeoJSON.FeatureCollection | null;
  if (!fc?.features || areaIds.length === 0) return [];

  const idSet = new Set(areaIds);
  const zones: ZoneInfo[] = [];

  for (const feature of fc.features) {
    const props = feature.properties ?? {};
    if (Number(props.type) !== ZONE_TYPE.MOWING) continue;
    if (!idSet.has(String(props.id))) continue;

    const grossArea = feature.geometry ? area(feature.geometry as GeoJSON.Geometry) : 0;

    let childArea = 0;
    for (const child of fc.features) {
      const cp = child.properties ?? {};
      const ct = Number(cp.type);
      if (
        String(cp.parent_id) === String(props.id) &&
        (ct === ZONE_TYPE.NO_GO || ct === ZONE_TYPE.OBSTACLE) &&
        child.geometry
      ) {
        childArea += area(child.geometry as GeoJSON.Geometry);
      }
    }

    zones.push({
      id: String(props.id),
      name: typeof props.name === "string" ? props.name : "",
      grossArea,
      netArea: Math.max(0, grossArea - childArea),
    });
  }

  return zones;
}
