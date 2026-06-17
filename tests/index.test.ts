/**
 * Unit tests for shared utilities in @boltstore/utils.
 */

import { describe, expect, test } from "bun:test";
import {
  validateIdentifier,
  isReservedTable,
  generateSecureId,
  sanitizePathComponent,
  resolveSafePath,
  SAFE_PATH_COMPONENT,
} from "../src/index";

describe("validateIdentifier", () => {
  test("accepts valid identifiers", () => {
    validateIdentifier("users", "table");
    validateIdentifier("_internal", "column");
    validateIdentifier("col123", "column");
  });

  test("rejects identifiers starting with a digit", () => {
    expect(() => validateIdentifier("123bad", "table")).toThrow();
  });

  test("rejects identifiers with invalid characters", () => {
    expect(() => validateIdentifier("my table", "table")).toThrow();
    expect(() => validateIdentifier("col-name", "column")).toThrow();
  });

  test("rejects overly long identifiers", () => {
    expect(() => validateIdentifier("a".repeat(129), "table")).toThrow();
  });
});

describe("isReservedTable", () => {
  test("returns true for reserved system names", () => {
    expect(isReservedTable("_users")).toBe(true);
    expect(isReservedTable("sqlite_master")).toBe(true);
    expect(isReservedTable("sqlite_sequence")).toBe(true);
  });

  test("returns false for user tables", () => {
    expect(isReservedTable("customers")).toBe(false);
  });
});

describe("generateSecureId", () => {
  test("returns a prefixed id", () => {
    const id = generateSecureId("rec");
    expect(id.startsWith("rec_")).toBe(true);
    expect(id.length).toBeGreaterThan(20);
  });

  test("returns unique ids", () => {
    const ids = new Set(Array.from({ length: 20 }, () => generateSecureId("rec")));
    expect(ids.size).toBe(20);
  });
});

describe("sanitizePathComponent", () => {
  test("allows safe characters", () => {
    expect(sanitizePathComponent("my_app_1.2")).toBe("my_app_1.2");
  });

  test("replaces unsafe characters", () => {
    expect(sanitizePathComponent("my app")).toBe("my_app");
    expect(sanitizePathComponent("../etc")).toBe("_etc");
  });

  test("strips leading dots", () => {
    expect(sanitizePathComponent("..hidden")).toBe("hidden");
  });
});

describe("resolveSafePath", () => {
  test("resolves a normal relative path", () => {
    expect(resolveSafePath("/data", "myapp/backups")).toBe("/data/myapp/backups");
  });

  test("allows the base directory itself", () => {
    expect(resolveSafePath("/data", ".")).toBe("/data");
  });

  test("detects path traversal", () => {
    expect(() => resolveSafePath("/data", "../etc/passwd")).toThrow();
    expect(() => resolveSafePath("/data", "myapp/../../etc")).toThrow();
  });

  test("detects absolute paths outside base", () => {
    expect(() => resolveSafePath("/data", "/etc/passwd")).toThrow();
  });
});
