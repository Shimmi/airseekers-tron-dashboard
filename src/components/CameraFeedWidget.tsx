import { useCallback, useEffect, useRef, useState } from "react";
import type { CameraDefinition } from "../lib/cameras";
import type { ImageMessage } from "../lib/foxglove";

const DEPTH_LUT = buildDepthLut();
const DEPTH_MIN_M = 0;
const DEPTH_MAX_M = 8;

function buildDepthLut(): Uint8Array {
  const lut = new Uint8Array(256 * 3);
  for (let i = 0; i < 256; i++) {
    const hue = (i / 255) * 270;
    const hp = hue / 60;
    const x = 1 - Math.abs(hp % 2 - 1);
    let r = 0, g = 0, b = 0;
    if (hp < 1)      { r = 1; g = x; }
    else if (hp < 2) { r = x; g = 1; }
    else if (hp < 3) { g = 1; b = x; }
    else if (hp < 4) { g = x; b = 1; }
    else              { r = x; b = 1; }
    lut[i * 3]     = Math.round(r * 255);
    lut[i * 3 + 1] = Math.round(g * 255);
    lut[i * 3 + 2] = Math.round(b * 255);
  }
  return lut;
}

function decodeRawDepth(msg: ImageMessage, canvas: HTMLCanvasElement): boolean {
  const { width, height, encoding, is_bigendian, step, data } = msg;
  if (!width || !height || !data || !encoding || !step) return false;

  const bpp = data.byteLength / (width * height);
  if (bpp === 3 || bpp === 4 && encoding !== "32FC1") {
    // rgb8/bgr8 — already colorized, render directly
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
    const ctx = canvas.getContext("2d")!;
    const imageData = ctx.createImageData(width, height);
    const px = imageData.data;
    for (let row = 0; row < height; row++) {
      const rowOff = row * step;
      for (let col = 0; col < width; col++) {
        const src = rowOff + col * 3;
        const dst = (row * width + col) * 4;
        px[dst] = data[src];
        px[dst + 1] = data[src + 1];
        px[dst + 2] = data[src + 2];
        px[dst + 3] = 255;
      }
    }
    ctx.putImageData(imageData, 0, 0);
    return true;
  }

  const little = !is_bigendian;
  const dv = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const is32 = encoding === "32FC1";
  const bytesPerPx = is32 ? 4 : 2;
  const span = DEPTH_MAX_M - DEPTH_MIN_M || 1;

  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;

  const ctx = canvas.getContext("2d")!;
  const imageData = ctx.createImageData(width, height);
  const px = imageData.data;

  for (let row = 0; row < height; row++) {
    const rowOff = row * step;
    for (let col = 0; col < width; col++) {
      const byteIdx = rowOff + col * bytesPerPx;
      const pixIdx = (row * width + col) * 4;

      let depth: number;
      if (is32) {
        depth = dv.getFloat32(byteIdx, little);
      } else {
        depth = dv.getUint16(byteIdx, little) / 1000;
      }

      px[pixIdx + 3] = 255;
      if (!(depth > 0) || !Number.isFinite(depth)) continue;

      let t = (depth - DEPTH_MIN_M) / span;
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      const idx = (t * 255) | 0;
      px[pixIdx]     = DEPTH_LUT[idx * 3];
      px[pixIdx + 1] = DEPTH_LUT[idx * 3 + 1];
      px[pixIdx + 2] = DEPTH_LUT[idx * 3 + 2];
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return true;
}

export function CameraFeedWidget({
  camera,
  colorize = false,
  onToggleColorize,
  subscribeImage,
  unsubscribeImage,
}: {
  camera: CameraDefinition;
  colorize?: boolean;
  onToggleColorize?: () => void;
  subscribeImage: (topic: string, handler: (msg: ImageMessage) => void) => void;
  unsubscribeImage: (topic: string) => void;
}) {
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tmpImg = useRef<HTMLImageElement | null>(null);
  const blobUrl = useRef<string | null>(null);
  const pendingMsg = useRef<ImageMessage | null>(null);
  const decoding = useRef(false);
  const frameCount = useRef(0);
  const encodingLogged = useRef(false);
  const [fps, setFps] = useState(0);
  const [hasFrame, setHasFrame] = useState(false);

  const useCanvas = camera.rawDepth || colorize;

  const processCompressedFrame = useCallback((bytes: Uint8Array) => {
    const prevUrl = blobUrl.current;
    const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: "image/jpeg" }));
    blobUrl.current = url;
    decoding.current = true;

    const onDone = () => {
      if (prevUrl) URL.revokeObjectURL(prevUrl);
      decoding.current = false;
      frameCount.current++;
      if (!hasFrame) setHasFrame(true);
      const next = pendingMsg.current;
      if (next) {
        pendingMsg.current = null;
        processCompressedFrame(next.data);
      }
    };

    if (!colorize) {
      const img = imgRef.current;
      if (!img) return;
      img.src = url;
      img.onload = onDone;
      img.onerror = () => { if (prevUrl) URL.revokeObjectURL(prevUrl); decoding.current = false; };
    } else {
      if (!tmpImg.current) tmpImg.current = new Image();
      const img = tmpImg.current;
      img.onload = () => {
        const canvas = canvasRef.current;
        if (!canvas) { onDone(); return; }
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        const px = imageData.data;
        for (let i = 0; i < px.length; i += 4) {
          const gray = px[i];
          if (gray === 0) continue;
          px[i] = DEPTH_LUT[gray * 3];
          px[i + 1] = DEPTH_LUT[gray * 3 + 1];
          px[i + 2] = DEPTH_LUT[gray * 3 + 2];
        }
        ctx.putImageData(imageData, 0, 0);
        onDone();
      };
      img.onerror = () => { if (prevUrl) URL.revokeObjectURL(prevUrl); decoding.current = false; };
      img.src = url;
    }
  }, [hasFrame, colorize]);

  useEffect(() => {
    const handler = (msg: ImageMessage) => {
      if (camera.rawDepth) {
        if (!encodingLogged.current && msg.encoding) {
          encodingLogged.current = true;
          const bpp = msg.data.byteLength / ((msg.width ?? 1) * (msg.height ?? 1));
          console.log(
            `[depth] ${camera.topic}: ${msg.width}×${msg.height} encoding=${msg.encoding} bpp=${bpp} step=${msg.step}`,
          );
        }
        const canvas = canvasRef.current;
        if (!canvas) return;
        if (decodeRawDepth(msg, canvas)) {
          frameCount.current++;
          if (!hasFrame) setHasFrame(true);
        }
        return;
      }
      if (decoding.current) {
        pendingMsg.current = msg;
        return;
      }
      processCompressedFrame(msg.data);
    };
    subscribeImage(camera.topic, handler);
    return () => {
      unsubscribeImage(camera.topic);
      if (blobUrl.current) {
        URL.revokeObjectURL(blobUrl.current);
        blobUrl.current = null;
      }
    };
  }, [camera.topic, camera.rawDepth, hasFrame, subscribeImage, unsubscribeImage, processCompressedFrame]);

  useEffect(() => {
    const interval = setInterval(() => {
      setFps(frameCount.current);
      frameCount.current = 0;
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="cam-feed">
      <div className="cam-feed-header">
        <span className="cam-feed-label" title={camera.description}>{camera.label}</span>
        <div className="cam-feed-controls">
          {onToggleColorize && !camera.rawDepth && (
            <button
              className={`cam-feed-color-btn${colorize ? " cam-feed-color-btn--active" : ""}`}
              onClick={onToggleColorize}
              title={colorize ? "Switch to grayscale" : "Switch to color"}
            >
              {colorize ? "Color" : "B&W"}
            </button>
          )}
          {hasFrame && <span className="cam-feed-fps">{fps} fps</span>}
        </div>
      </div>
      <div className="cam-feed-view">
        {useCanvas ? (
          <canvas
            ref={canvasRef}
            className={`cam-feed-img${hasFrame ? "" : " cam-feed-img--hidden"}`}
          />
        ) : (
          <img
            ref={imgRef}
            className={`cam-feed-img${hasFrame ? "" : " cam-feed-img--hidden"}`}
            alt={camera.label}
          />
        )}
        {!hasFrame && (
          <div className="cam-feed-placeholder">No signal</div>
        )}
      </div>
    </div>
  );
}
