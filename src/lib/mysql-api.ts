/**
 * mysql-api.ts
 *
 * TanStack Start server functions that replace direct db.from() calls.
 * All DB access is server-side only – never exposes MySQL credentials to the client.
 */

import { createServerFn } from '@tanstack/react-start';
import { db, rpc } from '@/lib/db';
import { signIn, signOut, getSession, ensureAuthTables, createUser, listUsers, getUserById } from '@/lib/mysql-auth';

// ── Auth server functions ─────────────────────────────────────────────────────

export const $signIn = createServerFn({ method: 'POST' })
  .validator((data: { email: string; password: string }) => data)
  .handler(async ({ data }) => {
    await ensureAuthTables();
    return signIn(data.email, data.password);
  });

export const $signOut = createServerFn({ method: 'POST' })
  .validator((data: { token: string }) => data)
  .handler(async ({ data }) => {
    await signOut(data.token);
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
    await ensureAuthTables();
    return createUser(data.email, data.password, data.name, data.role);
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
