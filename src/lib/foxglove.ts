import { parse as parseMessageDefinition } from "@foxglove/rosmsg";
import { MessageReader, MessageWriter } from "@foxglove/rosmsg-serialization";
import {
  FoxgloveClient as WsProtocolClient,
  type Channel,
  type Service,
  type MessageData,
  type ServiceCallResponse,
  type ServiceCallFailure,
} from "@foxglove/ws-protocol";

export type ConnectionState = "disconnected" | "connecting" | "connected";

export interface FoxgloveCallbacks {
  onStateChange: (state: ConnectionState) => void;
  onMessage: (topic: string, data: Record<string, unknown>) => void;
  onLog: (msg: string, level: "info" | "ok" | "warn" | "error") => void;
  onServicesAvailable: (services: string[]) => void;
  onServiceResult: (
    callId: number,
    name: string,
    ok: boolean,
    detail: string,
  ) => void;
}

export class FoxgloveClient {
  #protocol: WsProtocolClient | null = null;
  #ws: WebSocket | null = null;
  #channels: Record<string, Channel> = {};
  #serviceMap: Record<string, Service> = {};
  #serviceWriters: Record<string, MessageWriter> = {};
  #subscriptions: Record<number, { topic: string; channelId: number }> = {};
  #subscribedTopics = new Set<string>();
  #readers: Record<number, MessageReader> = {};
  #nextCallId = 1;
  #reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  #connectTimer: ReturnType<typeof setTimeout> | null = null;
  #url = "";
  #shouldReconnect = false;
  #everConnected = false;
  #callbacks: FoxgloveCallbacks;

  constructor(callbacks: FoxgloveCallbacks) {
    this.#callbacks = callbacks;
  }

  connect(url: string) {
    this.#url = url;
    this.#shouldReconnect = true;
    this.#everConnected = false;
    this.#doConnect();
  }

  disconnect() {
    this.#shouldReconnect = false;
    if (this.#reconnectTimer) {
      clearTimeout(this.#reconnectTimer);
      this.#reconnectTimer = null;
    }
    if (this.#connectTimer) {
      clearTimeout(this.#connectTimer);
      this.#connectTimer = null;
    }
    this.#protocol?.close();
    this.#protocol = null;
    this.#ws = null;
    this.#reset();
    this.#callbacks.onStateChange("disconnected");
  }

  callService(name: string, data: unknown): number | null {
    if (!this.#protocol || !this.#ws || this.#ws.readyState !== WebSocket.OPEN)
      return null;
    const svc = this.#serviceMap[name];
    if (!svc) return null;
    const callId = this.#nextCallId++;
    const writer = this.#serviceWriters[name];
    let encoding: string;
    let payload: Uint8Array;
    if (writer) {
      encoding = "ros1";
      payload = writer.writeMessage(data);
    } else {
      encoding = "json";
      payload = new TextEncoder().encode(JSON.stringify(data));
    }
    this.#protocol.sendServiceCallRequest({
      serviceId: svc.id,
      callId,
      encoding,
      data: payload,
    });
    this.#callbacks.onLog(`Service call: ${name} (id=${callId})`, "ok");
    return callId;
  }

  hasService(name: string) {
    return name in this.#serviceMap;
  }

  #doConnect() {
    this.#callbacks.onStateChange("connecting");
    this.#callbacks.onLog(`Connecting to ${this.#url}...`, "warn");

    if (this.#connectTimer) clearTimeout(this.#connectTimer);
    this.#connectTimer = setTimeout(() => {
      if (!this.#everConnected) {
        this.#callbacks.onLog("Connection timed out — check IP and network", "error");
        this.disconnect();
      }
    }, 10_000);

    let ws: WebSocket;
    try {
      ws = new WebSocket(this.#url, ["foxglove.websocket.v1"]);
    } catch (e) {
      clearTimeout(this.#connectTimer);
      this.#callbacks.onLog(`WebSocket constructor error: ${e}`, "error");
      this.#callbacks.onStateChange("disconnected");
      return;
    }
    ws.binaryType = "arraybuffer";
    this.#ws = ws;

    const protocol = new WsProtocolClient({ ws: ws as never });
    this.#protocol = protocol;

    protocol.on("open", () => {
      this.#callbacks.onLog(
        "WebSocket connected, waiting for server info...",
        "ok",
      );
    });

    protocol.on("close", (e: CloseEvent) => {
      this.#callbacks.onLog(
        `Disconnected: code=${e.code} ${e.reason || "connection closed"}`,
        "error",
      );
      this.#callbacks.onStateChange("disconnected");
      this.#reset();
      if (this.#shouldReconnect && this.#everConnected) {
        this.#reconnectTimer = setTimeout(() => {
          this.#callbacks.onLog("Reconnecting...", "warn");
          this.#doConnect();
        }, 3000);
      }
    });

    protocol.on("error", (err: Error) => {
      this.#callbacks.onLog(`WebSocket error: ${err.message}`, "error");
    });

    protocol.on("serverInfo", (info) => {
      this.#callbacks.onLog(
        `Server: ${info.name}, capabilities: ${(info.capabilities || []).join(", ")}`,
        "ok",
      );
      if (this.#connectTimer) {
        clearTimeout(this.#connectTimer);
        this.#connectTimer = null;
      }
      this.#everConnected = true;
      this.#callbacks.onStateChange("connected");
    });

    protocol.on("advertise", (channels: Channel[]) => {
      for (const ch of channels) {
        this.#channels[ch.topic] = ch;
      }
      this.#callbacks.onLog(
        `Received ${Object.keys(this.#channels).length} channels`,
        "info",
      );
      this.#subscribeAll();
    });

    protocol.on("advertiseServices", (services: Service[]) => {
      for (const svc of services) {
        this.#serviceMap[svc.name] = svc;
        const schema = (svc as Record<string, unknown>).requestSchema as string | undefined;
        if (schema) {
          try {
            const defs = parseMessageDefinition(schema);
            this.#serviceWriters[svc.name] = new MessageWriter(defs);
          } catch {
            /* no writer — will fall back to JSON */
          }
        }
      }
      this.#callbacks.onLog(
        `Received ${Object.keys(this.#serviceMap).length} services`,
        "info",
      );
      this.#callbacks.onServicesAvailable(Object.keys(this.#serviceMap));
    });

    protocol.on("message", (msg: MessageData) => {
      this.#handleMessage(msg);
    });

    protocol.on("serviceCallResponse", (resp: ServiceCallResponse) => {
      let detail = "";
      if (resp.data.byteLength > 0) {
        try {
          const text = new TextDecoder().decode(resp.data);
          detail = " → " + text;
        } catch {
          /* ignore */
        }
      }
      const svcName =
        Object.entries(this.#serviceMap).find(
          ([, s]) => s.id === resp.serviceId,
        )?.[0] ?? `service#${resp.serviceId}`;
      this.#callbacks.onLog(
        `Service response ${svcName} (id=${resp.callId}): ok${detail}`,
        "ok",
      );
      this.#callbacks.onServiceResult(resp.callId, svcName, true, detail);
    });

    protocol.on("serviceCallFailure", (fail: ServiceCallFailure) => {
      const svcName =
        Object.entries(this.#serviceMap).find(
          ([, s]) => s.id === fail.serviceId,
        )?.[0] ?? `service#${fail.serviceId}`;
      this.#callbacks.onLog(
        `Service call failed ${svcName} (id=${fail.callId}): ${fail.message}`,
        "error",
      );
      this.#callbacks.onServiceResult(fail.callId, svcName, false, fail.message);
    });
  }

  #subscribeAll() {
    if (!this.#protocol) return;

    const targets = [
      "/battery",
      "/mower_base/status",
      "/mower_localization_info",
      "/mower_gps_node/info",
      "/mower_sensor_info",
      "/robot_config",
      "/task_info",
      "/mower_base/net_status",
      "/mower_gps_node/ref_info",
      "/rosout",
      "/map",
      "/cover/polygon",
      "/geojson_task",
      "/fix_fused",
      "/fix",
      "/mower_base/battery_health",
    ];

    for (const topic of targets) {
      if (this.#subscribedTopics.has(topic)) continue;
      const ch = this.#channels[topic];
      if (!ch) continue;

      let reader: MessageReader | null = null;
      const isRos1Schema =
        ch.schemaEncoding === "ros1msg" ||
        (!ch.schemaEncoding && ch.encoding === "ros1");
      if (ch.schema && isRos1Schema) {
        try {
          const defs = parseMessageDefinition(ch.schema);
          reader = new MessageReader(defs);
        } catch (e) {
          this.#callbacks.onLog(
            `Schema parse failed for ${topic}: ${e}`,
            "warn",
          );
        }
      }

      const subId = this.#protocol.subscribe(ch.id);
      this.#subscriptions[subId] = { topic, channelId: ch.id };
      this.#subscribedTopics.add(topic);
      if (reader) this.#readers[subId] = reader;
    }
    this.#callbacks.onLog(
      `Subscribed to ${Object.keys(this.#subscriptions).length} topics`,
      "ok",
    );
  }

  #handleMessage(msg: MessageData) {
    const sub = this.#subscriptions[msg.subscriptionId];
    if (!sub) return;

    const raw = msg.data;
    const reader = this.#readers[msg.subscriptionId];

    if (reader) {
      try {
        const parsed = reader.readMessage(
          new DataView(raw.buffer, raw.byteOffset, raw.byteLength),
        );
        this.#callbacks.onMessage(
          sub.topic,
          parsed as Record<string, unknown>,
        );
      } catch (e) {
        console.error(`Deserialize error for ${sub.topic}:`, e);
      }
    } else {
      try {
        const bytes = new Uint8Array(raw.buffer, raw.byteOffset, raw.byteLength);
        const text = new TextDecoder().decode(bytes.subarray(4));
        const parsed = JSON.parse(text);
        this.#callbacks.onMessage(
          sub.topic,
          typeof parsed === "object" ? parsed : { data: parsed },
        );
      } catch {
        this.#callbacks.onMessage(sub.topic, {});
      }
    }
  }

  #reset() {
    this.#channels = {};
    this.#serviceMap = {};
    this.#serviceWriters = {};
    this.#subscriptions = {};
    this.#subscribedTopics.clear();
    this.#readers = {};
  }
}
