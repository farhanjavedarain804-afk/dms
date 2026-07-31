/**
 * mysql-api.ts
 *
 * TanStack Start server functions that replace direct db.from() calls.
 * All DB access is server-side only – never exposes MySQL credentials to the client.
 */

import { createServerFn } from '@tanstack/react-start';
import { db, rpc } from '@/lib/db';
import { signIn, signOut, getSession, ensureAuthTables, createUser, listUsers, getUserById, setLoginPin, generateClientSecurityKey, verifyClientSecurityKey } from '@/lib/mysql-auth';

// ── Auth server functions ─────────────────────────────────────────────────────

export const $signIn = createServerFn({ method: 'POST' })
  .validator((data: { email: string; password: string }) => data)
  .handler(async ({ data }) => {
    try {
      await ensureAuthTables();
      return await signIn(data.email, data.password);
    } catch (err: any) {
      console.error('[signIn] Error:', err?.message ?? err);
      throw new Error(err?.message ?? 'Database connection failed. Please contact support.');
    }
  });

export const $signOut = createServerFn({ method: 'POST' })
  .validator((data: { token: string }) => data)
  .handler(async ({ data }) => {
    try {
      await signOut(data.token);
    } catch (err: any) {
      console.error('[signOut] Error:', err?.message ?? err);
    }
    return { ok: true };
  });

export const $getSession = createServerFn({ method: 'GET' })
  .validator((data: { token: string }) => data)
  .handler(async ({ data }) => {
    try {
      await ensureAuthTables();
      return await getSession(data.token);
    } catch (err) {
      console.error('[getSession] DB error:', err);
      return null; // return null so auth context knows user is not logged in
    }
  });

export const $createUser = createServerFn({ method: 'POST' })
  .validator((data: { email: string; password: string; name: string; role?: string }) => data)
  .handler(async ({ data }) => {
    try {
      await ensureAuthTables();
      return await createUser(data.email, data.password, data.name, data.role);
    } catch (err: any) {
      console.error('[createUser] Error:', err?.message ?? err);
      throw new Error(err?.message ?? 'Failed to create user.');
    }
  });

export const $registerPortalClient = createServerFn({ method: 'POST' })
  .validator((data: { email: string; password: string; name: string; phone: string; company?: string; type: 'business' | 'individual' }) => data)
  .handler(async ({ data }) => {
    try {
      await ensureAuthTables();
      // 1. Create the auth user (this will throw if email exists)
      const user = await createUser(data.email, data.password, data.name, 'Client');
      
      // 2. Insert into clients_v2 table
      await db('clients_v2').insert({
        name: data.name,
        company: data.company || null,
        email: data.email,
        phone: data.phone,
        stage: 'Lead/New',
      });
      
      return { ok: true, user };
    } catch (err: any) {
      console.error('[registerPortalClient] Error:', err?.message ?? err);
      throw new Error(err?.message ?? 'Failed to register client.');
    }
  });

export const $listUsers = createServerFn({ method: 'GET' })
  .handler(async () => {
    await ensureAuthTables();
    return listUsers();
  });

export const $getUserById = createServerFn({ method: 'GET' })
  .validator((data: { id: number }) => data)
  .handler(async ({ data }) => {
    return getUserById(data.id);
  });

export const $setLoginPin = createServerFn({ method: 'POST' })
  .validator((data: { userId: number; pin: string }) => data)
  .handler(async ({ data }) => {
    try {
      await ensureAuthTables();
      await setLoginPin(data.userId, data.pin);
      return { ok: true };
    } catch (err: any) {
      console.error('[setLoginPin] Error:', err?.message ?? err);
      throw new Error(err?.message ?? 'Failed to set login PIN.');
    }
  });

export const $generateClientSecurityKey = createServerFn({ method: 'POST' })
  .validator((data: { userId: number }) => data)
  .handler(async ({ data }) => {
    try {
      await ensureAuthTables();
      const rawKey = await generateClientSecurityKey(data.userId);
      return { key: rawKey };
    } catch (err: any) {
      console.error('[generateClientSecurityKey] Error:', err?.message ?? err);
      throw new Error(err?.message ?? 'Failed to generate security key.');
    }
  });

export const $verifyClientSecurityKey = createServerFn({ method: 'POST' })
  .validator((data: { userId: number; key: string }) => data)
  .handler(async ({ data }) => {
    try {
      const valid = await verifyClientSecurityKey(data.userId, data.key);
      return { valid };
    } catch (err: any) {
      console.error('[verifyClientSecurityKey] Error:', err?.message ?? err);
      return { valid: false };
    }
  });

// ── Generic CRUD server functions ─────────────────────────────────────────────

export const $dbList = createServerFn({ method: 'GET' })
  .validator((data: { table: string; orderBy?: string; ascending?: boolean; limit?: number; filters?: { col: string; op: string; val: any }[] }) => data)
  .handler(async ({ data }) => {
    try {
      let q = db(data.table).select('*');
      if (data.filters) {
        for (const f of data.filters) {
          if (f.op === 'eq') q = q.eq(f.col, f.val);
          else if (f.op === 'neq') q = q.neq(f.col, f.val);
          else if (f.op === 'gte') q = q.gte(f.col, f.val);
          else if (f.op === 'lte') q = q.lte(f.col, f.val);
          else if (f.op === 'gt') q = q.gt(f.col, f.val);
          else if (f.op === 'lt') q = q.lt(f.col, f.val);
          else if (f.op === 'ilike') q = q.ilike(f.col, f.val);
          else if (f.op === 'in') q = q.in(f.col, f.val);
        }
      }
      if (data.orderBy) q = q.order(data.orderBy, { ascending: data.ascending ?? false });
      if (data.limit) q = q.limit(data.limit);
      const { data: rows, error } = await q;
      if (error) { console.error(`[$dbList] ${data.table}:`, error.message); return []; }
      return rows ?? [];
    } catch (err: any) {
      console.error(`[$dbList] ${data.table}:`, err?.message);
      return [];
    }
  });

export const $dbGet = createServerFn({ method: 'GET' })
  .validator((data: { table: string; id: number | string }) => data)
  .handler(async ({ data }) => {
    try {
      const { data: row, error } = await db(data.table).select('*').eq('id', data.id).single();
      if (error) { console.error(`[$dbGet] ${data.table}:`, error.message); return null; }
      return row;
    } catch (err: any) {
      console.error(`[$dbGet] ${data.table}:`, err?.message);
      return null;
    }
  });

export const $dbCreate = createServerFn({ method: 'POST' })
  .validator((data: { table: string; body: Record<string, any> }) => data)
  .handler(async ({ data }) => {
    const { data: row, error } = await db(data.table).insert(data.body).returning('*').single();
    if (error) throw error;
    return row;
  });

export const $dbUpdate = createServerFn({ method: 'POST' })
  .validator((data: { table: string; id: number | string; body: Record<string, any> }) => data)
  .handler(async ({ data }) => {
    const { data: row, error } = await db(data.table).update(data.body).eq('id', data.id).returning('*').single();
    if (error) throw error;
    return row;
  });

export const $dbDelete = createServerFn({ method: 'POST' })
  .validator((data: { table: string; id: number | string }) => data)
  .handler(async ({ data }) => {
    const { error } = await db(data.table).delete().eq('id', data.id);
    if (error) throw error;
    return { ok: true };
  });

export const $dbCount = createServerFn({ method: 'GET' })
  .validator((data: { table: string; filters?: { col: string; op: string; val: any }[] }) => data)
  .handler(async ({ data }) => {
    try {
      let q = db(data.table).select('*', { count: 'exact', head: true });
      if (data.filters) {
        for (const f of data.filters) {
          if (f.op === 'eq') q = q.eq(f.col, f.val);
        }
      }
      const { count, error } = await q;
      if (error) { console.error(`[$dbCount] ${data.table}:`, error.message); return 0; }
      return count ?? 0;
    } catch (err: any) {
      console.error(`[$dbCount] ${data.table}:`, err?.message);
      return 0;
    }
  });

export const $dbCustomQuery = createServerFn({ method: 'POST' })
  .validator((data: { table: string; columns?: string; filters?: { col: string; op: string; val: any }[]; orderBy?: string; ascending?: boolean; limit?: number }) => data)
  .handler(async ({ data }) => {
    try {
      let q = db(data.table).select(data.columns ?? '*');
      if (data.filters) {
        for (const f of data.filters) {
          if (f.op === 'eq') q = q.eq(f.col, f.val);
          else if (f.op === 'neq') q = q.neq(f.col, f.val);
          else if (f.op === 'gte') q = q.gte(f.col, f.val);
          else if (f.op === 'lte') q = q.lte(f.col, f.val);
          else if (f.op === 'gt') q = q.gt(f.col, f.val);
          else if (f.op === 'lt') q = q.lt(f.col, f.val);
          else if (f.op === 'ilike') q = q.ilike(f.col, f.val);
          else if (f.op === 'in') q = q.in(f.col, f.val);
        }
      }
      if (data.orderBy) q = q.order(data.orderBy, { ascending: data.ascending ?? true });
      if (data.limit) q = q.limit(data.limit);
      const { data: rows, error } = await q;
      if (error) { console.error(`[$dbCustomQuery] ${data.table}:`, error.message); return []; }
      return rows ?? [];
    } catch (err: any) {
      console.error(`[$dbCustomQuery] ${data.table}:`, err?.message);
      return [];
    }
  });

export const $rpc = createServerFn({ method: 'POST' })
  .validator((data: { fnName: string; args?: Record<string, any> }) => data)
  .handler(async ({ data }) => {
    const { fnName, args = {} } = data;
    
    // Custom implementation of common database functions
    if (fnName === 'is_admin') {
      const userId = args._user_id;
      if (!userId) return false;
      const { data: user } = await db('app_users').select('role').eq('id', userId).single();
      return user?.role === 'Super Admin' || user?.role === 'Admin';
    }

    // Default: call MySQL stored procedure if any
    const { data: res, error } = await rpc(fnName, args);
    if (error) throw error;
    return res;
  });
