// Browser-only local CRUD store, used to make secondary modules fully
// interactive without adding new database tables. Data persists per browser.

type Row = { id: number };

export function localCrud<T extends Row>(key: string, seed: Omit<T, "id">[] = []) {
  const storageKey = `dms:${key}`;

  const load = (): T[] => {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) {
        const seeded = seed.map((r, i) => ({ ...r, id: i + 1 })) as T[];
        window.localStorage.setItem(storageKey, JSON.stringify(seeded));
        return seeded;
      }
      return JSON.parse(raw) as T[];
    } catch {
      return [];
    }
  };

  const save = (rows: T[]) => {
    window.localStorage.setItem(storageKey, JSON.stringify(rows));
  };

  const delay = <R,>(v: R) => new Promise<R>((r) => setTimeout(() => r(v), 120));

  return {
    list: async (): Promise<T[]> => delay(load().sort((a, b) => b.id - a.id)),
    get: async (id: number): Promise<T> => {
      const row = load().find((r) => r.id === id);
      if (!row) throw new Error("Not found");
      return delay(row);
    },
    create: async (body: Omit<T, "id">): Promise<T> => {
      const rows = load();
      const id = rows.length ? Math.max(...rows.map((r) => r.id)) + 1 : 1;
      const row = { ...(body as object), id } as T;
      save([row, ...rows]);
      return delay(row);
    },
    update: async (id: number, body: Partial<T>): Promise<T> => {
      const rows = load();
      const idx = rows.findIndex((r) => r.id === id);
      if (idx < 0) throw new Error("Not found");
      rows[idx] = { ...rows[idx], ...body };
      save(rows);
      return delay(rows[idx]);
    },
    remove: async (id: number) => {
      save(load().filter((r) => r.id !== id));
      return delay({ ok: true });
    },
  };
}
