/**
 * db.ts — MySQL-backed query abstraction
 *
 * Provides a supabase-like CRUD interface on top of mysql2 so that the
 * rest of the codebase can be migrated gradually while keeping the same
 * data-access patterns.
 *
 * Usage:
 *   import { db } from '@/lib/db';
 *   const rows = await db('employees').select('*');
 *   const row  = await db('employees').select('*').eq('id', 1).single();
 *   await db('employees').insert({ name: 'Alice' });
 *   await db('employees').update({ name: 'Bob' }).eq('id', 1);
 *   await db('employees').delete().eq('id', 1);
 */

import { query, execute } from './mysql';

type OrderDir = 'asc' | 'desc';
type CountMode = 'exact' | 'estimated';

interface QueryOptions {
  count?: CountMode;
  head?: boolean;
}

class QueryBuilder<T = any> {
  private _table: string;
  private _columns: string = '*';
  private _wheres: string[] = [];
  private _vals: any[] = [];
  private _limit?: number;
  private _order?: { col: string; dir: OrderDir };
  private _isSingle = false;
  private _isCount = false;
  private _isHead = false;

  constructor(table: string) {
    this._table = `\`${table}\``;
  }

  // ── Projection ──────────────────────────────────────────────────────────
  select(cols: string, opts?: QueryOptions): this {
    this._columns = cols === '*' ? '*' : cols.split(',').map(c => `\`${c.trim()}\``).join(', ');
    if (opts?.count) this._isCount = true;
    if (opts?.head) this._isHead = true;
    return this;
  }

  // ── Filters ──────────────────────────────────────────────────────────────
  eq(col: string, val: any): this {
    this._wheres.push(`\`${col}\` = ?`);
    this._vals.push(val);
    return this;
  }

  neq(col: string, val: any): this {
    this._wheres.push(`\`${col}\` != ?`);
    this._vals.push(val);
    return this;
  }

  gt(col: string, val: any): this {
    this._wheres.push(`\`${col}\` > ?`);
    this._vals.push(val);
    return this;
  }

  gte(col: string, val: any): this {
    this._wheres.push(`\`${col}\` >= ?`);
    this._vals.push(val);
    return this;
  }

  lt(col: string, val: any): this {
    this._wheres.push(`\`${col}\` < ?`);
    this._vals.push(val);
    return this;
  }

  lte(col: string, val: any): this {
    this._wheres.push(`\`${col}\` <= ?`);
    this._vals.push(val);
    return this;
  }

  like(col: string, pattern: string): this {
    this._wheres.push(`\`${col}\` LIKE ?`);
    this._vals.push(pattern);
    return this;
  }

  ilike(col: string, pattern: string): this {
    this._wheres.push(`LOWER(\`${col}\`) LIKE LOWER(?)`);
    this._vals.push(pattern);
    return this;
  }

  in(col: string, vals: any[]): this {
    if (!vals.length) return this;
    this._wheres.push(`\`${col}\` IN (${vals.map(() => '?').join(',')})`);
    this._vals.push(...vals);
    return this;
  }

  is(col: string, val: null | boolean): this {
    if (val === null) {
      this._wheres.push(`\`${col}\` IS NULL`);
    } else {
      this._wheres.push(`\`${col}\` = ?`);
      this._vals.push(val ? 1 : 0);
    }
    return this;
  }

  // ── Sorting & Limiting ────────────────────────────────────────────────────
  order(col: string, opts?: { ascending?: boolean }): this {
    this._order = { col, dir: opts?.ascending === false ? 'desc' : 'asc' };
    return this;
  }

  limit(n: number): this {
    this._limit = n;
    return this;
  }

  // ── Fetch modifiers ───────────────────────────────────────────────────────
  single(): this {
    this._isSingle = true;
    this._limit = 1;
    return this;
  }

  // ── Write builders ────────────────────────────────────────────────────────
  private _insertData?: Record<string, any> | Record<string, any>[];
  private _updateData?: Record<string, any>;
  private _isDelete = false;
  private _afterWrite?: string; // columns to select back

  insert(data: Record<string, any> | Record<string, any>[]): this {
    this._insertData = data;
    return this;
  }

  update(data: Record<string, any>): this {
    this._updateData = data;
    return this;
  }

  delete(): this {
    this._isDelete = true;
    return this;
  }

  /** Mirror of Supabase's .select() after insert/update — tells us what to return */
  returning(cols = '*'): this {
    this._afterWrite = cols;
    return this;
  }

  // ── Execute ───────────────────────────────────────────────────────────────
  private _buildWhere() {
    return this._wheres.length ? `WHERE ${this._wheres.join(' AND ')}` : '';
  }

  /** Thenable: execute and return { data, error, count } */
  then(
    resolve: (result: { data: T | T[] | null; error: null | Error; count?: number | null }) => void,
    reject?: (err: any) => void
  ): void {
    this._run().then(resolve, reject);
  }

  private async _run(): Promise<{ data: T | T[] | null; error: null | Error; count?: number | null }> {
    try {
      // ── COUNT / HEAD ────────────────────────────────────────────────────
      if (this._isCount && !this._insertData && !this._updateData && !this._isDelete) {
        const whereClause = this._buildWhere();
        const countSql = `SELECT COUNT(*) AS cnt FROM ${this._table} ${whereClause}`;
        const rows = await query(countSql, this._vals);
        const count = (rows[0] as any)?.cnt ?? 0;
        if (this._isHead) return { data: null, error: null, count };
        return { data: [], error: null, count };
      }

      // ── INSERT ──────────────────────────────────────────────────────────
      if (this._insertData !== undefined) {
        const rows = Array.isArray(this._insertData) ? this._insertData : [this._insertData];
        const keys = Object.keys(rows[0]);
        const cols = keys.map(k => `\`${k}\``).join(', ');
        const placeholderRow = `(${keys.map(() => '?').join(', ')})`;
        const allPlaceholders = rows.map(() => placeholderRow).join(', ');
        const values = rows.flatMap(r => keys.map(k => serializeVal(r[k])));
        const sql = `INSERT INTO ${this._table} (${cols}) VALUES ${allPlaceholders}`;
        const result = await execute(sql, values);
        const insertId = result.insertId;

        if (this._afterWrite !== undefined || this._isSingle) {
          // For single insert: fetch the created row
          if (!Array.isArray(this._insertData)) {
            const back = await query(`SELECT * FROM ${this._table} WHERE id = ?`, [insertId]);
            const row = back[0] ?? null;
            return { data: this._isSingle ? row : (row ? [row] : []), error: null };
          }
          // For bulk insert we can't easily fetch all in MySQL 5.x, just return minimal
          return { data: rows as any, error: null };
        }
        return { data: null, error: null };
      }

      // ── UPDATE ──────────────────────────────────────────────────────────
      if (this._updateData !== undefined) {
        const keys = Object.keys(this._updateData);
        const setClauses = keys.map(k => `\`${k}\` = ?`).join(', ');
        const setVals = keys.map(k => serializeVal(this._updateData![k]));
        const whereClause = this._buildWhere();
        const sql = `UPDATE ${this._table} SET ${setClauses} ${whereClause}`;
        await execute(sql, [...setVals, ...this._vals]);

        if (this._afterWrite !== undefined || this._isSingle) {
          const back = await query(`SELECT * FROM ${this._table} ${whereClause}`, this._vals);
          const result = this._isSingle ? (back[0] ?? null) : back;
          return { data: result as any, error: null };
        }
        return { data: null, error: null };
      }

      // ── DELETE ──────────────────────────────────────────────────────────
      if (this._isDelete) {
        const whereClause = this._buildWhere();
        if (!whereClause) throw new Error('DELETE without WHERE is not allowed');
        
        let deletedRows: any[] = [];
        if (this._afterWrite !== undefined) {
          deletedRows = await query(`SELECT * FROM ${this._table} ${whereClause}`, this._vals);
        }
        
        const sql = `DELETE FROM ${this._table} ${whereClause}`;
        await execute(sql, this._vals);
        return { data: deletedRows.length > 0 ? deletedRows : null, error: null };
      }

      // ── SELECT ──────────────────────────────────────────────────────────
      const whereClause = this._buildWhere();
      const orderClause = this._order
        ? `ORDER BY \`${this._order.col}\` ${this._order.dir.toUpperCase()}`
        : 'ORDER BY id DESC';
      const limitClause = this._limit !== undefined ? `LIMIT ${this._limit}` : '';
      const sql = `SELECT ${this._columns} FROM ${this._table} ${whereClause} ${orderClause} ${limitClause}`;
      const rows = await query<T>(sql, this._vals);

      if (this._isSingle) {
        const row = (rows as any[])[0] ?? null;
        if (!row) return { data: null, error: new Error('Row not found'), count: null };
        return { data: deserializeRow(row) as T, error: null };
      }

      const deserialized = (rows as any[]).map(deserializeRow) as T[];
      return { data: deserialized, error: null };
    } catch (err: any) {
      return { data: null, error: err as Error };
    }
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function serializeVal(val: any): any {
  if (val === null || val === undefined) return null;
  if (typeof val === 'object') return JSON.stringify(val);
  if (typeof val === 'boolean') return val ? 1 : 0;
  return val;
}

function deserializeRow(row: any): any {
  if (!row) return row;
  const out: any = {};
  for (const [k, v] of Object.entries(row)) {
    if (typeof v === 'string') {
      // Try to parse JSON fields
      const trimmed = v.trim();
      if ((trimmed.startsWith('{') || trimmed.startsWith('[')) && (trimmed.endsWith('}') || trimmed.endsWith(']'))) {
        try {
          out[k] = JSON.parse(trimmed);
          continue;
        } catch {
          // not JSON
        }
      }
    }
    // MySQL BIT(1) comes back as Buffer
    if (Buffer.isBuffer(v)) {
      out[k] = v[0] === 1;
      continue;
    }
    // MySQL returns tinyint(1) as number; treat 0/1 as boolean for known bool fields
    out[k] = v;
  }
  return out;
}

// ── Public API ───────────────────────────────────────────────────────────────

/** Drop-in replacement for `supabase.from(table)` */
export function db(table: string): QueryBuilder {
  return new QueryBuilder(table);
}

/** Convenience: call a function/procedure (replaces supabase.rpc) */
export async function rpc(fnName: string, args: Record<string, any> = {}): Promise<{ data: any; error: Error | null }> {
  try {
    const keys = Object.keys(args);
    const placeholders = keys.map(k => `${k} => ?`).join(', ');
    const sql = `CALL ${fnName}(${keys.map(() => '?').join(', ')})`;
    const values = keys.map(k => args[k]);
    const result = await query(sql, values);
    return { data: result, error: null };
  } catch (err: any) {
    return { data: null, error: err };
  }
}
