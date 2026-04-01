import type { IncomingEvent, OutgoingEvent } from "../chat/types";

type Listener = (event: IncomingEvent) => void;
type InitializerPayload = object;

function getDefaultWebSocketUrl(): string {
  // During build/static export there is no window; return a placeholder.
  if (typeof window === "undefined") {
    return "ws://localhost:3030";
  }

  const isHttps = window.location.protocol === "https:";
  const protocol = isHttps ? "wss:" : "ws:";
  const host = window.location.host; // includes hostname + :port

  // Adjust the path to match your backend WS endpoint.
  // Currently using /SES/WebLiveChat as provided by backend.
  const path = "/SES/WebLiveChat";

  return `${protocol}//${host}${path}`;
}

export class ChatWebSocketClient {
  private socket: WebSocket | null = null;
  private listeners = new Set<Listener>();
  private url: string;
  private initializer: InitializerPayload | null = null;

  constructor(url = getDefaultWebSocketUrl()) {
    this.url = url;
  }

  setInitializer(initializer: InitializerPayload | null) {
    this.initializer = initializer;
    if (initializer && this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(initializer));
    }
  }

  connect() {
    if (typeof window === "undefined") return;
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.socket = new WebSocket(this.url);
    this.socket.onopen = () => {
      console.log("[ws] connected to", this.url);
      if (this.initializer) {
        this.socket?.send(JSON.stringify(this.initializer));
      }
    };
    this.socket.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data) as IncomingEvent;
        console.log("[ws] response", parsed);
        this.listeners.forEach((listener) => listener(parsed));
      } catch {
        // swallow
      }
    };
    this.socket.onerror = (error) => {
      console.error("[ws] error", error);
    };
    this.socket.onclose = () => {
      // very naive reconnect
      console.warn("[ws] disconnected, retrying in 2s");
      setTimeout(() => this.connect(), 2000);
    };
  }

  send(event: OutgoingEvent) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    this.socket.send(JSON.stringify(event));
  }

  sendRaw(payload: Record<string, unknown>) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    this.socket.send(JSON.stringify(payload));
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}

