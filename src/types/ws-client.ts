import type { RecordEvent } from "./ws";

export type ConnectionState = "disconnected" | "connecting" | "connected" | "reconnecting";

export interface ReconnectConfig {
  strategy: "exponential" | "fixed";
  initialDelayMs: number;
  maxDelayMs: number;
  maxRetries: number;
}

export interface WsClientConfig {
  url: string;
  databaseId?: string;
  database?: string;
  token?: string;
  reconnect?: ReconnectConfig;
  heartbeatIntervalMs?: number;
}

export interface SubscriptionState {
  subscriptionId: string;
  status: "active" | "pending" | "failed";
  collection?: string;
  recordId?: string;
}

export type { RecordEvent };
