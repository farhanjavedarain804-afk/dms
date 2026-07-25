import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { EmailConfig } from "./email-config.functions";

const MAX_ATTEMPTS = 3;
const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes

function maskEmail(email: string) {
  const [u, d] = email.split("@");
  if (!u || !d) return email;
  const head = u.slice(0, 2);
  return `${head}${"*".repeat(Math.max(1, u.length - 2))}@${d}`;
}

async function sha256Hex(text: string) {
  const { createHash } = await import("node:crypto");
  return createHash("sha256").update(text, "utf8").digest("hex");
}

/**
 * Called BEFORE signInWithPassword. Returns whether the account is locked
 * and whether the incoming IP is already trusted.
 * (Deliberately does NOT reveal whether the email exists.)
 */
export const checkLoginSecurity = createServerFn({ method: "POST" })
  .inputValidator((d: { email: string; ip: string | null }) => d)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("app_users")
      .select("id, is_locked, known_ips, status")
      .eq("email", data.email)
      .maybeSingle();
    if (!row) {
      // Do not leak existence – behave like a trusted new visitor.
      return { locked: false, ipTrusted: true, exists: false };
    }
    const r = row as any;
    if (r.is_locked || r.status === "inactive") {
      return { locked: true, ipTrusted: false, exists: true };
    }
    const known: string[] = Array.isArray(r.known_ips) ? r.known_ips : [];
    const ipTrusted = !data.ip || known.length === 0 || known.includes(data.ip);
    // First-ever login: seed the current IP as trusted (no OTP needed on very first login).
    return { locked: false, ipTrusted, exists: true };
  });

/**
 * Records a failed password attempt. Locks the account after MAX_ATTEMPTS.
 */
export const recordFailedAttempt = createServerFn({ method: "POST" })
  .inputValidator((d: { email: string }) => d)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("app_users")
      .select("id, failed_attempts, is_locked")
      .eq("email", data.email)
      .maybeSingle();
    if (!row) return { attempts: 0, locked: false, remaining: MAX_ATTEMPTS };
    const r = row as any;
    const attempts = (r.failed_attempts ?? 0) + 1;
    const locked = attempts >= MAX_ATTEMPTS;
    const patch: any = { failed_attempts: attempts };
    if (locked) {
      patch.is_locked = true;
      patch.locked_at = new Date().toISOString();
      patch.lock_reason = `Auto-locked after ${MAX_ATTEMPTS} failed sign-in attempts`;
    }
    await supabaseAdmin.from("app_users").update(patch).eq("id", r.id);
    return { attempts, locked, remaining: Math.max(0, MAX_ATTEMPTS - attempts) };
  });

/**
 * Resets counters + records a successful login, seeding the IP as trusted.
 */
export const recordSuccessfulLogin = createServerFn({ method: "POST" })
  .inputValidator((d: { email: string; ip: string | null }) => d)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("app_users")
      .select("id, known_ips")
      .eq("email", data.email)
      .maybeSingle();
    if (!row) return { ok: true };
    const r = row as any;
    const known: string[] = Array.isArray(r.known_ips) ? r.known_ips : [];
    const nextKnown = data.ip && !known.includes(data.ip) ? [...known, data.ip].slice(-15) : known;
    await supabaseAdmin
      .from("app_users")
      .update({
        failed_attempts: 0,
        pending_otp_hash: null,
        pending_otp_ip: null,
        pending_otp_expires_at: null,
        last_login_ip: data.ip,
        known_ips: nextKnown,
      })
      .eq("id", r.id);
    return { ok: true };
  });

/**
 * Generates a 6-digit OTP for a new IP and emails it via the caller's SMTP config.
 * The OTP is stored hashed; the plaintext OTP never leaves the server response.
 */
export const requestIpOtp = createServerFn({ method: "POST" })
  .inputValidator((d: { email: string; ip: string; smtp?: EmailConfig | null }) => d)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("app_users")
      .select("id, email, full_name, is_locked, status")
      .eq("email", data.email)
      .maybeSingle();
    if (!row) throw new Error("Account not found");
    const r = row as any;
    if (r.is_locked || r.status === "inactive") throw new Error("Account is locked. Contact administrator.");

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const hash = await sha256Hex(otp);
    const expires = new Date(Date.now() + OTP_TTL_MS).toISOString();

    await supabaseAdmin
      .from("app_users")
      .update({
        pending_otp_hash: hash,
        pending_otp_ip: data.ip,
        pending_otp_expires_at: expires,
      })
      .eq("id", r.id);

    let emailSent = false;
    let emailError: string | null = null;
    if (data.smtp?.host && data.smtp?.fromEmail) {
      try {
        const nodemailer = (await import("nodemailer")).default;
        const transporter = nodemailer.createTransport({
          host: data.smtp.host,
          port: Number(data.smtp.port),
          secure: !!data.smtp.secure,
          auth: data.smtp.username ? { user: data.smtp.username, pass: data.smtp.password } : undefined,
        });
        const html = `
          <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px">
            <h2 style="margin:0 0 12px;color:#0f172a">Devionic DMS · Security Verification</h2>
            <p style="color:#334155;font-size:14px">Hi ${r.full_name || "there"}, we detected a sign-in attempt from a new device or IP address:</p>
            <p style="font-family:monospace;background:#f1f5f9;padding:10px 14px;border-radius:8px;color:#0f172a">IP: ${data.ip}</p>
            <p style="color:#334155;font-size:14px">Your one-time verification code is:</p>
            <div style="font-size:32px;letter-spacing:8px;font-weight:700;color:#0891b2;text-align:center;padding:18px;background:#ecfeff;border-radius:12px;margin:12px 0">${otp}</div>
            <p style="color:#64748b;font-size:12px">This code expires in 10 minutes. If you didn't request it, please ignore this email and change your password immediately.</p>
            <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0"/>
            <p style="color:#94a3b8;font-size:11px">Devionic (Pvt) Ltd · Head Office, Chowk Azam, Layyah, Pakistan</p>
          </div>`;
        await transporter.sendMail({
          from: `${data.smtp.fromName || "Devionic Security"} <${data.smtp.fromEmail}>`,
          to: r.email,
          subject: "Devionic DMS — Security verification code",
          html,
          text: `Your Devionic DMS verification code is: ${otp}\nIP: ${data.ip}\nExpires in 10 minutes.`,
          replyTo: data.smtp.replyTo || undefined,
        });
        emailSent = true;
      } catch (e: any) {
        emailError = String(e?.message || e);
        console.warn("OTP email send failed", e);
      }
      try {
        await supabaseAdmin.from("email_logs").insert({
          to_email: r.email,
          from_email: data.smtp.fromEmail,
          subject: "Devionic DMS — Security verification code",
          category: "security-otp",
          provider: "smtp",
          status: emailSent ? "sent" : "failed",
          error: emailError,
          meta: { ip: data.ip, host: data.smtp.host },
        });
      } catch {}
    }

    try {
      await supabaseAdmin.from("otp_logs").insert({
        email: r.email,
        auth_user_id: null,
        ip_address: data.ip,
        purpose: "login-ip-verification",
        status: emailSent ? "sent" : (data.smtp?.host ? "failed" : "sent"),
        message: emailSent ? "OTP delivered via SMTP" : (data.smtp?.host ? `Email send failed: ${emailError}` : "SMTP not configured — OTP generated without email"),
      });
    } catch {}

    return { ok: true, emailSent, maskedEmail: maskEmail(r.email) };
  });


/**
 * Verifies the OTP entered by the user. On success, marks the IP as trusted.
 */
export const verifyIpOtp = createServerFn({ method: "POST" })
  .inputValidator((d: { email: string; ip: string; otp: string }) => d)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("app_users")
      .select("id, known_ips, pending_otp_hash, pending_otp_ip, pending_otp_expires_at")
      .eq("email", data.email)
      .maybeSingle();
    const logOtp = async (status: string, message: string) => {
      try {
        await supabaseAdmin.from("otp_logs").insert({
          email: data.email, ip_address: data.ip, purpose: "login-ip-verification", status, message,
        });
      } catch {}
    };
    if (!row) { await logOtp("failed", "Account not found"); throw new Error("Account not found"); }
    const r = row as any;
    if (!r.pending_otp_hash || !r.pending_otp_expires_at) { await logOtp("failed", "No pending verification"); throw new Error("No pending verification. Request a new code."); }
    if (new Date(r.pending_otp_expires_at).getTime() < Date.now()) { await logOtp("expired", "Code expired"); throw new Error("Code expired. Request a new one."); }
    if (r.pending_otp_ip && r.pending_otp_ip !== data.ip) { await logOtp("failed", "IP mismatch"); throw new Error("Verification IP mismatch. Request a new code."); }
    const hash = await sha256Hex(data.otp.trim());
    if (hash !== r.pending_otp_hash) { await logOtp("failed", "Invalid code"); throw new Error("Invalid code"); }

    const known: string[] = Array.isArray(r.known_ips) ? r.known_ips : [];
    const next = known.includes(data.ip) ? known : [...known, data.ip].slice(-15);
    await supabaseAdmin
      .from("app_users")
      .update({
        known_ips: next,
        pending_otp_hash: null,
        pending_otp_ip: null,
        pending_otp_expires_at: null,
      })
      .eq("id", r.id);
    await logOtp("verified", "OTP verified — IP trusted");
    return { ok: true };
  });


/**
 * Admin action — unlock a user's login and clear failed attempts + known IPs if requested.
 */
export const adminUnlockLogin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: number; resetIps?: boolean }) => d)
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("is_admin", { _user_id: context.userId });
    if (!isAdmin) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch: any = {
      is_locked: false,
      failed_attempts: 0,
      locked_at: null,
      lock_reason: null,
      pending_otp_hash: null,
      pending_otp_ip: null,
      pending_otp_expires_at: null,
    };
    if (data.resetIps) patch.known_ips = [];
    const { error } = await supabaseAdmin.from("app_users").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * Admin action — manually lock a user's login.
 */
export const adminLockLogin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: number; reason?: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("is_admin", { _user_id: context.userId });
    if (!isAdmin) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("app_users")
      .update({
        is_locked: true,
        locked_at: new Date().toISOString(),
        lock_reason: data.reason || "Manually locked by administrator",
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
