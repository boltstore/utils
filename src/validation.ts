export const VALID_IDENTIFIER = /^[a-zA-Z_][a-zA-Z0-9_-]*$/;

/** ID prefixes for system tables — used for easy debugging and consistency. */
export const ID_PREFIXES = {
  user: "usr",
  token: "tok",
  apiKey: "key",
  apiKeySecret: "blt",
  database: "dbs",
  backup: "bkp",
  auditLog: "log",
  collection: "col",
  migration: "mig",
  record: "rec",
  requestId: "req",
} as const;

export function generateSecureId(prefix: string): string {
  const random = new Uint8Array(22);
  crypto.getRandomValues(random);
  const randomB64 = btoa(String.fromCharCode(...random)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `${prefix}_${randomB64}`;
}

export function validateIdentifier(name: string, label: string): void {
    if (!VALID_IDENTIFIER.test(name)) {
      throw new Error(
        `Invalid ${label} "${name}". Must start with a letter or underscore and contain only letters, numbers, and underscores.`
      );
    }
    if (name.length > 128) {
      throw new Error(`${label} "${name}" exceeds 128 characters.`);
    }
  }

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

export function isReservedTable(name: string): boolean {
  return RESERVED_TABLE_NAMES.has(name) || name.startsWith("sqlite_");
}