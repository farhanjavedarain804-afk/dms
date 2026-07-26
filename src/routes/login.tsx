import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Mail,
  Lock,
  ArrowRight,
  Eye,
  EyeOff,
  ShieldCheck,
  Users,
  BarChart3,
  Sparkles,
  CheckCircle2,
  Globe,
  KeyRound,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import logo from "@/assets/devionic-logo.png.asset.json";

const seedAdmin = () => import("@/lib/seed-admin.functions");
const loginSecurity = () => import("@/lib/login-security.functions");

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — Devionic DMS" },
      {
        name: "description",
        content:
          "Sign in to Devionic's Digital Management System — the operating platform for your team, projects and operations.",
      },
    ],
  }),
  component: LoginPage,
});

const FEATURES = [
  { icon: Users, title: "Unified team hub", desc: "Employees, HR & attendance in one place." },
  { icon: BarChart3, title: "Live analytics", desc: "Real-time KPIs across every department." },
  { icon: ShieldCheck, title: "Enterprise security", desc: "Role-based access & encrypted at rest." },
];

async function fetchPublicIp(): Promise<string | null> {
  try {
    const r = await fetch("https://api.ipify.org?format=json");
    const j = await r.json();
    return j?.ip ?? null;
  } catch {
    return null;
  }
}

function readSmtpFromLocal(): any | null {
  try {
    const raw = localStorage.getItem("dms:email");
    if (!raw) return null;
    const cfg = JSON.parse(raw);
    if (cfg?.enabled === false) return null;
    if (!cfg?.host || !cfg?.fromEmail) return null;
    return cfg;
  } catch {
    return null;
  }
}

function LoginPage() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // IP-verification (OTP) state
  const [otpRequired, setOtpRequired] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpEmailSent, setOtpEmailSent] = useState(false);
  const [maskedEmail, setMaskedEmail] = useState<string | null>(null);
  const [currentIp, setCurrentIp] = useState<string | null>(null);

  useEffect(() => {
    if (user) navigate({ to: "/" });
  }, [user, navigate]);

  async function beginOtpFlow(ip: string) {
    setOtpRequired(true);
    setOtpCode("");
    const smtp = readSmtpFromLocal();
    try {
      const { requestIpOtp } = await loginSecurity();
      const res = await requestIpOtp({ data: { email, ip, smtp } });
      setMaskedEmail(res.maskedEmail);
      setOtpEmailSent(!!res.emailSent);
      setNotice(
        res.emailSent
          ? `New device detected. A 6-digit verification code has been emailed to ${res.maskedEmail}.`
          : `New device detected. Email delivery is not configured — ask your administrator to unlock your account or share the code from the server.`,
      );
    } catch (err: any) {
      setError(err?.message ?? "Could not start verification");
      setOtpRequired(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setSubmitting(true);
    try {
      try {
        const { ensureAdminSeed } = await seedAdmin();
        await ensureAdminSeed();
      } catch {
        /* ignore — user may already exist */
      }

      const ip = await fetchPublicIp();
      setCurrentIp(ip);

      const {
        checkLoginSecurity,
        recordFailedAttempt,
        recordSuccessfulLogin,
      } = await loginSecurity();

      // 1) Pre-check for lock + trusted IP
      const pre = await checkLoginSecurity({ data: { email, ip } });
      if (pre.locked) {
        setError("Your account is locked. Please contact your administrator to restore access.");
        return;
      }

      // 2) Attempt password sign-in
      try {
        await login(email, password);
      } catch (err: any) {
        // Wrong password — record failure and possibly lock
        const rec = await recordFailedAttempt({ data: { email } }).catch(() => null);
        if (rec?.locked) {
          setError(
            `Your account has been locked after ${3} failed sign-in attempts. Ask your administrator to re-approve access.`,
          );
        } else if (rec) {
          setError(
            `Invalid credentials. ${rec.remaining} attempt${rec.remaining === 1 ? "" : "s"} remaining before your account is locked.`,
          );
        } else {
          setError(err?.message ?? "Sign in failed");
        }
        return;
      }

      // 3) Password OK — if IP is new, require OTP verification
      if (!pre.ipTrusted && ip) {
        // Log out immediately; user must verify the new IP first
        try {
          const { supabase } = await import("@/lib/db-client");
          await db.auth.signOut();
        } catch {
          /* ignore */
        }
        await beginOtpFlow(ip);
        return;
      }

      // 4) All good — record success & continue
      await recordSuccessfulLogin({ data: { email, ip } }).catch(() => null);
      navigate({ to: "/" });
    } catch (err: any) {
      setError(err?.message ?? "Sign in failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function onVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setSubmitting(true);
    try {
      const ip = currentIp ?? (await fetchPublicIp());
      if (!ip) throw new Error("Cannot detect your IP address");
      const { verifyIpOtp, recordSuccessfulLogin } = await loginSecurity();
      await verifyIpOtp({ data: { email, ip, otp: otpCode } });
      // IP now trusted — sign the user in
      await login(email, password);
      await recordSuccessfulLogin({ data: { email, ip } }).catch(() => null);
      setOtpRequired(false);
      navigate({ to: "/" });
    } catch (err: any) {
      setError(err?.message ?? "Verification failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function onResendOtp() {
    setError(null);
    setNotice(null);
    const ip = currentIp ?? (await fetchPublicIp());
    if (!ip) {
      setError("Cannot detect your IP address");
      return;
    }
    await beginOtpFlow(ip);
  }


  return (
    <div
      className="min-h-screen relative overflow-hidden grid place-items-center p-4 sm:p-6"
      style={{ background: "oklch(0.97 0.008 220)" }}
    >
      {/* Ambient decorations */}
      <div
        className="pointer-events-none absolute -top-40 -right-40 h-[32rem] w-[32rem] rounded-full blur-3xl opacity-60"
        style={{ background: "oklch(0.78 0.15 190 / 0.55)" }}
      />
      <div
        className="pointer-events-none absolute -bottom-40 -left-40 h-[36rem] w-[36rem] rounded-full blur-3xl opacity-60"
        style={{ background: "oklch(0.82 0.14 90 / 0.5)" }}
      />
      <div
        className="pointer-events-none absolute top-1/3 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full blur-3xl opacity-40"
        style={{ background: "oklch(0.75 0.14 25 / 0.35)" }}
      />

      <div className="relative w-full max-w-6xl rounded-[2rem] bg-card/95 backdrop-blur shadow-[0_30px_80px_-20px_oklch(0.3_0.05_240/0.35)] overflow-hidden grid lg:grid-cols-[1.05fr_1fr] min-h-[640px] border border-white/60">
        {/* Left brand panel */}
        <div
          className="relative p-8 sm:p-12 text-white flex flex-col justify-between overflow-hidden"
          style={{
            background:
              "linear-gradient(135deg, oklch(0.62 0.14 195) 0%, oklch(0.48 0.12 210) 45%, oklch(0.32 0.09 240) 100%)",
          }}
        >
          {/* Geometric ambience */}
          <div className="pointer-events-none absolute inset-0 opacity-40">
            <div className="absolute top-10 right-14 h-8 w-8 rotate-45 border border-white/60" />
            <div className="absolute top-28 right-28 h-3 w-3 rotate-45 bg-white/60" />
            <div className="absolute top-40 right-16 h-2 w-2 rounded-full bg-white/50" />
            <div className="absolute bottom-24 left-10 h-56 w-56 rounded-full border border-white/30" />
            <div className="absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
            <div
              className="absolute inset-0"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)",
                backgroundSize: "22px 22px",
                maskImage:
                  "radial-gradient(ellipse at 30% 40%, black 0%, transparent 70%)",
              }}
            />
          </div>

          {/* Top: brand */}
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src={logo.url}
                alt="Devionic"
                className="h-10 w-auto brightness-0 invert"
              />
              <div className="hidden sm:block h-8 w-px bg-white/30" />
              <span className="hidden sm:inline text-[11px] tracking-[0.35em] text-white/80">
                DMS PORTAL
              </span>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[10px] tracking-widest text-white/90 border border-white/20">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 animate-pulse" />
              LIVE
            </span>
          </div>

          {/* Middle: hero */}
          <div className="relative max-w-md">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/20 px-3 py-1 text-[11px] tracking-wider text-white/90">
              <Sparkles className="h-3.5 w-3.5" />
              DIGITAL MANAGEMENT SYSTEM
            </span>
            <h2 className="mt-5 text-4xl sm:text-5xl font-bold leading-[1.05]">
              Run your entire company from{" "}
              <span
                className="bg-clip-text text-transparent"
                style={{
                  backgroundImage:
                    "linear-gradient(90deg, oklch(0.95 0.05 90), oklch(0.85 0.15 60))",
                }}
              >
                one dashboard.
              </span>
            </h2>
            <p className="mt-4 text-sm sm:text-base text-white/85 leading-relaxed">
              Devionic brings people, projects and performance together —
              intelligently orchestrated, beautifully simple.
            </p>

            <ul className="mt-8 space-y-4">
              {FEATURES.map(({ icon: Icon, title, desc }) => (
                <li key={title} className="flex items-start gap-3">
                  <span className="mt-0.5 grid place-items-center h-9 w-9 rounded-xl bg-white/10 border border-white/20 backdrop-blur">
                    <Icon className="h-4.5 w-4.5" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold">{title}</p>
                    <p className="text-xs text-white/70">{desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Bottom: footer meta */}
          <div className="relative flex items-center justify-between text-[11px] text-white/70">
            <div className="flex items-center gap-2">
              <Globe className="h-3.5 w-3.5" />
              <span className="tracking-[0.25em]">DEVIONIC (PVT) LTD</span>
            </div>
            <span>© {new Date().getFullYear()} All rights reserved</span>
          </div>
        </div>

        {/* Right form panel */}
        <div
          id="form"
          className="relative p-8 sm:p-12 lg:p-14 flex flex-col justify-center bg-card"
        >
          <div className="mx-auto w-full max-w-md">
            <div className="mb-8">
              <p className="text-[11px] font-semibold tracking-[0.3em] text-primary/70">
                WELCOME BACK
              </p>
              <h1 className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
                Sign in to your workspace
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Enter your credentials to access the Devionic control center.
              </p>
            </div>

            {notice && !error && (
              <div className="mb-4 text-sm rounded-lg bg-primary/10 text-primary px-3 py-2.5 border border-primary/20">
                {notice}
              </div>
            )}

            {otpRequired ? (
              <form onSubmit={onVerifyOtp} className="space-y-5">
                <div className="rounded-xl border border-amber-300/50 bg-amber-50 dark:bg-amber-950/20 px-4 py-3 flex items-start gap-3">
                  <ShieldCheck className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
                    <p className="font-semibold">New sign-in location detected</p>
                    <p className="mt-0.5">
                      IP <span className="font-mono">{currentIp || "unknown"}</span> is not recognised for {maskedEmail || email}. Enter the 6-digit code
                      {otpEmailSent ? " we emailed you" : " your administrator provides"} to continue.
                    </p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground/80">Verification code</label>
                  <div className="group flex items-center gap-3 rounded-xl border border-input bg-background px-4 py-3 transition focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10">
                    <KeyRound className="h-4 w-4 text-muted-foreground shrink-0 group-focus-within:text-primary transition" />
                    <input
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      required
                      autoFocus
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                      placeholder="123456"
                      className="flex-1 bg-transparent text-lg tracking-[0.5em] font-mono outline-none placeholder:text-muted-foreground"
                    />
                  </div>
                </div>
                {error && (
                  <div className="text-sm rounded-lg bg-destructive/10 text-destructive px-3 py-2.5 border border-destructive/20">
                    {error}
                  </div>
                )}
                <Button
                  type="submit"
                  disabled={submitting || otpCode.length !== 6}
                  className="w-full rounded-xl py-6 text-sm font-semibold tracking-wide text-white shadow-lg shadow-primary/20 hover:shadow-xl transition-all"
                  style={{ background: "linear-gradient(135deg, oklch(0.62 0.14 195), oklch(0.42 0.10 220))" }}
                >
                  {submitting ? "Verifying…" : "Verify & continue"}
                </Button>
                <div className="flex items-center justify-between text-xs">
                  <button type="button" onClick={onResendOtp} className="text-primary hover:underline font-medium">
                    Resend code
                  </button>
                  <button
                    type="button"
                    onClick={() => { setOtpRequired(false); setOtpCode(""); setError(null); setNotice(null); }}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    ← Back to sign in
                  </button>
                </div>
              </form>
            ) : (
            <form onSubmit={onSubmit} className="space-y-5">

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground/80">
                  Email address
                </label>
                <div className="group flex items-center gap-3 rounded-xl border border-input bg-background px-4 py-3 transition focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10">
                  <Mail className="h-4 w-4 text-muted-foreground shrink-0 group-focus-within:text-primary transition" />
                  <input
                    type="email"
                    required
                    value={email}
                    autoFocus
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@devionic.com"
                    className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-foreground/80">
                    Password
                  </label>
                  <button
                    type="button"
                    className="text-xs font-medium text-primary hover:underline"
                    onClick={() =>
                      setError(
                        "Please contact your administrator to reset your password.",
                      )
                    }
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="group flex items-center gap-3 rounded-xl border border-input bg-background px-4 py-3 transition focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10">
                  <Lock className="h-4 w-4 text-muted-foreground shrink-0 group-focus-within:text-primary transition" />
                  <input
                    type={showPw ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="text-muted-foreground hover:text-foreground transition"
                    aria-label={showPw ? "Hide password" : "Show password"}
                  >
                    {showPw ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <label className="inline-flex items-center gap-2 cursor-pointer select-none text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="h-4 w-4 rounded border-input accent-[oklch(0.5_0.13_200)]"
                  />
                  Keep me signed in
                </label>
                <span className="inline-flex items-center gap-1 text-emerald-600">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  256-bit encrypted
                </span>
              </div>

              {error && (
                <div className="text-sm rounded-lg bg-destructive/10 text-destructive px-3 py-2.5 border border-destructive/20">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={submitting}
                className="w-full rounded-xl py-6 text-sm font-semibold tracking-wide text-white shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 transition-all"
                style={{
                  background:
                    "linear-gradient(135deg, oklch(0.62 0.14 195), oklch(0.42 0.10 220))",
                }}
              >
                {submitting ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Signing in…
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2">
                    Sign in to Dashboard
                    <ArrowRight className="h-4 w-4" />
                  </span>
                )}
              </Button>

              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-card px-3 text-[10px] tracking-[0.25em] text-muted-foreground">
                    SECURE ACCESS
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 text-center">
                {[
                  { icon: CheckCircle2, label: "SSO Ready" },
                  { icon: ShieldCheck, label: "RBAC" },
                  { icon: Sparkles, label: "AI Assist" },
                ].map(({ icon: Icon, label }) => (
                  <div
                    key={label}
                    className="rounded-lg border border-border bg-muted/40 py-2.5 text-[11px] font-medium text-muted-foreground flex flex-col items-center gap-1"
                  >
                    <Icon className="h-3.5 w-3.5 text-primary" />
                    {label}
                  </div>
                ))}
              </div>
            </form>
            )}


            <p className="mt-8 text-center text-xs text-muted-foreground">
              Need an account?{" "}
              <span className="text-foreground/80 font-medium">
                Ask your workspace administrator
              </span>
            </p>
          </div>
        </div>
      </div>

      <p className="relative mt-6 text-[11px] text-muted-foreground text-center px-4">
        Devionic (Private) Limited · Head Office, Multan Road, Chowk Azam, Tehsil &amp; District Layyah, Punjab, Pakistan — 31450<br />
        +92-317-7121841 ·{" "}
        <a href="https://www.devionic.com" className="hover:text-foreground transition">www.devionic.com</a> ·{" "}
        <a href="mailto:info@devionic.com" className="hover:text-foreground transition">info@devionic.com</a> · NTN H534200 · SECP CUIN 0308965
      </p>
    </div>
  );
}
