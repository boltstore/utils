export const SAFE_PATH_COMPONENT = /^[a-zA-Z0-9._-]+$/;

export function sanitizePathComponent(input: string): string {
  return input.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/^\.+/, "");
}

function normalizePath(p: string): string {
  let path = p.replace(/\\/g, "/").replace(/\/+/g, "/");
  const absolute = path.startsWith("/");
  const parts = path.split("/").filter(Boolean);
  const stack: string[] = [];
  for (const part of parts) {
    if (part === "..") {
      if (!absolute && (stack.length === 0 || stack[stack.length - 1] === "..")) {
        stack.push("..");
      } else if (stack.length > 0 && stack[stack.length - 1] !== "..") {
        stack.pop();
      }
    } else if (part !== "." && part !== "") {
      stack.push(part);
    }
  }
  let normalized = stack.join("/");
  if (absolute) normalized = "/" + normalized;
  return normalized || ".";
}

export function resolveSafePath(baseDir: string, relative: string): string {
  const normalizedBase = normalizePath(baseDir).replace(/\/$/, "");
  const resolved = relative.startsWith("/")
    ? normalizePath(relative)
    : normalizePath(`${normalizedBase}/${relative}`);
  if (resolved !== normalizedBase && !resolved.startsWith(`${normalizedBase}/`)) {
    throw new Error(`Path traversal detected: "${relative}" resolves outside base directory.`);
  }
  return resolved;
}
