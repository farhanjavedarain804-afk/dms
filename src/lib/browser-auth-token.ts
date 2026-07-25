function looksLikeJwt(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value.trim());
}

function extractToken(value: unknown, depth = 0): string | undefined {
  if (depth > 4 || value == null) return undefined;
  if (looksLikeJwt(value)) return value.trim();
  if (typeof value === "string") {
    try {
      return extractToken(JSON.parse(value), depth + 1);
    } catch {
      return undefined;
    }
  }
  if (typeof value !== "object") return undefined;

  const obj = value as Record<string, unknown>;
  for (const key of ["access_token", "accessToken", "token"]) {
    if (looksLikeJwt(obj[key])) return String(obj[key]).trim();
  }
  for (const key of ["currentSession", "session", "data", "auth"]) {
    const token = extractToken(obj[key], depth + 1);
    if (token) return token;
  }
  return undefined;
}

export function readStoredSupabaseAccessToken(): string | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const keys = Object.keys(window.localStorage).filter((key) =>
      key.startsWith("sb-") && key.endsWith("-auth-token"),
    );
    for (const key of keys) {
      const token = extractToken(window.localStorage.getItem(key));
      if (token) return token;
    }
  } catch {
    return undefined;
  }
  return undefined;
}