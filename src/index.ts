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
// Record type
// ---------------------------------------------------------------------------

/**
 * A record stored in a Boltstore collection.
 *
 * Every record includes system-managed `id`, `created_at`, and `updated_at`
 * fields. User-defined fields are accessed via the generic parameter or
 * dynamic keys.
 *
 * @example
 * ```ts
 * type User = BoltstoreRecord<{ name: string; age: number }>;
 * const user: User = { id: "rec_...", name: "Alice", age: 30, created_at: "...", updated_at: "..." };
 * ```
 */
export interface BoltstoreRecord<Fields = Record<string, unknown>> {
  /** Unique record identifier. */
  id: string;
  /** ISO-8601 timestamp of when the record was created. */
  created_at: string;
  /** ISO-8601 timestamp of the last update. */
  updated_at: string;
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
// Database info
// ---------------------------------------------------------------------------

/** Information about a registered application database. */
export interface DatabaseInfo {
  /** Application (database) name. */
  name: string;
  /** Path to the SQLite file. */
  path: string;
  /** ISO-8601 timestamp of when the database was created. */
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Filter DSL
// ---------------------------------------------------------------------------

/** Filter operators supported by the Boltstore query engine. */
export type FilterOperator =
  | "eq"
  | "neq"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "in"
  | "nin"
  | "contains"
  | "startsWith"
  | "endsWith"
  | "exists"
  | "regexp";

/** A single filter condition. */
export interface FilterCondition {
  [field: string]: unknown | { [op in FilterOperator]?: unknown };
}

/** A logical grouping of filter conditions. */
export interface FilterGroup {
  and?: Filter[];
  or?: Filter[];
  not?: Filter;
}

/** A filter is either a single condition or a group. */
export type Filter = FilterCondition | FilterGroup;

// ---------------------------------------------------------------------------
// Sort
// ---------------------------------------------------------------------------

/** Sort specification for a single field. */
export interface SortSpec {
  /** Field name. */
  field: string;
  /** Sort direction. */
  direction: "asc" | "desc";
}

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

/** Offset-based pagination metadata returned by the server. */
export interface PaginationMeta {
  /** Current page number (1-based). */
  page: number;
  /** Items per page. */
  perPage: number;
  /** Total number of items matching the query. */
  total: number;
  /** Total number of pages. */
  totalPages: number;
}

/** Options for listing records with pagination, filtering, and sorting. */
export interface ListOptions {
  /** Filter criteria. */
  filter?: Record<string, unknown>;
  /** Sort field. */
  sort?: string;
  /** Sort direction. */
  direction?: "asc" | "desc";
  /** Maximum number of records to return. */
  limit?: number;
  /** Number of records to skip (for offset pagination). */
  offset?: number;
  /** Specific fields to return (reduces payload size). */
  fields?: string[];
  /** Related collections to expand (foreign key joins). */
  expand?: string[];
}

/** Options for advanced queries using the query DSL. */
export interface QueryOptions {
  /** Target collection. */
  collection: string;
  /** Filter criteria (filter DSL). */
  filter?: Filter;
  /** Sort specifications. */
  sort?: SortSpec[];
  /** Specific fields to return. */
  fields?: string[];
  /** Maximum number of records to return. */
  limit?: number;
  /** Number of records to skip. */
  offset?: number;
  /** Full-text search term. */
  search?: string;
  /** Aggregate specification. */
  aggregate?: {
    [field: string]: "count" | "sum" | "avg" | "min" | "max" | { alias: string; field: string };
  };
  /** Field to group by. */
  groupBy?: string;
  /** Post-aggregation filter. */
  having?: Filter;
}

// ---------------------------------------------------------------------------
// Batch operations
// ---------------------------------------------------------------------------

/** A single batch operation. */
export interface BatchOperation {
  /** Operation type. */
  action: "create" | "update" | "delete";
  /** Record ID (required for update/delete). */
  id?: string;
  /** Record data (required for create, optional for update). */
  data?: Record<string, unknown>;
}

/** Result of a batch operation. */
export interface BatchResult {
  /** Number of records created. */
  created: number;
  /** Number of records updated. */
  updated: number;
  /** Number of records deleted. */
  deleted: number;
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