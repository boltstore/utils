export type ColumnType = "TEXT" | "INTEGER" | "REAL" | "BLOB" | "BOOLEAN" | "DATETIME";

export const SQLITE_TYPE_MAP: Record<ColumnType, string> = {
  TEXT: "TEXT",
  INTEGER: "INTEGER",
  REAL: "REAL",
  BLOB: "BLOB",
  BOOLEAN: "INTEGER",
  DATETIME: "TEXT",
};

export interface ColumnDefinition {
  name: string;
  type: ColumnType;
  required?: boolean;
  default?: string | number | boolean | null;
  unique?: boolean;
}

export interface CollectionSchema {
  name: string;
  columns: ColumnDefinition[];
  system?: boolean;
}

export type ConflictStrategy = "last-write-wins" | "server-wins" | "client-merge";

export interface CollectionInfo {
  name: string;
  columns: ColumnDefinition[];
  relations?: Record<string, { field: string; foreignCollection: string; cascadeDelete?: boolean }>;
  conflictStrategy?: ConflictStrategy;
  recordCount: number;
  createdAt: string;
  updatedAt: string;
}
