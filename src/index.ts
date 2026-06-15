/**
 * @boltstore/utils — Shared types, schemas, and utilities for Boltstore.
 *
 * Used by both the server and client SDK.
 *
 * @module @boltstore/utils
 */

// ---------------------------------------------------------------------------
// Column / Schema types
// ---------------------------------------------------------------------------

/** Supported SQLite column types. */
export type ColumnType = "TEXT" | "INTEGER" | "REAL" | "BLOB" | "BOOLEAN" | "DATETIME";

/** Valid SQLite type names mapped to their SQL affinities. */
export const SQLITE_TYPE_MAP: Record<ColumnType, string> = {
  TEXT: "TEXT",
  INTEGER: "INTEGER",
  REAL: "REAL",
  BLOB: "BLOB",
  BOOLEAN: "INTEGER", // SQLite has no native boolean — stored as 0/1
  DATETIME: "TEXT",   // ISO-8601 text
};

/** Definition of a single column within a collection schema. */
export interface ColumnDefinition {
  /** Column name (must match /^[a-zA-Z_][a-zA-Z0-9_]*$/). */
  name: string;
  /** SQLite column type. */
  type: ColumnType;
  /** If true, the column cannot be NULL. */
  required?: boolean;
  /** Default value (SQL expression or literal). */
  default?: string | number | boolean | null;
  /** If true, values must be unique across all records. */
  unique?: boolean;
}

/** Full schema definition for a collection. */
export interface CollectionSchema {
  /** Collection (table) name. */
  name: string;
  /** Column definitions. */
  columns: ColumnDefinition[];
  /** Whether this is a system-internal collection. */
  system?: boolean;
}

/** Runtime information about an existing collection. */
export interface CollectionInfo {
  /** Collection name. */
  name: string;
  /** Column definitions (from PRAGMA table_info). */
  schema: ColumnDefinition[];
  /** Total number of records in the collection. */
  recordCount: number;
  /** ISO-8601 timestamp of when the collection was created. */
  createdAt: string;
  /** ISO-8601 timestamp of the last schema change. */
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// API envelope
// ---------------------------------------------------------------------------

/**
 * Standard API response envelope used by all Boltstore endpoints.
 *
 * ```ts
 * // Success
 * { data: {...}, meta: {...} }
 *
 * // Error
 * { error: { code: "NOT_FOUND", message: "..." } }
 * ```
 */
export interface ApiResponse<T = unknown> {
  data?: T;
  meta?: Record<string, unknown>;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

/** Regex for valid table/column names. */
export const VALID_IDENTIFIER = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

/**
 * Validate that a table or column name is a safe SQL identifier.
 * Throws if the name is invalid.
 */
export function validateIdentifier(name: string, label: string): void {
  if (!VALID_IDENTIFIER.test(name)) {
    throw new Error(
      `Invalid ${label} "${name}". Must start with a letter or underscore and contain only letters, numbers, and underscores.`
    );
  }
  // Prevent overly long identifiers
  if (name.length > 128) {
    throw new Error(`${label} "${name}" exceeds 128 characters.`);
  }
}

/** Reserved table names that users cannot create/delete. */
export const RESERVED_TABLE_NAMES = new Set([
  "_collections",
  "_migrations",
  "_users",
  "_tokens",
  "_api_keys",
  "_webhooks",
  "_jobs",
  "sqlite_master",
  "sqlite_sequence",
  "sqlite_stat1",
]);

/**
 * Check whether a table name is a reserved/system table.
 */
export function isReservedTable(name: string): boolean {
  return RESERVED_TABLE_NAMES.has(name) || name.startsWith("sqlite_");
}