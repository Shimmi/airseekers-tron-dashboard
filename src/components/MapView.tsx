import { useCallback, useEffect, useRef, useState } from "react";
import Map, {
  Layer,
  Marker,
  NavigationControl,
  Popup,
  Source,
  type LayerProps,
  type MapRef,
} from "react-map-gl/mapbox";
import type { MapLayerMouseEvent } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import area from "@turf/area";
import type { NavSatFixData } from "../lib/parsers";
import { ZONE_TYPE, AREA_TYPES, formatArea } from "../lib/geojson";

const TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;

const STYLES = {
  outdoors: "mapbox://styles/mapbox/outdoors-v12",
  satellite: "mapbox://styles/mapbox/satellite-streets-v12",
} as const;
type StyleKey = keyof typeof STYLES;

const TYPE = ZONE_TYPE;

// Literal hex (mapbox paint expressions can't read CSS vars), aligned with the
// app theme palette.
const COLOR = {
  mowing: "#3dd68c",
  noGo: "#f05252",
  obstacle: "#f09a52",
  channel: "#4f8ff7",
  dockApproach: "#22d3ee",
  dockStation: "#8b90a0",
  charge: "#f0c246",
  undock: "#a855f7",
  nrtk: "#4f8ff7",
} as const;

const TYPE_LABEL: Record<number, string> = {
  [TYPE.MOWING]: "Mowing zone",
  [TYPE.NO_GO]: "No-go zone",
  [TYPE.CHANNEL]: "Channel",
  [TYPE.DOCK_APPROACH]: "Dock approach",
  [TYPE.DOCK_STATION]: "Dock station",
  [TYPE.CHARGE_POINT]: "Charge point",
  [TYPE.UNDOCK_POINT]: "Undock point",
  [TYPE.NRTK_REF]: "NRTK reference",
  [TYPE.OBSTACLE]: "Obstacle",
};

// ── Layers, ordered bottom → top. Mowing fill sits under everything else. ──

const mowingFill: LayerProps = {
  id: "mowing-fill",
  type: "fill",
  filter: ["==", ["get", "type"], TYPE.MOWING],
  paint: { "fill-color": COLOR.mowing, "fill-opacity": 0.22 },
};

const mowingOutline: LayerProps = {
  id: "mowing-outline",
  type: "line",
  filter: ["==", ["get", "type"], TYPE.MOWING],
  paint: { "line-color": COLOR.mowing, "line-width": 2 },
};

const otherPolyFill: LayerProps = {
  id: "poly-fill",
  type: "fill",
  filter: ["in", ["get", "type"], ["literal", [TYPE.NO_GO, TYPE.DOCK_APPROACH, TYPE.DOCK_STATION, TYPE.OBSTACLE]]],
  paint: {
    "fill-color": [
      "match",
      ["get", "type"],
      TYPE.NO_GO, COLOR.noGo,
      TYPE.OBSTACLE, COLOR.obstacle,
      TYPE.DOCK_APPROACH, COLOR.dockApproach,
      TYPE.DOCK_STATION, COLOR.dockStation,
      "#888888",
    ],
    "fill-opacity": 0.3,
  },
};

const otherPolyOutline: LayerProps = {
  id: "poly-outline",
  type: "line",
  filter: ["in", ["get", "type"], ["literal", [TYPE.NO_GO, TYPE.DOCK_APPROACH, TYPE.DOCK_STATION, TYPE.OBSTACLE]]],
  paint: {
    "line-color": [
      "match",
      ["get", "type"],
      TYPE.NO_GO, COLOR.noGo,
      TYPE.OBSTACLE, COLOR.obstacle,
      TYPE.DOCK_APPROACH, COLOR.dockApproach,
      TYPE.DOCK_STATION, COLOR.dockStation,
      "#888888",
    ],
    "line-width": 1.5,
  },
};

const channelLine: LayerProps = {
  id: "channel-line",
  type: "line",
  filter: ["==", ["get", "type"], TYPE.CHANNEL],
  paint: { "line-color": COLOR.channel, "line-width": 5, "line-dasharray": [2, 1.5] },
};

const pointCircles: LayerProps = {
  id: "points",
  type: "circle",
  filter: ["in", ["get", "type"], ["literal", [TYPE.CHARGE_POINT, TYPE.UNDOCK_POINT, TYPE.NRTK_REF]]],
  paint: {
    "circle-radius": 6,
    "circle-stroke-width": 2,
    "circle-stroke-color": "#0c1220",
    "circle-color": [
      "match",
      ["get", "type"],
      TYPE.CHARGE_POINT, COLOR.charge,
      TYPE.UNDOCK_POINT, COLOR.undock,
      TYPE.NRTK_REF, COLOR.nrtk,
      "#ffffff",
    ],
  },
};

const INTERACTIVE_LAYERS = ["mowing-fill", "poly-fill", "channel-line", "points"];

const LEGEND: { className: string; label: string }[] = [
  { className: "map-swatch--mowing", label: "Mowing" },
  { className: "map-swatch--nogo", label: "No-go" },
  { className: "map-swatch--obstacle", label: "Obstacle" },
  { className: "map-swatch--channel", label: "Channel" },
  { className: "map-swatch--dock", label: "Dock" },
];

// "hover" popups auto-dismiss when the cursor leaves the feature; "click"
// popups (touch, where there is no hover) persist until you tap elsewhere.
// label/detail are pre-resolved so the JSX doesn't branch on feature type —
// which also lets the robot marker (not a map feature) reuse the same popup.
type Popover = {
  lng: number;
  lat: number;
  label: string;
  detail: string;
  source: "hover" | "click";
};

function buildPopover(
  feature: GeoJSON.Feature,
  lngLat: { lng: number; lat: number },
  source: "hover" | "click",
): Popover {
  const props = feature.properties ?? {};
  const type = Number(props.type);
  // Only mowing zones carry a meaningful user name. No-go/obstacle/channel use
  // throwaway auto-letters (A, B, …) and the points use fixed keywords
  // (charge_point/undock_point), so we suppress names for everything else.
  const name = type === TYPE.MOWING && typeof props.name === "string" ? props.name : "";
  const areaM2 =
    AREA_TYPES.has(type) && feature.geometry ? area(feature.geometry as GeoJSON.Geometry) : null;
  const areaStr = areaM2 != null ? formatArea(areaM2) : "";
  // Mowing: "name · area" on one row. No-go: area only. Others: nothing.
  const detail = type === TYPE.MOWING ? [name, areaStr].filter(Boolean).join(" · ") : areaStr;
  return { lng: lngLat.lng, lat: lngLat.lat, label: TYPE_LABEL[type] ?? `Type ${type}`, detail, source };
}

function robotPopover(pos: NavSatFixData): Popover {
  // "click" source so the map's hover handlers never clear it; the marker's own
  // mouse-leave handles dismissal.
  return {
    lng: pos.lon,
    lat: pos.lat,
    label: "Robot",
    detail: `${pos.lat.toFixed(6)}, ${pos.lon.toFixed(6)}`,
    source: "click",
  };
}

/** Walk every coordinate in a GeoJSON object to build a [W, S, E, N] bbox. */
function computeBounds(geojson: unknown): [[number, number], [number, number]] | null {
  let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
  const visit = (coords: unknown) => {
    if (!Array.isArray(coords)) return;
    if (typeof coords[0] === "number" && typeof coords[1] === "number") {
      const [lng, lat] = coords as number[];
      if (lng < minLng) minLng = lng;
      if (lat < minLat) minLat = lat;
      if (lng > maxLng) maxLng = lng;
      if (lat > maxLat) maxLat = lat;
      return;
    }
    for (const c of coords) visit(c);
  };
  const fc = geojson as GeoJSON.FeatureCollection;
  for (const f of fc?.features ?? []) {
    // The type-8 NRTK reference point sits ~km from the yard (see
    // recon/tron-geojson-schema.md); including it would zoom the fit all the
    // way out and shrink the actual yard to a speck. It still renders — it
    // just correctly falls off-screen when framed on the yard.
    if (Number(f.properties?.type) === TYPE.NRTK_REF) continue;
    if (f.geometry && "coordinates" in f.geometry) visit(f.geometry.coordinates);
  }
  if (!Number.isFinite(minLng)) return null;
  return [[minLng, minLat], [maxLng, maxLat]];
}

/**
 * Mapbox-backed map. /geojson_task carries the yard in real-world lat/lng and
 * /fix(_fused) gives the robot's lat/lng directly, so there's no local-frame
 * transform — features and marker drop straight onto the basemap.
 */
export function MapView({
  geojsonTask,
  position,
}: {
  geojsonTask: unknown;
  position: NavSatFixData | null;
}) {
  const mapRef = useRef<MapRef | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const [styleKey, setStyleKey] = useState<StyleKey>("outdoors");
  const [loaded, setLoaded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [popover, setPopover] = useState<Popover | null>(null);
  // /geojson_task republishes periodically; only auto-fit on the first render
  // so re-fitting never yanks away the user's pan/zoom.
  const hasFitRef = useRef(false);
  // If the robot position arrives before any geojson, we provisionally center
  // on it — but only once, and without blocking a later yard fit.
  const didRobotJumpRef = useRef(false);

  const fitToYard = useCallback((animate: boolean) => {
    const map = mapRef.current;
    const bounds = computeBounds(geojsonTask);
    if (!map || !bounds) return false;
    map.fitBounds(bounds, { padding: 40, maxZoom: 20, duration: animate ? 600 : 0 });
    return true;
  }, [geojsonTask]);

  // Initial view: fit the yard as soon as the map + geojson are ready (this
  // wins permanently). Until then, if we have a robot position, center on it
  // provisionally so the map isn't stuck at the [0,0] world view.
  useEffect(() => {
    if (!loaded || hasFitRef.current) return;
    if (fitToYard(false)) {
      hasFitRef.current = true;
      return;
    }
    if (position && !didRobotJumpRef.current) {
      mapRef.current?.jumpTo({ center: [position.lon, position.lat], zoom: 18 });
      didRobotJumpRef.current = true;
    }
  }, [loaded, fitToYard, position]);

  const setCursor = (cursor: string) => {
    const canvas = mapRef.current?.getMap().getCanvas();
    if (canvas) canvas.style.cursor = cursor;
  };

  const showFromEvent = (e: MapLayerMouseEvent, source: "hover" | "click") => {
    const feature = e.features?.[0];
    if (!feature) {
      // An empty click closes any popup; a hover that leaves all features
      // closes only hover-opened ones, so a tapped popup survives on touch.
      setPopover((prev) => (source === "click" || prev?.source === "hover" ? null : prev));
      return;
    }
    setPopover(buildPopover(feature as GeoJSON.Feature, e.lngLat, source));
  };

  const handleMouseMove = (e: MapLayerMouseEvent) => {
    setCursor(e.features && e.features.length ? "pointer" : "");
    showFromEvent(e, "hover");
  };

  const handleMouseLeave = () => {
    setCursor("");
    setPopover((prev) => (prev?.source === "hover" ? null : prev));
  };

  // Fullscreen the whole frame (not just the map canvas) so the control
  // cluster stays visible. react-map-gl's ResizeObserver re-fits the canvas
  // to the new size automatically.
  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void frameRef.current?.requestFullscreen();
    }
  };

  useEffect(() => {
    const onChange = () => setIsFullscreen(document.fullscreenElement === frameRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  if (!TOKEN) {
    return (
      <div className="map-empty">
        Map unavailable — set <code>VITE_MAPBOX_TOKEN</code> (see <code>.env.example</code>).
      </div>
    );
  }

  return (
    <div ref={frameRef} className="map-frame map-frame--mapbox">
      <Map
        ref={mapRef}
        mapboxAccessToken={TOKEN}
        initialViewState={{ longitude: 0, latitude: 0, zoom: 1 }}
        mapStyle={STYLES[styleKey]}
        style={{ width: "100%", height: "100%" }}
        interactiveLayerIds={INTERACTIVE_LAYERS}
        onLoad={() => setLoaded(true)}
        onClick={(e) => showFromEvent(e, "click")}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        attributionControl={false}
      >
        <NavigationControl position="top-left" showCompass={false} />

        {geojsonTask ? (
          <Source id="yard" type="geojson" data={geojsonTask as GeoJSON.FeatureCollection}>
            <Layer {...mowingFill} />
            <Layer {...mowingOutline} />
            <Layer {...otherPolyFill} />
            <Layer {...otherPolyOutline} />
            <Layer {...channelLine} />
            <Layer {...pointCircles} />
          </Source>
        ) : null}

        {position ? (
          <Marker longitude={position.lon} latitude={position.lat} anchor="center">
            <span
              className="map-robot"
              onMouseEnter={() => setPopover(robotPopover(position))}
              onMouseLeave={() => setPopover((prev) => (prev?.label === "Robot" ? null : prev))}
              onClick={(e) => {
                e.stopPropagation();
                setPopover(robotPopover(position));
              }}
            />
          </Marker>
        ) : null}

        {popover ? (
          <Popup
            longitude={popover.lng}
            latitude={popover.lat}
            anchor="bottom"
            offset={12}
            closeButton={false}
            closeOnClick={false}
            onClose={() => setPopover(null)}
            className="map-popup"
          >
            <div className="map-popup-type">{popover.label}</div>
            {popover.detail ? <div className="map-popup-detail">{popover.detail}</div> : null}
          </Popup>
        ) : null}
      </Map>

      <div className="map-legend map-legend--overlay">
        {LEGEND.map(({ className, label }) => (
          <span className="map-legend-item" key={label}>
            <span className={`map-swatch ${className}`} /> {label}
          </span>
        ))}
        <span className="map-legend-item">
          <span className="map-legend-dot" /> Robot
        </span>
      </div>

      <div className="map-controls">
        <button
          className="map-style-toggle"
          onClick={() => setStyleKey((k) => (k === "outdoors" ? "satellite" : "outdoors"))}
        >
          {styleKey === "outdoors" ? "Satellite" : "Outdoors"}
        </button>
        <button className="map-reset" onClick={() => fitToYard(true)}>
          Recenter
        </button>
        <button
          className="map-reset"
          onClick={toggleFullscreen}
          aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
        >
          {isFullscreen ? "Exit" : "Fullscreen"}
        </button>
      </div>
    </div>
  );
}
