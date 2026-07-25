import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { User, Lock, Save } from "lucide-react";
import { usePortalIdentity } from "@/lib/portal-auth";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/portal/profile")({
  head: () => ({
    meta: [
      { title: "Profile & Settings — Devionic Portal" },
      { name: "description", content: "Manage your profile and portal preferences." },
      { property: "og:title", content: "Profile & Settings — Devionic Portal" },
      { property: "og:description", content: "Manage your profile and portal preferences." },
    ],
  }),
  component: PortalProfile,
});

const PREF_KEY = "dms:portal_profile_prefs";

function PortalProfile() {
  const ident = usePortalIdentity();
  const { user } = useAuth();
  const [prefs, setPrefs] = useState({ notify_email: true, notify_updates: true, phone: "" });

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(PREF_KEY);
      if (raw) setPrefs({ ...prefs, ...JSON.parse(raw) });
    } catch { /* noop */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = () => {
    window.localStorage.setItem(PREF_KEY, JSON.stringify(prefs));
    toast.success("Preferences saved");
  };

  return (
    <div className="space-y-4 max-w-3xl">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Profile & Settings</h2>
        <p className="text-sm text-muted-foreground">Your account details and portal preferences.</p>
      </div>

      <section className="rounded-xl border bg-card p-5 space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold"><User className="h-4 w-4" /> Profile</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <Field label="Name" value={ident.name || user?.name || "—"} />
          <Field label="Email" value={ident.email || user?.email || "—"} />
          <Field label="Company" value={ident.company || "—"} />
          <Field label="Role" value={user?.role || "Client"} />
        </div>
      </section>

      <section className="rounded-xl border bg-card p-5 space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold"><Lock className="h-4 w-4" /> Security</div>
        <p className="text-xs text-muted-foreground">To change your password, use the "Forgot password" link on the sign-in page or contact your account manager.</p>
      </section>

      <section className="rounded-xl border bg-card p-5 space-y-4">
        <div className="text-sm font-semibold">Preferences</div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={prefs.notify_email} onChange={(e) => setPrefs({ ...prefs, notify_email: e.target.checked })} />
          Email me billing & invoice updates
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={prefs.notify_updates} onChange={(e) => setPrefs({ ...prefs, notify_updates: e.target.checked })} />
          Notify me about project progress
        </label>
        <div>
          <label className="text-xs text-muted-foreground">Phone (optional)</label>
          <input value={prefs.phone} onChange={(e) => setPrefs({ ...prefs, phone: e.target.value })} className="mt-1 w-full h-10 rounded-md border bg-background px-3 text-sm" />
        </div>
        <Button onClick={save}><Save className="h-4 w-4 mr-1" /> Save preferences</Button>
      </section>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/30 px-3 py-2">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-sm font-medium truncate">{value}</div>
    </div>
  );
}
