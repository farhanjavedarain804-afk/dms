import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { query, queryOne, execute } from "@/lib/mysql";
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

async function isAdmin(userId: string): Promise<boolean> {
  const user = await queryOne<any>("SELECT role FROM app_users WHERE id = ?", [userId]);
  return user?.role === "Super Admin" || user?.role === "Admin";
}

/**
 * Called BEFORE signIn. Returns whether the account is locked
 * and whether the incoming IP is already trusted.
 */
export const checkLoginSecurity = createServerFn({ method: "POST" })
  .inputValidator((d: { email: string; ip: string | null }) => d)
  .handler(async ({ data }) => {
    const row = await queryOne<any>(
      "SELECT id, is_locked, known_ips, is_active FROM app_users WHERE email = ?",
      [data.email]
    );
    if (!row) {
      return { locked: false, ipTrusted: true, exists: false };
    }
    if (row.is_locked || row.is_active === 0) {
      return { locked: true, ipTrusted: false, exists: true };
    }
    let known: string[] = [];
    try {
      known = typeof row.known_ips === "string"
        ? JSON.parse(row.known_ips)
        : (Array.isArray(row.known_ips) ? row.known_ips : []);
    } catch {}
    const ipTrusted = !data.ip || known.length === 0 || known.includes(data.ip);
    return { locked: false, ipTrusted, exists: true };
  });

/**
 * Records a failed password attempt. Locks the account after MAX_ATTEMPTS.
 */
export const recordFailedAttempt = createServerFn({ method: "POST" })
  .inputValidator((d: { email: string }) => d)
  .handler(async ({ data }) => {
    const row = await queryOne<any>(
      "SELECT id, failed_attempts, is_locked FROM app_users WHERE email = ?",
      [data.email]
    );
    if (!row) return { attempts: 0, locked: false, remaining: MAX_ATTEMPTS };
    const attempts = (row.failed_attempts ?? 0) + 1;
    const locked = attempts >= MAX_ATTEMPTS;
    if (locked) {
      await execute(
        "UPDATE app_users SET failed_attempts = ?, is_locked = 1, locked_at = NOW(), lock_reason = ? WHERE id = ?",
        [attempts, `Auto-locked after ${MAX_ATTEMPTS} failed sign-in attempts`, row.id]
      );
    } else {
      await execute(
        "UPDATE app_users SET failed_attempts = ? WHERE id = ?",
        [attempts, row.id]
      );
    }
    return { attempts, locked, remaining: Math.max(0, MAX_ATTEMPTS - attempts) };
  });

/**
 * Resets counters + records a successful login, seeding the IP as trusted.
 */
export const recordSuccessfulLogin = createServerFn({ method: "POST" })
  .inputValidator((d: { email: string; ip: string | null }) => d)
  .handler(async ({ data }) => {
    const row = await queryOne<any>(
      "SELECT id, known_ips FROM app_users WHERE email = ?",
      [data.email]
    );
    if (!row) return { ok: true };
    let known: string[] = [];
    try {
      known = typeof row.known_ips === "string"
        ? JSON.parse(row.known_ips)
        : (Array.isArray(row.known_ips) ? row.known_ips : []);
    } catch {}
    const nextKnown = data.ip && !known.includes(data.ip) ? [...known, data.ip].slice(-15) : known;
    await execute(
      `UPDATE app_users SET failed_attempts = 0, pending_otp_hash = NULL,
       pending_otp_ip = NULL, pending_otp_expires_at = NULL,
       last_login_ip = ?, known_ips = ? WHERE id = ?`,
      [data.ip, JSON.stringify(nextKnown), row.id]
    );
    return { ok: true };
  });

/**
 * Generates a 6-digit OTP for a new IP and emails it via the caller's SMTP config.
 */
export const requestIpOtp = createServerFn({ method: "POST" })
  .inputValidator((d: { email: string; ip: string; smtp?: EmailConfig | null }) => d)
  .handler(async ({ data }) => {
    const row = await queryOne<any>(
      "SELECT id, email, name, is_locked, is_active FROM app_users WHERE email = ?",
      [data.email]
    );
    if (!row) throw new Error("Account not found");
    if (row.is_locked || row.is_active === 0) throw new Error("Account is locked. Contact administrator.");

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const hash = await sha256Hex(otp);
    const expires = new Date(Date.now() + OTP_TTL_MS).toISOString().slice(0, 19).replace("T", " ");

    await execute(
      "UPDATE app_users SET pending_otp_hash = ?, pending_otp_ip = ?, pending_otp_expires_at = ? WHERE id = ?",
      [hash, data.ip, expires, row.id]
    );

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
            <p style="color:#334155;font-size:14px">Hi ${row.name || "there"}, we detected a sign-in attempt from a new device or IP address:</p>
            <p style="font-family:monospace;background:#f1f5f9;padding:10px 14px;border-radius:8px;color:#0f172a">IP: ${data.ip}</p>
            <p style="color:#334155;font-size:14px">Your one-time verification code is:</p>
            <div style="font-size:32px;letter-spacing:8px;font-weight:700;color:#0891b2;text-align:center;padding:18px;background:#ecfeff;border-radius:12px;margin:12px 0">${otp}</div>
            <p style="color:#64748b;font-size:12px">This code expires in 10 minutes. If you didn't request it, please ignore this email and change your password immediately.</p>
            <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0"/>
            <p style="color:#94a3b8;font-size:11px">Devionic (Pvt) Ltd · Head Office, Chowk Azam, Layyah, Pakistan</p>
          </div>`;
        await transporter.sendMail({
          from: `${data.smtp.fromName || "Devionic Security"} <${data.smtp.fromEmail}>`,
          to: row.email,
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
        await execute(
          "INSERT INTO email_logs (to_email, from_email, subject, category, provider, status, error) VALUES (?, ?, ?, ?, ?, ?, ?)",
          [row.email, data.smtp.fromEmail, "Devionic DMS — Security verification code", "security-otp", "smtp",
           emailSent ? "sent" : "failed", emailError]
        );
      } catch {}
    }

    try {
      await execute(
        "INSERT INTO otp_logs (email, ip_address, purpose, status, message) VALUES (?, ?, ?, ?, ?)",
        [
          row.email, data.ip, "login-ip-verification",
          emailSent ? "sent" : (data.smtp?.host ? "failed" : "sent"),
          emailSent ? "OTP delivered via SMTP" : (data.smtp?.host ? `Email send failed: ${emailError}` : "SMTP not configured — OTP generated without email"),
        ]
      );
    } catch {}

    return { ok: true, emailSent, maskedEmail: maskEmail(row.email) };
  });

/**
 * Verifies the OTP entered by the user. On success, marks the IP as trusted.
 */
export const verifyIpOtp = createServerFn({ method: "POST" })
  .inputValidator((d: { email: string; ip: string; otp: string }) => d)
  .handler(async ({ data }) => {
    const row = await queryOne<any>(
      "SELECT id, known_ips, pending_otp_hash, pending_otp_ip, pending_otp_expires_at FROM app_users WHERE email = ?",
      [data.email]
    );
    const logOtp = async (status: string, message: string) => {
      try {
        await execute(
          "INSERT INTO otp_logs (email, ip_address, purpose, status, message) VALUES (?, ?, ?, ?, ?)",
          [data.email, data.ip, "login-ip-verification", status, message]
        );
      } catch {}
    };
    if (!row) { await logOtp("failed", "Account not found"); throw new Error("Account not found"); }
    if (!row.pending_otp_hash || !row.pending_otp_expires_at) {
      await logOtp("failed", "No pending verification");
      throw new Error("No pending verification. Request a new code.");
    }
    const expiresAt = typeof row.pending_otp_expires_at === "string"
      ? new Date(row.pending_otp_expires_at).getTime()
      : (row.pending_otp_expires_at as Date).getTime();
    if (expiresAt < Date.now()) { await logOtp("expired", "Code expired"); throw new Error("Code expired. Request a new one."); }
    if (row.pending_otp_ip && row.pending_otp_ip !== data.ip) { await logOtp("failed", "IP mismatch"); throw new Error("Verification IP mismatch. Request a new code."); }
    const hash = await sha256Hex(data.otp.trim());
    if (hash !== row.pending_otp_hash) { await logOtp("failed", "Invalid code"); throw new Error("Invalid code"); }

    let known: string[] = [];
    try {
      known = typeof row.known_ips === "string"
        ? JSON.parse(row.known_ips)
        : (Array.isArray(row.known_ips) ? row.known_ips : []);
    } catch {}
    const next = known.includes(data.ip) ? known : [...known, data.ip].slice(-15);
    await execute(
      "UPDATE app_users SET known_ips = ?, pending_otp_hash = NULL, pending_otp_ip = NULL, pending_otp_expires_at = NULL WHERE id = ?",
      [JSON.stringify(next), row.id]
    );
    await logOtp("verified", "OTP verified — IP trusted");
    return { ok: true };
  });

/**
 * Admin action — unlock a user's login and clear failed attempts.
 */
export const adminUnlockLogin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: number; resetIps?: boolean }) => d)
  .handler(async ({ data, context }) => {
    if (!(await isAdmin(context.userId))) throw new Error("Forbidden");
    const patch: any = {
      is_locked: false,
      failed_attempts: 0,
      locked_at: null,
      lock_reason: null,
      pending_otp_hash: null,
      pending_otp_ip: null,
      pending_otp_expires_at: null,
    };
    if (data.resetIps) patch.known_ips = JSON.stringify([]);
    const setClauses = Object.keys(patch).map(k => `\`${k}\` = ?`).join(", ");
    const values = [...Object.values(patch), data.id];
    await execute(`UPDATE app_users SET ${setClauses} WHERE id = ?`, values);
    return { ok: true };
  });

/**
 * Admin action — manually lock a user's login.
 */
export const adminLockLogin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: number; reason?: string }) => d)
  .handler(async ({ data, context }) => {
    if (!(await isAdmin(context.userId))) throw new Error("Forbidden");
    await execute(
      "UPDATE app_users SET is_locked = 1, locked_at = NOW(), lock_reason = ? WHERE id = ?",
      [data.reason || "Manually locked by administrator", data.id]
    );
    return { ok: true };
  });
