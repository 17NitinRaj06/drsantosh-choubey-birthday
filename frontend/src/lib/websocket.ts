"use client";

import { WS_URL } from "./config";

type MessageHandler = (data: unknown) => void;
type StatusHandler = (status: "connecting" | "connected" | "disconnected") => void;

interface WSMessage {
  type: string;
  payload?: unknown;
}

class WebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private listeners: Map<string, Set<MessageHandler>> = new Map();
  private statusListeners: Set<StatusHandler> = new Set();
  private reconnectAttempt = 0;
  private maxReconnectDelay = 30000;
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private messageQueue: WSMessage[] = [];
  private _status: "connecting" | "connected" | "disconnected" = "disconnected";
  private destroyed = false;

  constructor(url: string) {
    this.url = url;
  }

  get status() {
    return this._status;
  }

  connect() {
    if (this.destroyed) return;
    if (!this.url || this.ws?.readyState === WebSocket.OPEN) return;

    this._status = "connecting";
    this.notifyStatus();

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        if (this.destroyed) return;
        this._status = "connected";
        this.reconnectAttempt = 0;
        this.notifyStatus();
        this.startPing();
        this.flushQueue();
      };

      this.ws.onmessage = (event) => {
        if (this.destroyed) return;
        try {
          const msg = JSON.parse(event.data) as WSMessage;
          this.emit(msg.type, msg.payload);
        } catch {
          // ignore malformed messages
        }
      };

      this.ws.onclose = () => {
        if (this.destroyed) return;
        this._status = "disconnected";
        this.notifyStatus();
        this.stopPing();
        this.scheduleReconnect();
      };

      this.ws.onerror = () => {
        this.ws?.close();
      };
    } catch {
      this._status = "disconnected";
      this.notifyStatus();
      this.scheduleReconnect();
    }
  }

  disconnect() {
    this.destroyed = true;
    this.stopPing();
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    this.reconnectAttempt = 0;
    this.ws?.close();
    this.ws = null;
    this._status = "disconnected";
    this.notifyStatus();
  }

  send(type: string, payload?: unknown) {
    const msg: WSMessage = { type, payload };
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    } else {
      this.messageQueue.push(msg);
    }
  }

  on(type: string, handler: MessageHandler): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(handler);
    return () => {
      this.listeners.get(type)?.delete(handler);
    };
  }

  onStatus(handler: StatusHandler): () => void {
    this.statusListeners.add(handler);
    return () => {
      this.statusListeners.delete(handler);
    };
  }

  private emit(type: string, data: unknown) {
    this.listeners.get(type)?.forEach((h) => h(data));
    this.listeners.get("*")?.forEach((h) => h({ type, payload: data }));
  }

  private notifyStatus() {
    this.statusListeners.forEach((h) => h(this._status));
  }

  private startPing() {
    this.stopPing();
    this.pingInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: "ping" }));
      }
    }, 4 * 60 * 1000);
  }

  private stopPing() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private scheduleReconnect() {
    if (this.destroyed || this.reconnectTimeout) return;
    const delay = Math.min(
      1000 * Math.pow(2, this.reconnectAttempt),
      this.maxReconnectDelay
    );
    this.reconnectAttempt++;
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      this.connect();
    }, delay);
  }

  private flushQueue() {
    while (this.messageQueue.length > 0) {
      const msg = this.messageQueue.shift()!;
      this.send(msg.type, msg.payload);
    }
  }
}

let instance: WebSocketClient | null = null;

export function getWebSocket(): WebSocketClient {
  if (!instance && WS_URL) {
    instance = new WebSocketClient(WS_URL);
  }
  return instance!;
}

export function destroyWebSocket() {
  if (instance) {
    instance.disconnect();
    instance = null;
  }
}

export type { MessageHandler, StatusHandler };
