/**
 * MySQL migration: Supabase admin client stub.
 *
 * All server-side DB access has been migrated to MySQL via src/lib/db.ts.
 * This file is a compatibility stub to avoid breaking any remaining imports.
 */

import { db } from '@/lib/db';
import { query, execute, queryOne } from '@/lib/mysql';

// Export the MySQL db helper as the admin interface
export const supabaseAdmin = new Proxy({} as any, {
  get(_, prop) {
    if (prop === 'from') {
      return (table: string) => db(table);
    }
    if (prop === 'auth') {
      return {
        getUser: async () => ({ data: { user: null }, error: new Error('Supabase removed. Use MySQL auth.') }),
        admin: {
          listUsers: async () => ({ data: { users: [] }, error: null }),
          getUserById: async () => ({ data: { user: null }, error: null }),
        },
      };
    }
    if (prop === 'storage') {
      return {
        from: () => ({
          upload: async () => ({ error: new Error('Storage migrated.') }),
          remove: async () => ({ error: null }),
          createSignedUrl: async () => ({ data: null, error: new Error('Storage migrated.') }),
        }),
      };
    }
    return undefined;
  },
});

// Also export the raw MySQL helpers for server-side code that needs them
export { db, query, execute, queryOne };
