// MySQL-backed auth middleware for TanStack Start server functions.
import { createMiddleware } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { getSession } from '@/lib/mysql-auth'

export const requireSupabaseAuth = createMiddleware({ type: 'function' }).server(
  async ({ next }) => {
    const request = getRequest();

    if (!request?.headers) {
      throw new Error('Unauthorized: No request headers available');
    }

    const authHeader = request.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('Unauthorized: No authorization header provided');
    }

    const token = authHeader.replace('Bearer ', '').trim();
    if (!token) {
      throw new Error('Unauthorized: No token provided');
    }

    const session = await getSession(token);
    if (!session) {
      throw new Error('Unauthorized: Invalid or expired session');
    }

    return next({
      context: {
        userId: String(session.user.id),
        user: session.user,
        // Keep supabase key in context for backward compatibility with existing server functions
        supabase: null,
        claims: { sub: String(session.user.id), email: session.user.email, role: session.user.role },
      },
    });
  },
);
