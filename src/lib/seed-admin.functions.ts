import { createServerFn } from "@tanstack/react-start";
import { ensureAuthTables, createUser } from "@/lib/mysql-auth";
import { queryOne } from "@/lib/mysql";

/**
 * One-shot seed: ensures the Devionic super-admin user exists in MySQL auth app_users.
 * Safe to call multiple times.
 */
export const ensureAdminSeed = createServerFn({ method: "POST" }).handler(async () => {
  await ensureAuthTables();
  const email = "farhanjaved357@gmail.com";
  const password = "Fur@8899";
  const name = "Ch. Farhan Javed";
  const role = "Super Admin";

  try {
    const existing = await queryOne<any>('SELECT id FROM app_users WHERE email = ?', [email]);
    if (existing) {
      return { ok: true, created: false };
    }

    await createUser(email, password, name, role);
    return { ok: true, created: true };
  } catch (error: any) {
    console.error("ensureAdminSeed error:", error);
    throw new Error(error.message || "Failed to seed admin");
  }
});
