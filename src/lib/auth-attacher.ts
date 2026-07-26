// MySQL-backed auth attacher for TanStack Start server functions.
// Reads the session token from localStorage and attaches it as a Bearer header.
import { createMiddleware } from '@tanstack/react-start'

const SESSION_TOKEN_KEY = "dms_session_token";

export const attachAuth = createMiddleware({ type: 'function' }).client(
  async ({ next }) => {
    let token: string | null = null;
    try {
      token = typeof window !== 'undefined' ? localStorage.getItem(SESSION_TOKEN_KEY) : null;
    } catch {}
    return next({
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  },
)
