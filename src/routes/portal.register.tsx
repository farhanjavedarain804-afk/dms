import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Globe, Sparkles, FolderKanban, Receipt, LifeBuoy,
  UserPlus, Mail, Lock, Phone, Building2, User, MapPin
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { COMPANY } from "@/lib/company";
import { $registerPortalClient } from "@/lib/mysql-api";
import { useAuth } from "@/lib/auth";

const logo = "/devionic-logo.png";

const PORTAL_FEATURES = [
  { icon: FolderKanban, title: "Projects & Tasks", desc: "Track your projects, tasks and milestones live." },
  { icon: Receipt, title: "Invoices & Payments", desc: "View, download and pay invoices securely." },
  { icon: LifeBuoy, title: "Support Tickets", desc: "Raise and track support requests anytime." },
];

export const Route = createFileRoute("/portal/register")({
  head: () => ({
    meta: [
      { title: "Register Account — Devionic Portal" },
      { name: "description", content: "Register a new Devionic Client Portal account." },
    ],
  }),
  component: PortalRegisterPage,
});

function PortalRegisterPage() {
  const navigate = useNavigate();
  const search = Route.useSearch() as { type?: 'business' | 'individual' };
  const type = search.type === 'business' ? 'business' : 'individual';
  const { login } = useAuth();

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirm: "",
    company: "",
    country: "",
    state: "",
    city: "",
    address: "",
    postal_code: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (form.password !== form.confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      // Create user and client
      await $registerPortalClient({ data: {
        email: form.email,
        password: form.password,
        name: form.name,
        phone: form.phone,
        company: type === 'business' ? form.company : undefined,
        country: form.country,
        state: form.state,
        city: form.city,
        address: form.address,
        postal_code: form.postal_code,
        type
      }});

      // Auto login after registration
      await login(form.email, form.password);
      navigate({ to: '/portal' });
    } catch (err: any) {
      setError(err?.message ?? "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="h-[100dvh] w-full relative overflow-hidden flex flex-col justify-center items-center p-4 sm:p-6"
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

      <div className="relative w-full max-w-6xl rounded-[2rem] bg-card/95 backdrop-blur shadow-[0_30px_80px_-20px_oklch(0.3_0.05_240/0.35)] overflow-hidden grid lg:grid-cols-[1.05fr_1fr] h-[calc(100dvh-6rem)] lg:h-[85dvh] min-h-[500px] border border-white/60">
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
              CREATE AN ACCOUNT
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
        <div className="relative p-6 sm:p-10 lg:p-12 flex flex-col justify-center bg-card overflow-y-auto">
          <div className="mx-auto w-full max-w-md my-auto py-4">

            <div className="mb-8">
              {/* Mobile Logo */}
              <div className="lg:hidden mb-6 flex items-center gap-3">
                <img src={logo} alt="Devionic" className="h-8 w-auto" />
                <div className="h-6 w-px bg-border" />
                <span className="text-[10px] tracking-[0.25em] text-muted-foreground">CLIENT PORTAL</span>
              </div>
              
              <div className="flex items-center gap-2 mb-2">
                <div className="bg-primary/10 p-1.5 rounded-lg text-primary">
                  {type === 'business' ? <Building2 className="h-4 w-4" /> : <User className="h-4 w-4" />}
                </div>
                <p className="text-[11px] font-semibold tracking-[0.3em] text-primary/70">
                  {type === 'business' ? 'BUSINESS ACCOUNT' : 'INDIVIDUAL ACCOUNT'}
                </p>
              </div>
              
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
                Register
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Set up your self-service portal to access your projects.
              </p>
            </div>

            <div className="flex items-center bg-muted/30 p-1 rounded-xl mb-6">
              <button
                onClick={() => navigate({ to: '/portal/register', search: { type: 'business' } })}
                className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-medium rounded-lg transition-all ${
                  type === 'business' ? 'bg-background shadow-sm border text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Building2 className="h-3.5 w-3.5" /> Business
              </button>
              <button
                onClick={() => navigate({ to: '/portal/register', search: { type: 'individual' } })}
                className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-medium rounded-lg transition-all ${
                  type === 'individual' ? 'bg-background shadow-sm border text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <User className="h-3.5 w-3.5" /> Individual
              </button>
            </div>

            {error && (
              <div className="mb-6 text-sm rounded-lg bg-destructive/10 text-destructive px-3 py-2.5 border border-destructive/20">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              
              {type === 'business' && (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-foreground/80 tracking-wide uppercase">Company Name</label>
                  <div className="group flex items-center gap-3 rounded-xl border border-input bg-background px-4 py-2.5 transition focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10">
                    <Building2 className="h-4 w-4 text-muted-foreground shrink-0 group-focus-within:text-primary transition" />
                    <input
                      required
                      type="text"
                      value={form.company}
                      onChange={(e) => setForm(f => ({ ...f, company: e.target.value }))}
                      placeholder="e.g. Acme Corp"
                      className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-foreground/80 tracking-wide uppercase">
                  {type === 'business' ? 'Contact Person Name' : 'Full Name'}
                </label>
                <div className="group flex items-center gap-3 rounded-xl border border-input bg-background px-4 py-2.5 transition focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10">
                  <User className="h-4 w-4 text-muted-foreground shrink-0 group-focus-within:text-primary transition" />
                  <input
                    required
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="John Doe"
                    className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-foreground/80 tracking-wide uppercase">Email Address</label>
                  <div className="group flex items-center gap-3 rounded-xl border border-input bg-background px-4 py-2.5 transition focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10">
                    <Mail className="h-4 w-4 text-muted-foreground shrink-0 group-focus-within:text-primary transition" />
                    <input
                      required
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                      placeholder="you@example.com"
                      className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground w-full"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-foreground/80 tracking-wide uppercase">Phone Number</label>
                  <div className="group flex items-center gap-3 rounded-xl border border-input bg-background px-4 py-2.5 transition focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10">
                    <Phone className="h-4 w-4 text-muted-foreground shrink-0 group-focus-within:text-primary transition" />
                    <input
                      required
                      type="tel"
                      value={form.phone}
                      onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))}
                      placeholder="+92 300 1234567"
                      className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground w-full"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-foreground/80 tracking-wide uppercase">Street Address</label>
                <div className="group flex items-center gap-3 rounded-xl border border-input bg-background px-4 py-2.5 transition focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10">
                  <MapPin className="h-4 w-4 text-muted-foreground shrink-0 group-focus-within:text-primary transition" />
                  <input
                    required
                    type="text"
                    value={form.address}
                    onChange={(e) => setForm(f => ({ ...f, address: e.target.value }))}
                    placeholder="123 Main Street"
                    className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-foreground/80 tracking-wide uppercase">City</label>
                  <div className="group flex items-center gap-3 rounded-xl border border-input bg-background px-4 py-2.5 transition focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10">
                    <input
                      required
                      type="text"
                      value={form.city}
                      onChange={(e) => setForm(f => ({ ...f, city: e.target.value }))}
                      placeholder="Lahore"
                      className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground w-full"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-foreground/80 tracking-wide uppercase">State / Province</label>
                  <div className="group flex items-center gap-3 rounded-xl border border-input bg-background px-4 py-2.5 transition focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10">
                    <input
                      required
                      type="text"
                      value={form.state}
                      onChange={(e) => setForm(f => ({ ...f, state: e.target.value }))}
                      placeholder="Punjab"
                      className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground w-full"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-foreground/80 tracking-wide uppercase">Country</label>
                  <div className="group flex items-center gap-3 rounded-xl border border-input bg-background px-4 py-2.5 transition focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10">
                    <Globe className="h-4 w-4 text-muted-foreground shrink-0 group-focus-within:text-primary transition" />
                    <input
                      required
                      type="text"
                      value={form.country}
                      onChange={(e) => setForm(f => ({ ...f, country: e.target.value }))}
                      placeholder="Pakistan"
                      className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground w-full"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-foreground/80 tracking-wide uppercase">Postal Code</label>
                  <div className="group flex items-center gap-3 rounded-xl border border-input bg-background px-4 py-2.5 transition focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10">
                    <input
                      required
                      type="text"
                      value={form.postal_code}
                      onChange={(e) => setForm(f => ({ ...f, postal_code: e.target.value }))}
                      placeholder="54000"
                      className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground w-full"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-foreground/80 tracking-wide uppercase">Password</label>
                  <div className="group flex items-center gap-3 rounded-xl border border-input bg-background px-4 py-2.5 transition focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10">
                    <Lock className="h-4 w-4 text-muted-foreground shrink-0 group-focus-within:text-primary transition" />
                    <input
                      required
                      type="password"
                      value={form.password}
                      onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))}
                      placeholder="••••••••"
                      className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground w-full"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-foreground/80 tracking-wide uppercase">Confirm</label>
                  <div className="group flex items-center gap-3 rounded-xl border border-input bg-background px-4 py-2.5 transition focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10">
                    <Lock className="h-4 w-4 text-muted-foreground shrink-0 group-focus-within:text-primary transition" />
                    <input
                      required
                      type="password"
                      value={form.confirm}
                      onChange={(e) => setForm(f => ({ ...f, confirm: e.target.value }))}
                      placeholder="••••••••"
                      className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground w-full"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl py-6 text-sm font-semibold tracking-wide text-white shadow-lg shadow-primary/20 hover:shadow-xl hover:-translate-y-0.5 transition-all"
                  style={{ background: "linear-gradient(135deg, oklch(0.62 0.14 195), oklch(0.42 0.10 220))" }}
                >
                  {loading ? "Registering…" : <><UserPlus className="h-4 w-4 mr-2" /> Complete Registration</>}
                </Button>
              </div>
            </form>

            <div className="mt-8 text-center">
              <p className="text-xs text-muted-foreground">
                Already have an account?{" "}
                <Link to="/portal/login" className="font-medium text-primary hover:underline">
                  Sign in here
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>

      <p className="absolute bottom-3 left-0 w-full mt-4 text-[10px] sm:text-xs text-muted-foreground text-center px-4 pointer-events-none">
        Devionic (Private) Limited · Head Office, Multan Road Chowk Azam, Tehsil &amp; District Layyah, Punjab, Pakistan — 31450<br className="hidden sm:block" />
        <span className="pointer-events-auto">
          +92-317-7121841 ·{" "}
          <a href="https://www.devionic.com" target="_blank" rel="noreferrer" className="hover:text-foreground transition">www.devionic.com</a> ·{" "}
          <a href="mailto:info@devionic.com" className="hover:text-foreground transition">info@devionic.com</a> · NTN H534200 · SECP CUIN 0308965
        </span>
      </p>
    </div>
  );
}
