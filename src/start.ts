import { createStart, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
import { attachStoredSupabaseAuth } from "@/lib/stored-supabase-auth";
import { attachAuth } from "@/lib/auth-attacher";

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    const msg = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack ?? '' : '';
    console.error('[start.ts requestMiddleware]', msg, stack);
    return new Response(renderErrorPage(msg, stack), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

export const startInstance = createStart(() => ({
  functionMiddleware: [attachAuth, attachStoredSupabaseAuth],
  requestMiddleware: [errorMiddleware],
}));
