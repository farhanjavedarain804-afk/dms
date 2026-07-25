import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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

export const createAppUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: CreateUserInput) => data)
  .handler(async ({ data, context }) => {
    const { data: isAdmin, error: roleErr } = await context.supabase.rpc("is_admin", {
      _user_id: context.userId,
    });
    if (roleErr) throw new Error(roleErr.message);
    if (!isAdmin) throw new Error("Forbidden: admin role required");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let full_name = data.full_name ?? "";
    let email = data.email ?? "";
    let phone: string | null = data.phone ?? null;
    let department: string | null = data.department ?? null;
    let designation: string | null = null;

    if (data.employee_id) {
      const { data: emp, error: empErr } = await supabaseAdmin
        .from("employees")
        .select("id, name, email, phone, department, position")
        .eq("id", data.employee_id)
        .maybeSingle();
      if (empErr) throw new Error(empErr.message);
      if (!emp) throw new Error("Selected employee not found");
      full_name = (emp as any).name ?? full_name;
      email = (emp as any).email ?? email;
      phone = (emp as any).phone ?? phone;
      department = (emp as any).department ?? department;
      designation = (emp as any).position ?? null;

      const { data: existing } = await supabaseAdmin
        .from("app_users")
        .select("id")
        .eq("employee_id", data.employee_id)
        .maybeSingle();
      if (existing) throw new Error("This employee already has a user account");
    }

    if (!email) throw new Error("Email is required");
    if (!full_name) throw new Error("Name is required");

    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: data.password,
      email_confirm: true,
      user_metadata: { name: full_name, username: data.username, role: data.role, designation },
    });
    if (createErr) throw new Error(createErr.message);
    const authUserId = created.user?.id;
    if (!authUserId) throw new Error("Failed to create auth user");

    const { error: appErr } = await supabaseAdmin.from("app_users").insert({
      auth_user_id: authUserId,
      username: data.username,
      full_name,
      email,
      role: data.role as any,
      department,
      phone,
      status: data.status ?? "active",
      employee_id: data.employee_id ?? null,
    } as any);
    if (appErr) {
      await supabaseAdmin.auth.admin.deleteUser(authUserId);
      throw new Error(appErr.message);
    }

    await supabaseAdmin.from("user_roles").insert({
      user_id: authUserId,
      role: data.role as any,
    });

    return { ok: true, auth_user_id: authUserId };
  });

export const deleteAppUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: number; auth_user_id?: string }) => data)
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("is_admin", { _user_id: context.userId });
    if (!isAdmin) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.auth_user_id) {
      await supabaseAdmin.auth.admin.deleteUser(data.auth_user_id).catch(() => {});
    }
    await supabaseAdmin.from("app_users").delete().eq("id", data.id);
    return { ok: true };
  });

export const resetUserPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { auth_user_id: string; password: string }) => data)
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("is_admin", { _user_id: context.userId });
    if (!isAdmin) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.auth_user_id, {
      password: data.password,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: number; auth_user_id: string; role: string }) => data)
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("is_admin", { _user_id: context.userId });
    if (!isAdmin) throw new Error("Forbidden: admin role required");
    if (!data.auth_user_id) throw new Error("Missing auth user id");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Update app_users.role
    const { error: appErr } = await supabaseAdmin
      .from("app_users")
      .update({ role: data.role as any })
      .eq("id", data.id);
    if (appErr) throw new Error(appErr.message);

    // Replace user_roles rows for this user with the new single role
    const { error: delErr } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", data.auth_user_id);
    if (delErr) throw new Error(delErr.message);

    const { error: insErr } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: data.auth_user_id, role: data.role as any });
    if (insErr) throw new Error(insErr.message);

    // Sync auth user metadata role
    await supabaseAdmin.auth.admin.updateUserById(data.auth_user_id, {
      user_metadata: { role: data.role },
    }).catch(() => {});

    return { ok: true };
  });

export const setUserStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: number; status: "active" | "inactive" }) => data)
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("is_admin", { _user_id: context.userId });
    if (!isAdmin) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("app_users").update({ status: data.status }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
