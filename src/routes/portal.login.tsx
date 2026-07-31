import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  Building2, Lock, Mail, RefreshCw, ShieldCheck, Eye, EyeOff,
  Key, Download, CheckCircle2, AlertTriangle, ArrowRight,
  Globe, Sparkles, FolderKanban, Receipt, LifeBuoy,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useMathCaptcha } from "@/lib/portal-auth";
import { $generateClientSecurityKey, $verifyClientSecurityKey } from "@/lib/mysql-api";
import { Button } from "@/components/ui/button";
import { COMPANY } from "@/lib/company";
const logo = "/devionic-logo.png";

const PORTAL_FEATURES = [
  { icon: FolderKanban, title: "Projects & Tasks", desc: "Track your projects, tasks and milestones live." },
  { icon: Receipt, title: "Invoices & Payments", desc: "View, download and pay invoices securely." },
  { icon: LifeBuoy, title: "Support Tickets", desc: "Raise and track support requests anytime." },
];

// Unique key used to trust a device per email
const TRUST_KEY = (email: string) => `portal:trusted:${email.toLowerCase()}`;

export const Route = createFileRoute("/portal/login")({
  head: () => ({
    meta: [
      { title: "Client Sign in — Devionic Portal" },
      { name: "description", content: "Devionic Client Portal sign-in. Access your projects, invoices, tickets and documents securely." },
      { property: "og:title", content: "Client Sign in — Devionic Portal" },
      { property: "og:description", content: "Secure self-service login for Devionic clients." },
    ],
  }),
  component: PortalLoginPage,
});

type Stage =
  | "credentials"        // email + password + captcha
  | "generate-key"       // first login: show generated key + download
  | "verify-key"         // returning login: enter security key
  | "done";

function PortalLoginPage() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const captcha = useMathCaptcha();

  const [stage, setStage] = useState<Stage>("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [answer, setAnswer] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [keepSigned, setKeepSigned] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // After login – user id returned from auth
  const [loggedUserId, setLoggedUserId] = useState<number | null>(null);

  // Stage: generate-key
  const [generatedKey, setGeneratedKey] = useState("");
  const [keyConfirmed, setKeyConfirmed] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Stage: verify-key
  const [securityKeyInput, setSecurityKeyInput] = useState("");
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    if (user) navigate({ to: "/portal" });
  }, [user, navigate]);

  // ── Step 1: credentials ───────────────────────────────────────────────────

  const handleCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (Number(answer) !== captcha.answer) {
      setError("Captcha answer is incorrect. Please try again.");
      captcha.refresh();
      setAnswer("");
      return;
    }

    setSubmitting(true);
    try {
      // login() from useAuth stores session, returns user info
      const result = await login(email.trim(), password) as any;
      const userId = result?.user?.id ?? result?.id ?? null;
      const hasClientKey: boolean = result?.has_client_key ?? false;

      setLoggedUserId(userId);

      // Check device trust
      const isTrusted = !!localStorage.getItem(TRUST_KEY(email.trim()));

      if (!hasClientKey) {
        // First login – generate a key
        setStage("generate-key");
        if (userId) {
          setGenerating(true);
          try {
            const res = await $generateClientSecurityKey({ data: { userId } });
            setGeneratedKey(res.key);
          } finally {
            setGenerating(false);
          }
        }
      } else if (keepSigned && isTrusted) {
        // Device is trusted – go straight in
        setStage("done");
        navigate({ to: "/portal" });
      } else {
        // Key exists but device not trusted – ask for key
        setStage("verify-key");
      }
    } catch (err: any) {
      setError(err?.message ?? "Sign in failed");
      captcha.refresh();
      setAnswer("");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Step 2a: user saves/downloads key, confirms, proceeds ─────────────────

  const downloadKey = () => {
    const blob = new Blob(
      [`Devionic Client Portal Security Key\nEmail: ${email}\n\n${generatedKey}\n\nKeep this file safe. You will need this key every time you sign in from a new device.`],
      { type: "text/plain" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `devionic-security-key-${email.replace(/@.+/, "")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const proceedAfterKey = () => {
    if (keepSigned) {
      localStorage.setItem(TRUST_KEY(email.trim()), "1");
    }
    setStage("done");
    navigate({ to: "/portal" });
  };

  // ── Step 2b: verify existing key ─────────────────────────────────────────

  const handleVerifyKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loggedUserId) return;
    setVerifying(true);
    setError(null);
    try {
      const res = await $verifyClientSecurityKey({ data: { userId: loggedUserId, key: securityKeyInput.trim() } });
      if (res.valid) {
        if (keepSigned) {
          localStorage.setItem(TRUST_KEY(email.trim()), "1");
        }
        setStage("done");
        navigate({ to: "/portal" });
      } else {
        setError("Security key is incorrect. Please check your saved key file and try again.");
      }
    } catch (err: any) {
      setError(err?.message ?? "Verification failed");
    } finally {
      setVerifying(false);
    }
  };

  // ──────────────────────────────────────────────────────────────────────────

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

      <div className="relative w-full max-w-6xl rounded-[2rem] bg-card/95 backdrop-blur shadow-[0_30px_80px_-20px_oklch(0.3_0.05_240/0.35)] overflow-hidden grid lg:grid-cols-[1.05fr_1fr] min-h-[500px] lg:min-h-[640px] border border-white/60">
        {/* Left brand panel - Hidden on mobile/tablet */}
        <div
          className="relative hidden lg:flex p-8 sm:p-12 text-white flex-col justify-between overflow-hidden"
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
              <img src={logo} alt="Devionic" className="h-10 w-auto brightness-0 invert" />
              <div className="hidden sm:block h-8 w-px bg-white/30" />
              <span className="hidden sm:inline text-[11px] tracking-[0.35em] text-white/80">
                CLIENT PORTAL
              </span>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[10px] tracking-widest text-white/90 border border-white/20">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 animate-pulse" />
              SECURE
            </span>
          </div>

          {/* Middle: hero */}
          <div className="relative max-w-md">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/20 px-3 py-1 text-[11px] tracking-wider text-white/90">
              <Sparkles className="h-3.5 w-3.5" />
              CLIENT SELF-SERVICE PORTAL
            </span>
            <h2 className="mt-5 text-4xl sm:text-5xl font-bold leading-[1.05]">
              Your projects &amp;<br />
              invoices — all in
              <span
                className="block bg-clip-text text-transparent"
                style={{
                  backgroundImage:
                    "linear-gradient(90deg, oklch(0.95 0.05 90), oklch(0.85 0.15 60))",
                }}
              >
                one place.
              </span>
            </h2>
            <p className="mt-4 text-sm sm:text-base text-white/85 leading-relaxed">
              Devionic gives every client a dedicated workspace — track projects, view invoices, raise tickets, and stay connected with your team.
            </p>

            <ul className="mt-8 space-y-4">
              {PORTAL_FEATURES.map(({ icon: Icon, title, desc }) => (
                <li key={title} className="flex items-start gap-3">
                  <span className="mt-0.5 grid place-items-center h-9 w-9 rounded-xl bg-white/10 border border-white/20 backdrop-blur">
                    <Icon className="h-4 w-4" />
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
              <span className="tracking-[0.25em]">DEVIONIC (PRIVATE) LIMITED</span>
            </div>
            <span>© {new Date().getFullYear()} All rights reserved</span>
          </div>
        </div>

        {/* Right form panel */}
        <div className="relative p-8 sm:p-12 lg:p-14 flex flex-col justify-center bg-card">
          <div className="mx-auto w-full max-w-md">

          {/* ── Stage: credentials ── */}
          {stage === "credentials" && (
            <>
              <div className="mb-8">
                {/* Mobile Logo */}
                <div className="lg:hidden mb-6 flex items-center gap-3">
                  <img src={logo} alt="Devionic" className="h-8 w-auto" />
                  <div className="h-6 w-px bg-border" />
                  <span className="text-[10px] tracking-[0.25em] text-muted-foreground">CLIENT PORTAL</span>
                </div>
                
                <p className="hidden lg:block text-[11px] font-semibold tracking-[0.3em] text-primary/70">
                  CLIENT PORTAL
                </p>
                <h1 className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
                  Sign in
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  Use the credentials shared with you by Devionic.
                </p>
              </div>

              <form onSubmit={handleCredentials} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground/80">Email address</label>
                  <div className="group flex items-center gap-3 rounded-xl border border-input bg-background px-4 py-3 transition focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10">
                    <Mail className="h-4 w-4 text-muted-foreground shrink-0 group-focus-within:text-primary transition" />
                    <input
                      type="email"
                      required
                      value={email}
                      autoFocus
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="client@company.com"
                      className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-foreground/80">Password / PIN</label>
                    <button
                      type="button"
                      className="text-xs font-medium text-primary hover:underline"
                      onClick={() => setError("Please contact your administrator to reset your password.")}
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
                    <button type="button" onClick={() => setShowPw((v) => !v)} className="text-muted-foreground hover:text-foreground transition">
                      {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Captcha */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground/80">Security check</label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 flex items-center gap-3 rounded-xl border border-input bg-muted/40 px-4 py-3 text-sm font-mono h-12">
                      <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
                      <span className="tracking-wider">{captcha.question}</span>
                      <button
                        type="button"
                        onClick={() => { captcha.refresh(); setAnswer(""); }}
                        className="ml-auto text-muted-foreground hover:text-foreground"
                        title="New question"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </button>
                    </div>
                    <input
                      type="number"
                      required
                      value={answer}
                      onChange={(e) => setAnswer(e.target.value)}
                      placeholder="Answer"
                      className={`w-24 rounded-xl border border-input bg-background text-sm text-center outline-none focus:ring-4 focus:ring-primary/10 h-12 ${
                        answer
                          ? Number(answer) === captcha.answer
                            ? "border-green-500 text-green-600 focus:border-green-500 focus:ring-green-500/10"
                            : "border-red-500 text-red-600 focus:border-red-500 focus:ring-red-500/10"
                          : "focus:border-primary"
                      }`}
                    />
                  </div>
                </div>

                {/* Keep me signed in */}
                <label className="inline-flex items-center gap-2 cursor-pointer select-none text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={keepSigned}
                    onChange={(e) => setKeepSigned(e.target.checked)}
                    className="h-4 w-4 rounded border-input accent-primary"
                  />
                  Keep me signed in on this device
                </label>

                {error && (
                  <div className="text-sm rounded-lg bg-destructive/10 text-destructive px-3 py-2.5 border border-destructive/20 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-xl py-6 text-sm font-semibold tracking-wide text-white shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 transition-all"
                  style={{ background: "linear-gradient(135deg, oklch(0.62 0.14 195), oklch(0.42 0.10 220))" }}
                >
                  {submitting ? "Signing in…" : "Sign in to portal"}
                </Button>
              </form>
            </>
          )}

          {/* ── Stage: generate-key (First login) ── */}
          {stage === "generate-key" && (
            <div className="space-y-6">
              <div>
                <p className="text-[11px] font-semibold tracking-[0.3em] text-primary/70">FIRST TIME LOGIN</p>
                <h1 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                  Save your Security Key
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  A unique 32-character security key has been generated for your account. <strong>Download and keep it safe</strong> — you will need it every time you sign in from a new device.
                </p>
              </div>

              {generating ? (
                <div className="flex items-center justify-center py-12">
                  <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                </div>
              ) : (
                <>
                  <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-4 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wider">
                      <Key className="h-3.5 w-3.5" />
                      Your Security Key
                    </div>
                    <div className="font-mono text-sm break-all bg-background rounded-lg p-3 border border-input select-all text-foreground leading-relaxed tracking-wider">
                      {generatedKey}
                    </div>
                    <p className="text-[11px] text-muted-foreground">Click the key to select all, then copy it.</p>
                  </div>

                  <Button
                    onClick={downloadKey}
                    variant="outline"
                    className="w-full rounded-xl gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Download Security Key (.txt)
                  </Button>

                  <label className="flex items-start gap-3 cursor-pointer select-none rounded-xl border border-input p-4 hover:bg-muted/30 transition">
                    <input
                      type="checkbox"
                      checked={keyConfirmed}
                      onChange={(e) => setKeyConfirmed(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-input accent-primary shrink-0"
                    />
                    <span className="text-sm text-muted-foreground">
                      I have saved/downloaded my security key and understand I will need it to sign in from new devices.
                    </span>
                  </label>

                  <Button
                    onClick={proceedAfterKey}
                    disabled={!keyConfirmed}
                    className="w-full rounded-xl py-6 text-sm font-semibold tracking-wide text-white shadow-lg shadow-primary/20 hover:shadow-xl hover:-translate-y-0.5 transition-all"
                    style={{ background: "linear-gradient(135deg, oklch(0.62 0.14 195), oklch(0.42 0.10 220))" }}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    I've saved it — Continue to Portal
                  </Button>
                </>
              )}
            </div>
          )}

          {/* ── Stage: verify-key ── */}
          {stage === "verify-key" && (
            <div className="space-y-6">
              <div>
                <p className="text-[11px] font-semibold tracking-[0.3em] text-primary/70">SECURITY VERIFICATION</p>
                <h1 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                  Enter your Security Key
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  Enter the 32-character security key you received on your first login to verify your identity.
                </p>
              </div>

              <form onSubmit={handleVerifyKey} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground/80">Security Key</label>
                  <textarea
                    required
                    value={securityKeyInput}
                    onChange={(e) => setSecurityKeyInput(e.target.value)}
                    placeholder="Paste your 32-character security key here…"
                    rows={3}
                    className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm font-mono focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary resize-none tracking-wider"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Find this in the file you downloaded during your first login.
                  </p>
                </div>

                {error && (
                  <div className="text-sm rounded-lg bg-destructive/10 text-destructive px-3 py-2.5 border border-destructive/20 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={verifying || securityKeyInput.trim().length < 10}
                  className="w-full rounded-xl py-6 text-sm font-semibold tracking-wide text-white shadow-lg shadow-primary/20 hover:shadow-xl hover:-translate-y-0.5 transition-all"
                  style={{ background: "linear-gradient(135deg, oklch(0.62 0.14 195), oklch(0.42 0.10 220))" }}
                >
                  {verifying ? "Verifying…" : <><ShieldCheck className="h-4 w-4 mr-2" />Verify & Enter Portal</>}
                </Button>

                <button
                  type="button"
                  onClick={() => { setStage("credentials"); setError(null); setSecurityKeyInput(""); }}
                  className="w-full text-xs text-muted-foreground hover:text-foreground text-center"
                >
                  ← Back to sign in
                </button>
              </form>
            </div>
          )}

          <div className="mt-8 space-y-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-[10px] tracking-widest uppercase">
                <span className="bg-card px-2 text-muted-foreground">New to Devionic?</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button 
                type="button" 
                variant="outline" 
                className="w-full rounded-xl text-xs bg-muted/30 border-dashed hover:bg-muted/50 hover:border-solid transition-all"
                onClick={() => navigate({ to: "/portal/register", search: { type: "business" } })}
              >
                Register as Business
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                className="w-full rounded-xl text-xs bg-muted/30 border-dashed hover:bg-muted/50 hover:border-solid transition-all"
                onClick={() => navigate({ to: "/portal/register", search: { type: "individual" } })}
              >
                Register as Individual
              </Button>
            </div>

            <p className="text-center text-xs text-muted-foreground">
              Trouble signing in? Contact{" "}
              <a href={`mailto:${COMPANY.email}`} className="font-medium text-primary hover:underline">
                {COMPANY.email}
              </a>
            </p>
          </div>
        </div>
        </div>
      </div>

      <p className="relative mt-6 text-xs sm:text-sm text-muted-foreground text-center px-4">
        Devionic (Private) Limited · Head Office, Multan Road Chowk Azam, Tehsil &amp; District Layyah, Punjab, Pakistan — 31450<br className="hidden sm:block" />
        +92-317-7121841 ·{" "}
        <a href="https://www.devionic.com" target="_blank" rel="noreferrer" className="hover:text-foreground transition">www.devionic.com</a> ·{" "}
        <a href="mailto:info@devionic.com" className="hover:text-foreground transition">info@devionic.com</a> · NTN H534200 · SECP CUIN 0308965
      </p>
    </div>
  );
}
