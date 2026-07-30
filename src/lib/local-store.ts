// Database CRUD proxy - Migrated from LocalStorage to MySQL
import { $dbList, $dbGet, $dbCreate, $dbUpdate, $dbDelete } from "./mysql-api";

type Row = { id: number };

export function localCrud<T extends Row>(key: string, seed: Omit<T, "id">[] = []) {
  // We no longer use localStorage or seed data since data is in MySQL.
  // This wrapper ensures existing code still works without changing the API surface.

  return {
    list: async (): Promise<T[]> => {
      try {
        const rows = await $dbList({ data: { table: key, orderBy: 'id', ascending: false } });
        return (rows || []) as unknown as T[];
      } catch (err) {
        console.error(`Error fetching ${key}:`, err);
        return [];
      }
    },
    get: async (id: number): Promise<T> => {
      try {
        const row = await $dbGet({ data: { table: key, id } });
        if (!row) throw new Error("Not found");
        return row as unknown as T;
      } catch (err) {
        throw new Error("Not found");
      }
    },
    create: async (body: Omit<T, "id">): Promise<T> => {
      const row = await $dbCreate({ data: { table: key, body: body as Record<string, any> } });
      return row as unknown as T;
    },
    update: async (id: number, body: Partial<T>): Promise<T> => {
      const row = await $dbUpdate({ data: { table: key, id, body: body as Record<string, any> } });
      return row as unknown as T;
    },
    remove: async (id: number) => {
      await $dbDelete({ data: { table: key, id } });
      return { ok: true };
    },
  };
}
