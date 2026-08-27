export interface CameraDefinition {
  key: string;
  label: string;
  description?: string;
  topic: string;
  serviceKey: string | null;
  needsCapture: boolean;
  colorize?: boolean;
  rawDepth?: boolean;
  defaultOff?: boolean;
}

export const CAMERAS: CameraDefinition[] = [
  { key: "vio_left",        label: "Front",            topic: "/vio/left/image_raw/compressed",        serviceKey: null,              needsCapture: false },
  { key: "rear_camera",     label: "Rear",             topic: "/rear_camera/image_raw/compressed",     serviceKey: "rear_camera",     needsCapture: true },
  { key: "left_oa_camera",  label: "Left OA",          topic: "/left_oa_camera/image_raw/compressed",  serviceKey: "left_oa_camera",  needsCapture: true },
  { key: "right_oa_camera", label: "Right OA",         topic: "/right_oa_camera/image_raw/compressed", serviceKey: "right_oa_camera", needsCapture: true },
  { key: "vio_depth_jpeg",  label: "Depth",            description: "JPEG compressed, our colormap applied to 8-bit grayscale. Fast (~6 fps) but colors are approximate.",                              topic: "/vio/depth/image_raw/compressed",    serviceKey: null, needsCapture: false, colorize: true },
  { key: "vio_depth",       label: "Depth (16-bit)",   description: "Raw sensor_msgs/Image with real 16-bit depth values. Accurate colormap but slower (~1-2 fps) due to large frames.",                topic: "/vio/depth/image_croped",            serviceKey: null, needsCapture: false, rawDepth: true, defaultOff: true },
  { key: "vio_depth_crop",  label: "Depth (mower)",    description: "Mower's built-in colorization with color bar. JPEG compressed, no processing on our side.",                                        topic: "/vio/depth/image_croped/compressed", serviceKey: null, needsCapture: false, defaultOff: true },
  { key: "vio_right",       label: "Front Right (stereo pair)", topic: "/vio/right/image_raw/compressed", serviceKey: null,          needsCapture: false, defaultOff: true },
];

export const CAMERAS_NEEDING_CAPTURE = CAMERAS.filter((c) => c.needsCapture);
