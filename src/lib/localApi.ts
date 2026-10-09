/**
 * Read-only client for the mower's local HTTP API (`mower_logic`, port 13344).
 *
 * Plain JSON over HTTP, no auth, separate from the Foxglove bridge. Responses
 * use the envelope `{ successed, errorCode, msg, data? }`. GET responses carry
 * `Access-Control-Allow-Origin: *`; OPTIONS is not routed, so only simple GETs
 * work from the browser.
 *
 * Only reads live here. The same server also exposes task and map commands
 * (`/task/start`, `/map/save`, …) — those stay out until they are verified
 * on hardware (see recon/external-mikey0000.md).
 */

export const LOCAL_API_PORT = 13344;
const TIMEOUT_MS = 8000;

/** One driven-track point in the local map frame (metres from the dock). */
export interface WalkPoint {
  x: number;
  y: number;
}

async function getData(host: string, path: string): Promise<unknown> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`http://${host}:${LOCAL_API_PORT}${path}`, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = (await res.json()) as Record<string, unknown>;
    if (body.successed !== true && body.errorCode !== 0) {
      throw new Error(`${String(body.msg ?? "error")} (${String(body.errorCode)})`);
    }
    return body.data;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Track driven by the current (or last) task, from `fromIndex` inclusive.
 * Past the end the server omits `data`, which maps to an empty list.
 */
export async function getWalkPath(host: string, fromIndex: number): Promise<WalkPoint[]> {
  const data = await getData(host, `/task/getWalkPath?point_index=${fromIndex}`);
  if (!Array.isArray(data)) return [];
  const points: WalkPoint[] = [];
  for (const p of data) {
    if (Array.isArray(p) && Number.isFinite(p[0]) && Number.isFinite(p[1])) {
      points.push({ x: Number(p[0]), y: Number(p[1]) });
    }
  }
  return points;
}
