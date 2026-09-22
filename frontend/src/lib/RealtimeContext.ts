"use client";

import { createContext, useContext } from "react";

export type ConnectionStatus = "idle" | "connecting" | "ready" | "empty" | "offline";

export interface RealtimeMessage {
  id: string;
  clientId?: string;
  name: string;
  department?: string;
  message: string;
  timestamp: number;
  hidden?: boolean;
}

export interface RealtimeContextValue {
  messages: RealtimeMessage[];
  status: ConnectionStatus;
  viewerCount: number;
  liveEnabled: boolean;
  send: (msg: { name: string; department?: string; message: string }) => void;
  reconnect: () => void;
}

export const RealtimeContext = createContext<RealtimeContextValue | null>(null);

export function useRealtime(): RealtimeContextValue {
  const ctx = useContext(RealtimeContext);
  if (!ctx) throw new Error("useRealtime must be used within RealtimeProvider");
  return ctx;
}
