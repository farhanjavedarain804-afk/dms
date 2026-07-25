// MySQL auth token reader - reads the MySQL session token from localStorage
const SESSION_TOKEN_KEY = "dms_session_token";

export function readStoredSupabaseAccessToken(): string | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    return localStorage.getItem(SESSION_TOKEN_KEY) ?? undefined;
  } catch {
    return undefined;
  }
}