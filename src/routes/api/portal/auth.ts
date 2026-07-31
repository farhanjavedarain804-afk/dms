import { createAPIFileRoute } from '@tanstack/react-start/api';
import { ensureAuthTables, signIn, signOut, getSession } from '@/lib/mysql-auth';
import { db, rpc } from '@/lib/db';

export const APIRoute = createAPIFileRoute('/api/portal/auth')({
  POST: async ({ request }) => {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    try {
      const body = await request.json();
      const { action, payload } = body;

      const headers = {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      };

      const { $signIn, $registerPortalClient, $generateClientSecurityKey, $verifyClientSecurityKey, $getSession, $signOut } = await import('@/lib/mysql-api');
      
      const authHeader = request.headers.get('Authorization');
      let token = '';
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
      }

      if (action === 'login') return new Response(JSON.stringify(await $signIn({ data: payload })), { status: 200, headers });
      if (action === 'register') return new Response(JSON.stringify(await $registerPortalClient({ data: payload })), { status: 200, headers });
      if (action === 'generateKey') return new Response(JSON.stringify(await $generateClientSecurityKey({ data: payload })), { status: 200, headers });
      if (action === 'verifyKey') return new Response(JSON.stringify(await $verifyClientSecurityKey({ data: payload })), { status: 200, headers });
      if (action === 'getSession') return new Response(JSON.stringify(await $getSession({ data: { token } })), { status: 200, headers });
      if (action === 'signOut') return new Response(JSON.stringify(await $signOut({ data: { token } })), { status: 200, headers });

      return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400, headers });
    } catch (err: any) {
      return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
  },
  OPTIONS: async () => {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }
});
