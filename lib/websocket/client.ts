import type { IncomingEvent, OutgoingEvent } from "../chat/types";

type Listener = (event: IncomingEvent) => void;

export class ChatWebSocketClient {
  private socket: WebSocket | null = null;
  private listeners = new Set<Listener>();
  private url: string;

  constructor(url = "ws://localhost:3030") {
    this.url = url;
  }

  connect() {
    if (typeof window === "undefined") return;
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.socket = new WebSocket(this.url);
    this.socket.onopen = () => {
      // eslint-disable-next-line no-console
      console.log("[ws] connected to", this.url);
    };
    this.socket.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data) as IncomingEvent;
        this.listeners.forEach((listener) => listener(parsed));
      } catch {
        // swallow
      }
    };
    this.socket.onerror = (error) => {
      // eslint-disable-next-line no-console
      console.error("[ws] error", error);
    };
    this.socket.onclose = () => {
      // very naive reconnect
      // eslint-disable-next-line no-console
      console.warn("[ws] disconnected, retrying in 2s");
      setTimeout(() => this.connect(), 2000);
    };
  }

  send(event: OutgoingEvent) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    this.socket.send(JSON.stringify(event));
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}

