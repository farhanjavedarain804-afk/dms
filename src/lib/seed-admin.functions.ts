import { createServerFn } from "@tanstack/react-start";

/**
 * One-shot seed: ensures the Devionic super-admin user exists in Cloud Auth.
 * Safe to call multiple times.
 */
export const ensureAdminSeed = createServerFn({ method: "POST" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const email = "farhanjaved357@gmail.com";
  const password = "Fur@8899";

  // Look through users for this email.
  const { data: list, error: listErr } = await supabaseAdmin.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  if (listErr) throw new Error(listErr.message);
  const existing = list?.users.find((u) => u.email?.toLowerCase() === email);
  if (existing) return { ok: true, created: false };

  const { error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name: "Ch. Farhan Javed", role: "Super Admin" },
  });
  if (error) throw new Error(error.message);
  return { ok: true, created: true };
});
