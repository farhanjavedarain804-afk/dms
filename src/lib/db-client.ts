/**
 * MySQL migration: Database Client proxy query builder.
 *
 * All database access has been migrated to MySQL.
 * This proxy maps direct client-side db calls (db.from(), db.auth)
 * to MySQL Server Functions dynamically, allowing front-end pages to work without refactoring.
 */

import {
  $dbCustomQuery,
  $dbCreate,
  $dbUpdate,
  $dbDelete,
  $dbCount,
  $rpc,
  $signIn,
  $signOut,
  $getSession
} from '@/lib/mysql-api';

const SESSION_TOKEN_KEY = "dms_session_token";

class ClientQueryBuilder {
  private table: string;
  private columns: string = '*';
  private filters: { col: string; op: string; val: any }[] = [];
  private limitVal?: number;
  private orderByCol?: string;
  private orderAscending: boolean = true;
  private isSingleRow: boolean = false;
  private isCountQuery: boolean = false;
  private isHeadQuery: boolean = false;
  
  private action?: 'select' | 'insert' | 'update' | 'delete';
  private insertData?: any;
  private updateData?: any;

  constructor(table: string) {
    this.table = table;
  }

  select(columns = '*', options?: { count?: 'exact' | 'estimated'; head?: boolean }) {
    this.action = 'select';
    this.columns = columns;
    if (options?.count) this.isCountQuery = true;
    if (options?.head) this.isHeadQuery = true;
    return this;
  }

  eq(col: string, val: any) {
    this.filters.push({ col, op: 'eq', val });
    return this;
  }

  neq(col: string, val: any) {
    this.filters.push({ col, op: 'neq', val });
    return this;
  }

  gt(col: string, val: any) {
    this.filters.push({ col, op: 'gt', val });
    return this;
  }

  gte(col: string, val: any) {
    this.filters.push({ col, op: 'gte', val });
    return this;
  }

  lt(col: string, val: any) {
    this.filters.push({ col, op: 'lt', val });
    return this;
  }

  lte(col: string, val: any) {
    this.filters.push({ col, op: 'lte', val });
    return this;
  }

  like(col: string, val: any) {
    this.filters.push({ col, op: 'ilike', val });
    return this;
  }

  ilike(col: string, val: any) {
    this.filters.push({ col, op: 'ilike', val });
    return this;
  }

  in(col: string, val: any[]) {
    this.filters.push({ col, op: 'in', val });
    return this;
  }

  is(col: string, val: any) {
    this.filters.push({ col, op: 'eq', val });
    return this;
  }

  order(col: string, options?: { ascending?: boolean }) {
    this.orderByCol = col;
    this.orderAscending = options?.ascending ?? true;
    return this;
  }

  limit(n: number) {
    this.limitVal = n;
    return this;
  }

  single() {
    this.isSingleRow = true;
    return this;
  }

  maybeSingle() {
    this.isSingleRow = true;
    return this;
  }

  insert(data: any) {
    this.action = 'insert';
    this.insertData = data;
    return this;
  }

  update(data: any) {
    this.action = 'update';
    this.updateData = data;
    return this;
  }

  delete() {
    this.action = 'delete';
    return this;
  }

  // Thenable execution
  async then(resolve: any, reject?: any) {
    try {
      const res = await this.execute();
      resolve(res);
    } catch (err) {
      if (reject) reject(err);
    }
  }

  private async execute() {
    try {
      if (this.action === 'insert') {
        const row = await $dbCreate({ data: { table: this.table, body: this.insertData } });
        return { data: row, error: null };
      }

      if (this.action === 'update') {
        const idFilter = this.filters.find(f => f.col === 'id');
        const id = idFilter ? idFilter.val : null;
        if (!id) throw new Error('Update requires an id filter');
        const row = await $dbUpdate({ data: { table: this.table, id, body: this.updateData } });
        return { data: row, error: null };
      }

      if (this.action === 'delete') {
        const idFilter = this.filters.find(f => f.col === 'id');
        const id = idFilter ? idFilter.val : null;
        if (!id) throw new Error('Delete requires an id filter');
        await $dbDelete({ data: { table: this.table, id } });
        return { data: null, error: null };
      }

      // Default: select
      if (this.isCountQuery) {
        const count = await $dbCount({ data: { table: this.table, filters: this.filters } });
        return { data: [], count, error: null };
      }

      const rows = await $dbCustomQuery({
        data: {
          table: this.table,
          columns: this.columns,
          filters: this.filters,
          orderBy: this.orderByCol,
          ascending: this.orderAscending,
          limit: this.limitVal
        }
      });

      if (this.isSingleRow) {
        return { data: rows[0] || null, error: null };
      }
      return { data: rows, error: null };
    } catch (err: any) {
      console.error(`Database error on table ${this.table}:`, err);
      return { data: null, error: err };
    }
  }
}

const auth = {
  async getSession() {
    try {
      const token = localStorage.getItem(SESSION_TOKEN_KEY);
      if (!token) return { data: { session: null }, error: null };
      const session = await $getSession({ data: { token } });
      if (session) {
        return {
          data: {
            session: {
              access_token: token,
              user: {
                id: String(session.user.id),
                email: session.user.email,
                user_metadata: { name: session.user.name, role: session.user.role }
              }
            }
          },
          error: null
        };
      }
    } catch (err) {
      return { data: { session: null }, error: err };
    }
    return { data: { session: null }, error: null };
  },
  onAuthStateChange(callback: any) {
    const token = localStorage.getItem(SESSION_TOKEN_KEY);
    if (token) {
      $getSession({ data: { token } }).then(session => {
        if (session) {
          callback('SIGNED_IN', {
            access_token: token,
            user: {
              id: String(session.user.id),
              email: session.user.email,
              user_metadata: { name: session.user.name, role: session.user.role }
            }
          });
        }
      }).catch(() => {});
    }
    return { data: { subscription: { unsubscribe: () => {} } } };
  },
  async signInWithPassword({ email, password }: any) {
    try {
      const session = await $signIn({ data: { email, password } });
      if (session) {
        localStorage.setItem(SESSION_TOKEN_KEY, session.token);
        return {
          data: {
            session: {
              access_token: session.token,
              user: {
                id: String(session.user.id),
                email: session.user.email,
                user_metadata: { name: session.user.name, role: session.user.role }
              }
            }
          },
          error: null
        };
      }
    } catch (err: any) {
      return { data: { session: null }, error: err };
    }
    return { data: { session: null }, error: new Error('Sign in failed') };
  },
  async signOut() {
    try {
      const token = localStorage.getItem(SESSION_TOKEN_KEY);
      if (token) {
        await $signOut({ data: { token } }).catch(() => {});
      }
    } finally {
      localStorage.removeItem(SESSION_TOKEN_KEY);
    }
    return { error: null };
  }
};

export const db = {
  from(table: string) {
    return new ClientQueryBuilder(table);
  },
  auth,
  async rpc(fnName: string, args: Record<string, any> = {}) {
    try {
      const data = await $rpc({ data: { fnName, args } });
      return { data, error: null };
    } catch (err: any) {
      return { data: null, error: err };
    }
  },
  storage: {
    from() {
      return {
        async upload() {
          return { error: new Error('File storage is temporarily disabled on client side.') };
        },
        async remove() {
          return { error: null };
        },
        async createSignedUrl() {
          return { data: null, error: new Error('Storage disabled.') };
        }
      };
    }
  },
  channel(name: string) {
    return {
      on(event: string, filter: any, callback: any) {
        return this;
      },
      subscribe(callback?: (status: string) => void) {
        if (callback) callback('SUBSCRIBED');
        return this;
      },
      unsubscribe() {
        return Promise.resolve();
      }
    };
  },
  async removeChannel(channel: any) {
    return Promise.resolve();
  }
};
