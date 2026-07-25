import { createMiddleware } from "@tanstack/react-start";
import { readStoredSupabaseAccessToken } from "./browser-auth-token";

export { readStoredSupabaseAccessToken };

export const attachStoredSupabaseAuth = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    const token = readStoredSupabaseAccessToken();
    return next({ headers: token ? { Authorization: `Bearer ${token}` } : {} });
  },
);