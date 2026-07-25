import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Building2, Lock, Mail, RefreshCw, ShieldCheck, ArrowRight, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useMathCaptcha } from "@/lib/portal-auth";
import { Button } from "@/components/ui/button";
import { COMPANY } from "@/lib/company";

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

function PortalLoginPage() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const captcha = useMathCaptcha();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [answer, setAnswer] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) navigate({ to: "/portal" });
  }, [user, navigate]);

  const submit = async (e: React.FormEvent) => {
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
      await login(email.trim(), password);
      navigate({ to: "/portal" });
    } catch (err: any) {
      setError(err?.message ?? "Sign in failed");
      captcha.refresh();
      setAnswer("");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      <div className="hidden lg:flex flex-col justify-between p-10 bg-gradient-to-br from-primary/90 to-primary text-primary-foreground">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-white/15 grid place-items-center">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm opacity-80">{COMPANY.short_name}</div>
            <div className="text-lg font-semibold">Client Portal</div>
          </div>
        </div>
        <div className="space-y-4 max-w-md">
          <h1 className="text-3xl font-bold leading-tight">Your projects, invoices & support in one secure workspace.</h1>
          <p className="text-sm opacity-90">
            Track project milestones, download invoices & documents, open support tickets and book meetings — 24/7.
          </p>
          <ul className="text-sm space-y-2 opacity-95">
            <li className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Encrypted, role-based access</li>
            <li className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Real-time sync with Devionic teams</li>
            <li className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Captcha-protected sign in</li>
          </ul>
        </div>
        <div className="text-xs opacity-80">© {new Date().getFullYear()} {COMPANY.name}</div>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md space-y-6">
          <div className="lg:hidden flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 grid place-items-center text-primary">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">{COMPANY.short_name}</div>
              <div className="text-base font-semibold">Client Portal</div>
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Sign in to your portal</h2>
            <p className="text-sm text-muted-foreground mt-1">Use the credentials shared with you by Devionic.</p>
          </div>

          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 text-destructive text-sm px-3 py-2">
              {error}
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Email</label>
              <div className="mt-1 relative">
                <Mail className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="client@company.com"
                  className="w-full pl-9 pr-3 h-10 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">Password</label>
              <div className="mt-1 relative">
                <Lock className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type={showPw ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-10 h-10 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">Security check</label>
              <div className="mt-1 flex items-center gap-2">
                <div className="flex-1 flex items-center gap-3 h-10 rounded-md border bg-muted/40 px-3 text-sm font-mono">
                  <ShieldCheck className="h-4 w-4 text-primary" />
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
                  className="w-24 h-10 rounded-md border bg-background text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">Solve the arithmetic to prove you're human.</p>
            </div>

            <Button type="submit" disabled={submitting} className="w-full h-10">
              {submitting ? "Signing in…" : (<span className="inline-flex items-center gap-2">Sign in <ArrowRight className="h-4 w-4" /></span>)}
            </Button>
          </form>

          <div className="text-xs text-muted-foreground text-center">
            Trouble signing in? Contact <a className="text-primary underline" href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>
          </div>
        </div>
      </div>
    </div>
  );
}
