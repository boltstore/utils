export type WsMessageType =
  | "ping"
  | "pong"
  | "error"
  | "connected"
  | "authenticated"
  | "subscribe"
  | "unsubscribe"
  | "event"
  | "auth"
  | "subscribed"
  | "unsubscribed";

export interface WsMessage {
  type: WsMessageType;
  [key: string]: unknown;
}

export interface WsErrorPayload {
  code: string;
  message: string;
}

export interface WsConnectedPayload {
  connectionId: string;
}

export interface SubscribeMessage {
  type: "subscribe";
  collection?: string;
  recordId?: string;
  filter?: Record<string, unknown>;
  /** Client-generated local ID for deterministic response matching. */
  localId?: string;
  /** Last known change seq (rowid from _changes). Server replays events after this seq. */
  lastSeq?: number;
}

export interface UnsubscribeMessage {
  type: "unsubscribe";
  subscriptionId: string;
}

export interface RecordEvent {
  type: "event";
  event: "create" | "update" | "delete";
  collection: string;
  database: string;
  record: Record<string, unknown>;
  previous?: Record<string, unknown>;
  /** SQLite rowid from the _changes table, used for replay sequencing. */
  seq?: number;
}
