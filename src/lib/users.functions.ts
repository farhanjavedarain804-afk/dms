import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/lib/auth-middleware";
import { db } from "@/lib/db";
import { query, queryOne, execute } from "@/lib/mysql";
import { createUser, changePassword, getUserById } from "@/lib/mysql-auth";

export type CreateUserInput = {
  employee_id?: number | null;
  username: string;
  full_name?: string;
  email?: string;
  password: string;
  role: string;
  department?: string;
  phone?: string;
  status?: string;
};

async function isAdmin(userId: string): Promise<boolean> {
  const user = await queryOne<any>("SELECT role FROM app_users WHERE id = ?", [userId]);
  return user?.role === "Super Admin" || user?.role === "Admin";
}

export const createAppUser = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data: CreateUserInput) => data)
  .handler(async ({ data, context }) => {
    if (!(await isAdmin(context.userId))) throw new Error("Forbidden: admin role required");

    let full_name = data.full_name ?? "";
    let email = data.email ?? "";
    let phone: string | null = data.phone ?? null;
    let department: string | null = data.department ?? null;

    if (data.employee_id) {
      const { data: emp, error: empErr } = await db("employees")
        .select("id, name, email, phone, department, position")
        .eq("id", data.employee_id)
        .single();
      if (empErr) throw new Error(empErr.message);
      if (!emp) throw new Error("Selected employee not found");
      full_name = (emp as any).name ?? full_name;
      email = (emp as any).email ?? email;
      phone = (emp as any).phone ?? phone;
      department = (emp as any).department ?? department;

      const existing = await queryOne<any>(
        "SELECT id FROM app_users WHERE employee_id = ?",
        [data.employee_id]
      );
      if (existing) throw new Error("This employee already has a user account");
    }

    if (!email) throw new Error("Email is required");
    if (!full_name) throw new Error("Name is required");

    const newUser = await createUser(email, data.password, full_name, data.role);

    // Attach extra metadata if available
    await execute(
      "UPDATE app_users SET employee_id = ?, department = ?, phone = ?, status = ? WHERE id = ?",
      [data.employee_id ?? null, department, phone, data.status ?? "active", newUser.id]
    );

    return { ok: true, auth_user_id: String(newUser.id) };
  });

export const deleteAppUser = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data: { id: number; auth_user_id?: string }) => data)
  .handler(async ({ data, context }) => {
    if (!(await isAdmin(context.userId))) throw new Error("Forbidden");
    await execute("DELETE FROM user_sessions WHERE user_id = ?", [data.id]);
    await execute("DELETE FROM app_users WHERE id = ?", [data.id]);
    return { ok: true };
  });

export const resetUserPassword = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data: { auth_user_id: string; password: string }) => data)
  .handler(async ({ data, context }) => {
    if (!(await isAdmin(context.userId))) throw new Error("Forbidden");
    await changePassword(Number(data.auth_user_id), data.password);
    return { ok: true };
  });

export const updateUserRole = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data: { id: number; auth_user_id: string; role: string }) => data)
  .handler(async ({ data, context }) => {
    if (!(await isAdmin(context.userId))) throw new Error("Forbidden: admin role required");
    await execute("UPDATE app_users SET role = ? WHERE id = ?", [data.role, data.id]);
    return { ok: true };
  });

export const setUserStatus = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data: { id: number; status: "active" | "inactive" }) => data)
  .handler(async ({ data, context }) => {
    if (!(await isAdmin(context.userId))) throw new Error("Forbidden");
    await execute("UPDATE app_users SET is_active = ? WHERE id = ?", [
      data.status === "active" ? 1 : 0,
      data.id,
    ]);
    return { ok: true };
  });
