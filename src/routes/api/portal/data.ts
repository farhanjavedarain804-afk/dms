import { createAPIFileRoute } from '@tanstack/react-start/api';
import { getSession } from '@/lib/mysql-auth';
import { db, rpc } from '@/lib/db';

export const APIRoute = createAPIFileRoute('/api/portal/data')({
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
      // Authenticate
      const authHeader = request.headers.get('Authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
      }
      const token = authHeader.split(' ')[1];
      const session = await getSession(token);
      if (!session || !session.user) {
        return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401 });
      }
      
      const clientId = session.user.id;

      const body = await request.json();
      const { action, payload } = body;

      const headers = {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      };

      // We dynamically import the DMS mysql-api to execute these securely on the server
      const { $dbList, $dbGet, $dbCreate, $dbUpdate, $dbDelete, $dbCustomQuery, $dbCount, $rpc } = await import('@/lib/mysql-api');

      if (action === 'dbList') return new Response(JSON.stringify(await $dbList({ data: payload })), { status: 200, headers });
      if (action === 'dbGet') return new Response(JSON.stringify(await $dbGet({ data: payload })), { status: 200, headers });
      if (action === 'dbCreate') return new Response(JSON.stringify(await $dbCreate({ data: payload })), { status: 200, headers });
      if (action === 'dbUpdate') return new Response(JSON.stringify(await $dbUpdate({ data: payload })), { status: 200, headers });
      if (action === 'dbDelete') return new Response(JSON.stringify(await $dbDelete({ data: payload })), { status: 200, headers });
      if (action === 'dbCustomQuery') return new Response(JSON.stringify(await $dbCustomQuery({ data: payload })), { status: 200, headers });
      if (action === 'dbCount') return new Response(JSON.stringify(await $dbCount({ data: payload })), { status: 200, headers });
      if (action === 'rpc') return new Response(JSON.stringify(await $rpc({ data: payload })), { status: 200, headers });



      return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400, headers });
    } catch (err: any) {
      return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } });
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
