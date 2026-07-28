import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppLayout, PageHeader } from "@/components/dms/Layout";
import { useAuth } from "@/lib/auth";
import { COMPANY } from "@/lib/company";
import { db } from "@/lib/db-client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  User as UserIcon, Building2, Palette, Bell, Shield, Cloud, Info, Copy, Check,
  Sun, Moon, Monitor, LogOut, KeyRound, Mail, Phone, Globe, MapPin, Fingerprint,
  Sparkles, Save, ExternalLink, Languages, Clock, Calendar as CalendarIcon,
  DollarSign, Zap, ShieldCheck, Camera, Trash2, Plus, Landmark, Star, StarOff,
  Send, Eye, EyeOff, PlugZap, AtSign, Download, Upload, QrCode, RefreshCcw,
  Percent, Hash, Layers, AlertTriangle, ScanLine, Wand2, Link2, Rocket,
} from "lucide-react";
import { toast } from "sonner";
import { ACCENTS, ACCENT_LABEL, applyAccent, type AccentKey } from "@/lib/accent";
import { sendEmailViaConfig } from "@/lib/email-config.functions";
import { useServerFn } from "@tanstack/react-start";
import { $setLoginPin } from "@/lib/mysql-api";
import {
  generateConfigKey, loadStoredConfig, saveStoredConfig, clearStoredConfig,
  decodeConfigKey, saveAppliedConfig, loadAppliedConfig, setupUrlFor,
  type AppConfig,
} from "@/lib/app-config-key";


export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — Devionic DMS" }] }),
  component: SettingsPage,
});

const PREFS_KEY = "dms:preferences";
const NOTIF_KEY = "dms:notifications";
const COMPANY_KEY = "dms:company";
const EMAIL_KEY = "dms:email";
const SYSTEM_KEY = "dms:system";
const SECURITY_KEY = "dms:security";
const APP_VERSION = "2.7.0";

// ---------- System-wide preferences ----------
type SystemCfg = {
  fiscalYearStartMonth: number; // 1..12  (Pakistan default: July = 7)
  fiscalYearStartDay: number; // 1..31
  invoicePrefix: string;
  invoiceNextNumber: number;
  invoicePadding: number; // e.g. 4 => 0001
  receiptPrefix: string;
  receiptNextNumber: number;
  receiptPadding: number;
  defaultTaxRate: number; // %
  taxLabel: string; // e.g. "GST"
  taxInclusive: boolean;
  workingDays: { mon: boolean; tue: boolean; wed: boolean; thu: boolean; fri: boolean; sat: boolean; sun: boolean };
  workDayStart: string; // "09:00"
  workDayEnd: string; // "18:00"
  holidays: { id: string; date: string; name: string }[];
};
const DEFAULT_SYSTEM: SystemCfg = {
  fiscalYearStartMonth: 7,
  fiscalYearStartDay: 1,
  invoicePrefix: "INV-",
  invoiceNextNumber: 1001,
  invoicePadding: 4,
  receiptPrefix: "RCP-",
  receiptNextNumber: 1,
  receiptPadding: 4,
  defaultTaxRate: 17,
  taxLabel: "GST",
  taxInclusive: false,
  workingDays: { mon: true, tue: true, wed: true, thu: true, fri: true, sat: true, sun: false },
  workDayStart: "09:00",
  workDayEnd: "18:00",
  holidays: [
    { id: "h1", date: "2026-03-23", name: "Pakistan Day" },
    { id: "h2", date: "2026-08-14", name: "Independence Day" },
    { id: "h3", date: "2026-12-25", name: "Quaid-e-Azam Day" },
  ],
};
function loadSystem(): SystemCfg {
  try { return { ...DEFAULT_SYSTEM, ...JSON.parse(localStorage.getItem(SYSTEM_KEY) || "{}") }; }
  catch { return DEFAULT_SYSTEM; }
}

// ---------- 2FA & Login security ----------
type SecurityCfg = {
  twoFAEnabled: boolean;
  twoFASecret: string; // base32
  twoFAVerifiedAt: string;
  backupCodes: string[]; // one-time codes
  loginAlerts: boolean; // email on new login
  sessionTimeoutMin: number; // auto-logout after idle
  requireStrongPasswords: boolean;
};
const DEFAULT_SECURITY: SecurityCfg = {
  twoFAEnabled: false,
  twoFASecret: "",
  twoFAVerifiedAt: "",
  backupCodes: [],
  loginAlerts: true,
  sessionTimeoutMin: 30,
  requireStrongPasswords: true,
};
function loadSecurity(): SecurityCfg {
  try { return { ...DEFAULT_SECURITY, ...JSON.parse(localStorage.getItem(SECURITY_KEY) || "{}") }; }
  catch { return DEFAULT_SECURITY; }
}

type EmailCfg = {
  enabled: boolean;
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
  fromEmail: string;
  fromName: string;
  replyTo: string;
  autoSend: boolean;
  lastTestAt: string;
  lastTestOk: boolean | null;
};
const DEFAULT_EMAIL: EmailCfg = {
  enabled: false,
  host: "",
  port: 587,
  secure: false,
  username: "",
  password: "",
  fromEmail: "",
  fromName: "Devionic",
  replyTo: "",
  autoSend: true,
  lastTestAt: "",
  lastTestOk: null,
};
function loadEmail(): EmailCfg {
  try { return { ...DEFAULT_EMAIL, ...JSON.parse(localStorage.getItem(EMAIL_KEY) || "{}") }; }
  catch { return DEFAULT_EMAIL; }
}

const SMTP_PRESETS: { label: string; host: string; port: number; secure: boolean }[] = [
  { label: "Gmail", host: "smtp.gmail.com", port: 465, secure: true },
  { label: "Outlook / Microsoft 365", host: "smtp.office365.com", port: 587, secure: false },
  { label: "Yahoo Mail", host: "smtp.mail.yahoo.com", port: 465, secure: true },
  { label: "Zoho Mail", host: "smtp.zoho.com", port: 465, secure: true },
  { label: "cPanel / Hostinger / Namecheap", host: "mail.yourdomain.com", port: 465, secure: true },
  { label: "Custom SMTP", host: "", port: 587, secure: false },
];

type Prefs = {
  displayName: string;
  avatarUrl: string;
  language: "en" | "ur" | "auto";
  dateFormat: "dd/mm/yyyy" | "mm/dd/yyyy" | "yyyy-mm-dd";
  timezone: string;
  currency: "PKR" | "USD" | "EUR" | "AED" | "GBP";
  weekStart: "monday" | "sunday" | "saturday";
  density: "comfortable" | "compact";
  accent: AccentKey;
};

type Notif = {
  emailDigest: boolean;
  taskAssigned: boolean;
  invoicePaid: boolean;
  ticketUpdates: boolean;
  systemAlerts: boolean;
  sounds: boolean;
};

type BankAccount = {
  id: string;
  title: string;
  bank_name: string;
  branch: string;
  account_no: string;
  iban: string;
  swift: string;
  primary: boolean;
};

type CompanyOverrides = {
  tagline: string;
  banks: BankAccount[];
};

const DEFAULT_PREFS: Prefs = {
  displayName: "",
  avatarUrl: "",
  language: "auto",
  dateFormat: "dd/mm/yyyy",
  timezone: "Asia/Karachi",
  currency: "PKR",
  weekStart: "monday",
  density: "comfortable",
  accent: "teal",
};

const DEFAULT_NOTIF: Notif = {
  emailDigest: true,
  taskAssigned: true,
  invoicePaid: true,
  ticketUpdates: true,
  systemAlerts: true,
  sounds: false,
};

function safeParse(s: string | null) {
  if (!s) return null;
  try { return JSON.parse(s); } catch { return s; }
}

function defaultCompany(): CompanyOverrides {
  return {
    tagline: COMPANY.tagline,
    banks: [{ id: "primary", ...COMPANY.bank, primary: true }],
  };
}


function loadPrefs(): Prefs {
  try { return { ...DEFAULT_PREFS, ...JSON.parse(localStorage.getItem(PREFS_KEY) || "{}") }; }
  catch { return DEFAULT_PREFS; }
}
function loadNotif(): Notif {
  try { return { ...DEFAULT_NOTIF, ...JSON.parse(localStorage.getItem(NOTIF_KEY) || "{}") }; }
  catch { return DEFAULT_NOTIF; }
}
function loadCompany(): CompanyOverrides {
  try {
    const raw = JSON.parse(localStorage.getItem(COMPANY_KEY) || "null");
    if (!raw) return defaultCompany();
    const banks = Array.isArray(raw.banks) && raw.banks.length ? raw.banks : defaultCompany().banks;
    return { tagline: typeof raw.tagline === "string" ? raw.tagline : COMPANY.tagline, banks };
  } catch { return defaultCompany(); }
}

function SettingsPage() {
  const { user, logout } = useAuth();
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [notif, setNotif] = useState<Notif>(DEFAULT_NOTIF);
  const [company, setCompany] = useState<CompanyOverrides>(defaultCompany());
  const [theme, setTheme] = useState<"light" | "dark" | "system">("system");
  const [pwd1, setPwd1] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [savingPwd, setSavingPwd] = useState(false);
  const [loginPin, setLoginPinState] = useState("");
  const [savingPin, setSavingPin] = useState(false);
  const [copied, setCopied] = useState<string>("");
  const [email, setEmail] = useState<EmailCfg>(DEFAULT_EMAIL);
  const [showKey, setShowKey] = useState(false);
  const [testTo, setTestTo] = useState("");
  const [testing, setTesting] = useState(false);
  const sendTest = useServerFn(sendEmailViaConfig);

  // System-wide preferences
  const [system, setSystem] = useState<SystemCfg>(DEFAULT_SYSTEM);

  // Security / 2FA
  const [security, setSecurity] = useState<SecurityCfg>(DEFAULT_SECURITY);
  const [twoFAQr, setTwoFAQr] = useState<string>("");
  const [twoFAOtpauth, setTwoFAOtpauth] = useState<string>("");
  const [twoFACode, setTwoFACode] = useState("");
  const [twoFABusy, setTwoFABusy] = useState(false);

  // Backup
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    const p = loadPrefs();
    if (!p.displayName && user?.name) p.displayName = user.name;
    setPrefs(p);
    setNotif(loadNotif());
    setCompany(loadCompany());
    setEmail(loadEmail());
    setSystem(loadSystem());
    setSecurity(loadSecurity());
    const savedTheme = (localStorage.getItem("dms:theme") as "light" | "dark") || null;
    setTheme(savedTheme ?? "system");
    applyAccent(p.accent);
  }, [user?.name]);

  function saveEmail(next: EmailCfg) {
    setEmail(next);
    localStorage.setItem(EMAIL_KEY, JSON.stringify(next));
  }
  async function onSendTest() {
    if (!testTo) { toast.error("Enter a recipient"); return; }
    if (!email.host || !email.fromEmail) { toast.error("Fill SMTP host & From email first"); return; }
    setTesting(true);
    try {
      await sendTest({ data: {
        config: {
          host: email.host,
          port: Number(email.port) || 587,
          secure: !!email.secure,
          username: email.username,
          password: email.password,
          fromEmail: email.fromEmail,
          fromName: email.fromName,
          replyTo: email.replyTo || undefined,
        },
        to: testTo,
        subject: `Test email from ${COMPANY.name} DMS`,
        html: `<div style="font-family:Arial,sans-serif;padding:20px;color:#0f172a"><h2 style="color:#0d9488">${COMPANY.name} — Test Email</h2><p>This is a test email from your Devionic DMS. If you received this, your SMTP is configured correctly.</p><p style="color:#64748b;font-size:12px">Sent via SMTP ${email.host}:${email.port} at ${new Date().toLocaleString()}</p></div>`,
        text: `Test email from ${COMPANY.name} DMS. SMTP: ${email.host}:${email.port}. Time: ${new Date().toLocaleString()}`,
      }});
      saveEmail({ ...email, lastTestAt: new Date().toISOString(), lastTestOk: true });
      toast.success("Test email sent successfully");
    } catch (e: any) {
      saveEmail({ ...email, lastTestAt: new Date().toISOString(), lastTestOk: false });
      toast.error(e?.message || "Failed to send test email");
    } finally {
      setTesting(false);
    }
  }



  const initials = useMemo(
    () => (user?.name ?? "U").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase(),
    [user?.name]
  );

  function savePrefs(next: Prefs) {
    setPrefs(next);
    localStorage.setItem(PREFS_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent("dms:prefs", { detail: next }));
  }

  function saveCompany(next: CompanyOverrides) {
    setCompany(next);
    localStorage.setItem(COMPANY_KEY, JSON.stringify(next));
  }
  async function onAvatarPick(file: File) {
    if (!file.type.startsWith("image/")) { toast.error("Please select an image"); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error("Image must be under 2 MB"); return; }
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = reject;
      r.readAsDataURL(file);
    });
    savePrefs({ ...prefs, avatarUrl: dataUrl });
    db.auth.updateUser({ data: { avatar_url: dataUrl } }).catch(() => {});
    toast.success("Profile picture updated");
  }
  function removeAvatar() {
    savePrefs({ ...prefs, avatarUrl: "" });
    db.auth.updateUser({ data: { avatar_url: null } }).catch(() => {});
  }
  function addBank() {
    const b: BankAccount = {
      id: crypto.randomUUID(),
      title: COMPANY.name,
      bank_name: "",
      branch: "",
      account_no: "",
      iban: "",
      swift: "",
      primary: company.banks.length === 0,
    };
    saveCompany({ ...company, banks: [...company.banks, b] });
  }
  function updateBank(id: string, patch: Partial<BankAccount>) {
    saveCompany({ ...company, banks: company.banks.map((b) => b.id === id ? { ...b, ...patch } : b) });
  }
  function removeBank(id: string) {
    const next = company.banks.filter((b) => b.id !== id);
    if (next.length && !next.some((b) => b.primary)) next[0].primary = true;
    saveCompany({ ...company, banks: next });
  }
  function setPrimaryBank(id: string) {
    saveCompany({ ...company, banks: company.banks.map((b) => ({ ...b, primary: b.id === id })) });
  }

  function saveNotif(next: Notif) {
    setNotif(next);
    localStorage.setItem(NOTIF_KEY, JSON.stringify(next));
  }
  function applyTheme(t: "light" | "dark" | "system") {
    setTheme(t);
    const el = document.documentElement;
    if (t === "system") {
      localStorage.removeItem("dms:theme");
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      el.classList.toggle("dark", prefersDark);
    } else {
      el.classList.toggle("dark", t === "dark");
      localStorage.setItem("dms:theme", t);
    }
    toast.success(`Theme set to ${t}`);
  }
  async function copy(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(""), 1400);
    } catch { toast.error("Copy failed"); }
  }
  async function changePassword() {
    if (pwd1.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    if (pwd1 !== pwd2) { toast.error("Passwords do not match"); return; }
    setSavingPwd(true);
    try {
      const { error } = await db.auth.updateUser({ password: pwd1 });
      if (error) throw error;
      toast.success("Password updated");
      setPwd1(""); setPwd2("");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to update password");
    } finally { setSavingPwd(false); }
  }
  async function signOutEverywhere() {
    if (!confirm("Sign out of this session?")) return;
    await logout();
  }
  async function signOutAllDevices() {
    if (!confirm("Sign out on ALL your devices? This cannot be undone.")) return;
    try {
      await db.auth.signOut({ scope: "global" });
      toast.success("Signed out on all devices");
      await logout();
    } catch (e: any) {
      toast.error(e?.message || "Failed to sign out everywhere");
    }
  }

  // ---------- System-wide preferences ----------
  function saveSystem(next: SystemCfg) {
    setSystem(next);
    localStorage.setItem(SYSTEM_KEY, JSON.stringify(next));
  }
  function addHoliday() {
    const h = { id: crypto.randomUUID(), date: new Date().toISOString().slice(0, 10), name: "New Holiday" };
    saveSystem({ ...system, holidays: [...system.holidays, h] });
  }
  function updateHoliday(id: string, patch: Partial<{ date: string; name: string }>) {
    saveSystem({ ...system, holidays: system.holidays.map((h) => h.id === id ? { ...h, ...patch } : h) });
  }
  function removeHoliday(id: string) {
    saveSystem({ ...system, holidays: system.holidays.filter((h) => h.id !== id) });
  }
  function previewInvoiceNo() {
    return `${system.invoicePrefix}${String(system.invoiceNextNumber).padStart(system.invoicePadding, "0")}`;
  }
  function previewReceiptNo() {
    return `${system.receiptPrefix}${String(system.receiptNextNumber).padStart(system.receiptPadding, "0")}`;
  }

  // ---------- 2FA ----------
  function saveSecurity(next: SecurityCfg) {
    setSecurity(next);
    localStorage.setItem(SECURITY_KEY, JSON.stringify(next));
  }
  async function start2FASetup() {
    setTwoFABusy(true);
    try {
      const OTPAuth = await import("otpauth");
      const QRCode = (await import("qrcode")).default;
      const secret = new OTPAuth.Secret({ size: 20 });
      const totp = new OTPAuth.TOTP({
        issuer: COMPANY.name,
        label: user?.email || "user",
        algorithm: "SHA1",
        digits: 6,
        period: 30,
        secret,
      });
      const uri = totp.toString();
      const png = await QRCode.toDataURL(uri, { margin: 1, width: 240 });
      setTwoFAOtpauth(uri);
      setTwoFAQr(png);
      // stash pending secret (not yet enabled)
      saveSecurity({ ...security, twoFASecret: secret.base32, twoFAEnabled: false });
      toast.success("Scan the QR with Google Authenticator or Authy");
    } catch (e: any) {
      toast.error(e?.message || "Failed to start 2FA setup");
    } finally { setTwoFABusy(false); }
  }
  async function verifyAndEnable2FA() {
    if (!security.twoFASecret) { toast.error("Start setup first"); return; }
    if (!twoFACode || twoFACode.length < 6) { toast.error("Enter the 6-digit code"); return; }
    setTwoFABusy(true);
    try {
      const OTPAuth = await import("otpauth");
      const totp = new OTPAuth.TOTP({
        issuer: COMPANY.name,
        label: user?.email || "user",
        secret: OTPAuth.Secret.fromBase32(security.twoFASecret),
      });
      const delta = totp.validate({ token: twoFACode.trim(), window: 1 });
      if (delta === null) { toast.error("Invalid code — try again"); return; }
      // generate 8 one-time backup codes
      const backup = Array.from({ length: 8 }, () =>
        Math.random().toString(36).slice(2, 6).toUpperCase() + "-" + Math.random().toString(36).slice(2, 6).toUpperCase()
      );
      saveSecurity({ ...security, twoFAEnabled: true, twoFAVerifiedAt: new Date().toISOString(), backupCodes: backup });
      setTwoFACode(""); setTwoFAQr(""); setTwoFAOtpauth("");
      toast.success("2FA enabled — save your backup codes!");
    } catch (e: any) {
      toast.error(e?.message || "Verification failed");
    } finally { setTwoFABusy(false); }
  }
  function disable2FA() {
    if (!confirm("Disable two-factor authentication? Your account will be less secure.")) return;
    saveSecurity({ ...DEFAULT_SECURITY, loginAlerts: security.loginAlerts, sessionTimeoutMin: security.sessionTimeoutMin, requireStrongPasswords: security.requireStrongPasswords });
    setTwoFAQr(""); setTwoFAOtpauth(""); setTwoFACode("");
    toast.success("2FA disabled");
  }
  function regenerateBackupCodes() {
    if (!security.twoFAEnabled) { toast.error("Enable 2FA first"); return; }
    if (!confirm("Regenerate backup codes? Old codes will stop working.")) return;
    const backup = Array.from({ length: 8 }, () =>
      Math.random().toString(36).slice(2, 6).toUpperCase() + "-" + Math.random().toString(36).slice(2, 6).toUpperCase()
    );
    saveSecurity({ ...security, backupCodes: backup });
    toast.success("New backup codes generated");
  }

  // ---------- Backup & Restore ----------
  function exportBackup() {
    const payload = {
      app: "Devionic DMS",
      version: APP_VERSION,
      exportedAt: new Date().toISOString(),
      exportedBy: user?.email || "unknown",
      settings: {
        [PREFS_KEY]: safeParse(localStorage.getItem(PREFS_KEY)),
        [NOTIF_KEY]: safeParse(localStorage.getItem(NOTIF_KEY)),
        [COMPANY_KEY]: safeParse(localStorage.getItem(COMPANY_KEY)),
        [EMAIL_KEY]: safeParse(localStorage.getItem(EMAIL_KEY)),
        [SYSTEM_KEY]: safeParse(localStorage.getItem(SYSTEM_KEY)),
        [SECURITY_KEY]: safeParse(localStorage.getItem(SECURITY_KEY)),
      },
      allDmsKeys: Object.fromEntries(
        Object.keys(localStorage)
          .filter((k) => k.startsWith("dms:"))
          .map((k) => [k, safeParse(localStorage.getItem(k))])
      ),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `devionic-dms-backup-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    toast.success("Backup downloaded");
  }
  async function importBackup(file: File) {
    if (!confirm("Restore will overwrite your current settings. Continue?")) return;
    setImporting(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (data.app !== "Devionic DMS") throw new Error("This file is not a Devionic DMS backup");
      const map = data.allDmsKeys || data.settings || {};
      Object.entries(map).forEach(([k, v]) => {
        if (typeof k === "string" && k.startsWith("dms:")) {
          localStorage.setItem(k, JSON.stringify(v));
        }
      });
      toast.success("Backup restored — reloading…");
      setTimeout(() => window.location.reload(), 800);
    } catch (e: any) {
      toast.error(e?.message || "Failed to restore backup");
    } finally { setImporting(false); }
  }

  const saveLoginPin = async () => {
    if (!user) return;
    if (loginPin.length !== 4) {
      toast.error("PIN must be exactly 4 characters.");
      return;
    }
    setSavingPin(true);
    try {
      await $setLoginPin({ userId: user.id, pin: loginPin });
      toast.success("Login PIN updated successfully. You can now use it instead of your password.");
      setLoginPinState("");
    } catch (e: any) {
      toast.error(e.message || "Failed to set PIN");
    } finally {
      setSavingPin(false);
    }
  };

  function saveAll() {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    localStorage.setItem(NOTIF_KEY, JSON.stringify(notif));
    localStorage.setItem(COMPANY_KEY, JSON.stringify(company));
    localStorage.setItem(SYSTEM_KEY, JSON.stringify(system));
    saveSecurity(security);
    toast.success("Settings saved");
  }
  function resetAll() {
    if (!confirm("Reset preferences to defaults? This will not sign you out.")) return;
    savePrefs({ ...DEFAULT_PREFS, displayName: user?.name ?? "" });
    saveNotif(DEFAULT_NOTIF);
    saveCompany(defaultCompany());
    saveSystem(DEFAULT_SYSTEM);
    applyTheme("system");
    toast.success("Settings reset to defaults");
  }

  return (
    <AppLayout>
      <PageHeader
        title="Settings"
        description="Manage your profile, appearance, notifications, security & workspace preferences."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={resetAll}>Reset</Button>
            <Button size="sm" onClick={saveAll} className="gap-1"><Save className="h-4 w-4" /> Save all</Button>
          </div>
        }
      />

      {/* Identity banner */}
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/10 via-card to-card p-5 mb-5">
        <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            {prefs.avatarUrl ? (
              <img src={prefs.avatarUrl} alt="avatar" className="h-16 w-16 rounded-2xl object-cover shadow-lg shrink-0 border-2 border-primary/30" />
            ) : (
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary to-primary/60 text-primary-foreground grid place-items-center text-2xl font-bold shadow-lg shrink-0">
                {initials}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-semibold truncate">{user?.name ?? "Signed-in user"}</h2>
                <Badge variant="secondary" className="gap-1"><ShieldCheck className="h-3 w-3" /> {user?.role ?? "Member"}</Badge>
              </div>
              <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{COMPANY.name} · v{APP_VERSION}</p>
            </div>
          </div>
          <div className="flex gap-2 md:flex-col md:items-end">
            <Button variant="outline" size="sm" asChild>
              <Link to="/ai"><Sparkles className="h-4 w-4 mr-1" /> AI Assistant</Link>
            </Button>
            <Button variant="ghost" size="sm" className="text-destructive" onClick={signOutEverywhere}>
              <LogOut className="h-4 w-4 mr-1" /> Sign out
            </Button>
          </div>
        </div>
      </div>

      <Tabs defaultValue={typeof window !== "undefined" && new URLSearchParams(window.location.search).get("configure") ? "configurations" : "profile"} className="w-full">
        <TabsList className="grid grid-cols-3 md:grid-cols-6 lg:grid-cols-11 w-full mb-5 h-auto">
          <TabsTrigger value="profile" className="gap-1"><UserIcon className="h-4 w-4" /> Profile</TabsTrigger>
          <TabsTrigger value="company" className="gap-1"><Building2 className="h-4 w-4" /> Company</TabsTrigger>
          <TabsTrigger value="appearance" className="gap-1"><Palette className="h-4 w-4" /> Appearance</TabsTrigger>
          <TabsTrigger value="preferences" className="gap-1"><Languages className="h-4 w-4" /> Preferences</TabsTrigger>
          <TabsTrigger value="system" className="gap-1"><Layers className="h-4 w-4" /> System</TabsTrigger>
          <TabsTrigger value="email" className="gap-1"><Mail className="h-4 w-4" /> Email</TabsTrigger>
          <TabsTrigger value="notifications" className="gap-1"><Bell className="h-4 w-4" /> Notifications</TabsTrigger>
          <TabsTrigger value="security" className="gap-1"><Shield className="h-4 w-4" /> Security</TabsTrigger>
          <TabsTrigger value="configurations" className="gap-1"><PlugZap className="h-4 w-4" /> Configurations</TabsTrigger>
          <TabsTrigger value="backup" className="gap-1"><Download className="h-4 w-4" /> Backup</TabsTrigger>
          <TabsTrigger value="about" className="gap-1"><Info className="h-4 w-4" /> About</TabsTrigger>
        </TabsList>

        {/* PROFILE */}
        <TabsContent value="profile" className="space-y-5">
          <Section icon={<Camera className="h-4 w-4" />} title="Profile picture" description="PNG or JPG, up to 2 MB. Shown across the workspace.">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
              <div className="relative">
                {prefs.avatarUrl ? (
                  <img src={prefs.avatarUrl} alt="avatar" className="h-24 w-24 rounded-2xl object-cover border-2 border-primary/30 shadow" />
                ) : (
                  <div className="h-24 w-24 rounded-2xl bg-gradient-to-br from-primary to-primary/60 text-primary-foreground grid place-items-center text-3xl font-bold shadow">
                    {initials}
                  </div>
                )}
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex flex-wrap gap-2">
                  <label>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) onAvatarPick(f); e.target.value = ""; }}
                    />
                    <Button asChild size="sm" className="gap-1 cursor-pointer">
                      <span><Camera className="h-4 w-4" /> {prefs.avatarUrl ? "Change picture" : "Upload picture"}</span>
                    </Button>
                  </label>
                  {prefs.avatarUrl && (
                    <Button variant="outline" size="sm" onClick={removeAvatar} className="gap-1 text-destructive">
                      <Trash2 className="h-4 w-4" /> Remove
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">Stored locally in your browser and synced with your account metadata.</p>
              </div>
            </div>
          </Section>

          <Section icon={<UserIcon className="h-4 w-4" />} title="Your profile" description="How you appear inside Devionic DMS.">
            <div className="grid md:grid-cols-2 gap-4">
              <Field label="Display name">
                <Input value={prefs.displayName} onChange={(e) => savePrefs({ ...prefs, displayName: e.target.value })} placeholder="Your name" />
              </Field>
              <Field label="Email"><Input value={user?.email ?? ""} disabled /></Field>
              <Field label="Role"><Input value={user?.role ?? "Member"} disabled /></Field>
              <Field label="User ID">
                <div className="flex gap-2">
                  <Input value={user?.email ?? ""} disabled className="font-mono text-xs" />
                  <Button variant="outline" size="icon" onClick={() => copy(user?.email ?? "", "uid")} title="Copy">
                    {copied === "uid" ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </Field>
            </div>
          </Section>
        </TabsContent>

        {/* COMPANY */}
        <TabsContent value="company" className="space-y-5">
          <Section icon={<Building2 className="h-4 w-4" />} title="Company details" description="Used on invoices, letters and PDFs across the workspace.">
            <div className="grid md:grid-cols-2 gap-3">
              <InfoRow icon={<Building2 />} label="Legal name" value={COMPANY.name} onCopy={() => copy(COMPANY.name, "name")} copied={copied === "name"} />
              <InfoRow icon={<Fingerprint />} label="NTN" value={COMPANY.ntn} onCopy={() => copy(COMPANY.ntn, "ntn")} copied={copied === "ntn"} />
              <InfoRow icon={<Fingerprint />} label="SECP CUIN" value={COMPANY.secp_cuin} onCopy={() => copy(COMPANY.secp_cuin, "cuin")} copied={copied === "cuin"} />
              <InfoRow icon={<Fingerprint />} label="STRN" value={COMPANY.strn} onCopy={() => copy(COMPANY.strn, "strn")} copied={copied === "strn"} />
              <InfoRow icon={<Phone />} label="Phone" value={COMPANY.phone} onCopy={() => copy(COMPANY.phone, "phone")} copied={copied === "phone"} />
              <InfoRow icon={<Mail />} label="Email" value={COMPANY.email} onCopy={() => copy(COMPANY.email, "email")} copied={copied === "email"} />
              <InfoRow icon={<Globe />} label="Website" value={COMPANY.website} onCopy={() => copy(COMPANY.website, "web")} copied={copied === "web"} />
              <InfoRow icon={<MapPin />} label="Address" value={COMPANY.address} onCopy={() => copy(COMPANY.address, "addr")} copied={copied === "addr"} full />
            </div>
          </Section>

          <Section icon={<Sparkles className="h-4 w-4" />} title="Tagline" description="Short one-liner shown under the company name on letters and PDFs.">
            <div className="space-y-2">
              <Input
                value={company.tagline}
                onChange={(e) => saveCompany({ ...company, tagline: e.target.value })}
                placeholder="e.g. Software • ERP • Cloud Solutions"
                maxLength={120}
              />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{company.tagline.length}/120 characters</span>
                <button
                  className="underline hover:text-foreground"
                  onClick={() => saveCompany({ ...company, tagline: COMPANY.tagline })}
                >
                  Reset to default
                </button>
              </div>
            </div>
          </Section>

          <Section
            icon={<Landmark className="h-4 w-4" />}
            title="Bank accounts"
            description="Add multiple accounts. The primary one is used by default on invoices."
          >
            <div className="space-y-4">
              {company.banks.length === 0 && (
                <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                  No bank accounts yet. Add one below.
                </div>
              )}
              {company.banks.map((b, i) => (
                <div key={b.id} className="rounded-xl border bg-muted/10 p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary grid place-items-center shrink-0">
                        <Landmark className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold truncate">
                          {b.bank_name || `Account ${i + 1}`}
                        </div>
                        <div className="text-[11px] text-muted-foreground truncate">
                          {b.iban || b.account_no || "Not configured"}
                        </div>
                      </div>
                      {b.primary && (
                        <Badge className="gap-1 bg-amber-500 hover:bg-amber-500 text-white">
                          <Star className="h-3 w-3" /> Primary
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-1">
                      {!b.primary && (
                        <Button size="sm" variant="outline" onClick={() => setPrimaryBank(b.id)} className="gap-1">
                          <StarOff className="h-3.5 w-3.5" /> Set primary
                        </Button>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => { if (confirm("Remove this bank account?")) removeBank(b.id); }}
                        title="Remove"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-3">
                    <Field label="Account title">
                      <Input value={b.title} onChange={(e) => updateBank(b.id, { title: e.target.value })} placeholder="Account holder name" />
                    </Field>
                    <Field label="Bank name">
                      <Input value={b.bank_name} onChange={(e) => updateBank(b.id, { bank_name: e.target.value })} placeholder="e.g. Meezan Bank Limited" />
                    </Field>
                    <Field label="Branch">
                      <Input value={b.branch} onChange={(e) => updateBank(b.id, { branch: e.target.value })} placeholder="Branch name & city" />
                    </Field>
                    <Field label="Account #">
                      <Input value={b.account_no} onChange={(e) => updateBank(b.id, { account_no: e.target.value })} placeholder="0000-0000000000" />
                    </Field>
                    <Field label="IBAN">
                      <Input value={b.iban} onChange={(e) => updateBank(b.id, { iban: e.target.value.toUpperCase() })} placeholder="PK00XXXX0000000000000000" className="font-mono" />
                    </Field>
                    <Field label="SWIFT / BIC">
                      <Input value={b.swift} onChange={(e) => updateBank(b.id, { swift: e.target.value.toUpperCase() })} placeholder="e.g. MEZNPKKA" className="font-mono" />
                    </Field>
                  </div>
                </div>
              ))}
              <Button variant="outline" onClick={addBank} className="gap-1 w-full">
                <Plus className="h-4 w-4" /> Add another bank account
              </Button>
            </div>
          </Section>
        </TabsContent>

        {/* APPEARANCE */}
        <TabsContent value="appearance" className="space-y-5">
          <Section icon={<Palette className="h-4 w-4" />} title="Theme" description="Choose how Devionic DMS looks. System follows your OS.">
            <div className="grid grid-cols-3 gap-3">
              <ThemeTile active={theme === "light"} onClick={() => applyTheme("light")} icon={<Sun className="h-5 w-5" />} label="Light" />
              <ThemeTile active={theme === "dark"} onClick={() => applyTheme("dark")} icon={<Moon className="h-5 w-5" />} label="Dark" />
              <ThemeTile active={theme === "system"} onClick={() => applyTheme("system")} icon={<Monitor className="h-5 w-5" />} label="System" />
            </div>
          </Section>

          <Section icon={<Zap className="h-4 w-4" />} title="Density" description="Balance information density and visual comfort.">
            <div className="grid grid-cols-2 gap-3">
              <ThemeTile active={prefs.density === "comfortable"} onClick={() => savePrefs({ ...prefs, density: "comfortable" })} icon={<Monitor className="h-5 w-5" />} label="Comfortable" />
              <ThemeTile active={prefs.density === "compact"} onClick={() => savePrefs({ ...prefs, density: "compact" })} icon={<Monitor className="h-5 w-5" />} label="Compact" />
            </div>
          </Section>

          <Section icon={<Palette className="h-4 w-4" />} title="Accent color" description="Applies to buttons, badges, links and highlights across every module.">
            <div className="grid grid-cols-6 sm:grid-cols-6 md:grid-cols-12 gap-3">
              {(Object.keys(ACCENTS) as AccentKey[]).map((c) => {
                const active = prefs.accent === c;
                return (
                  <button
                    key={c}
                    onClick={() => { savePrefs({ ...prefs, accent: c }); applyAccent(c); }}
                    className={
                      "group flex flex-col items-center gap-1.5 rounded-xl p-2 transition " +
                      (active ? "bg-muted ring-2 ring-foreground/70" : "hover:bg-muted/60")
                    }
                    title={ACCENT_LABEL[c]}
                  >
                    <span
                      className={"h-8 w-8 rounded-full shadow-sm border transition " + (active ? "scale-110 border-foreground" : "border-black/10 group-hover:scale-105")}
                      style={{ background: ACCENTS[c].hex }}
                    />
                    <span className="text-[10px] font-medium text-muted-foreground">{ACCENT_LABEL[c]}</span>
                  </button>
                );
              })}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button size="sm">Primary button</Button>
              <Button size="sm" variant="secondary">Secondary</Button>
              <Badge>Badge</Badge>
              <span className="text-xs text-muted-foreground">Live preview — updates instantly.</span>
            </div>
          </Section>

        </TabsContent>

        {/* PREFERENCES */}
        <TabsContent value="preferences" className="space-y-5">
          <Section icon={<Languages className="h-4 w-4" />} title="Regional" description="Language, dates, currency and timezone.">
            <div className="grid md:grid-cols-2 gap-4">
              <Field label="Language">
                <Select value={prefs.language} onValueChange={(v: Prefs["language"]) => savePrefs({ ...prefs, language: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto (follow AI default)</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="ur">اردو — Urdu</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Timezone">
                <Select value={prefs.timezone} onValueChange={(v) => savePrefs({ ...prefs, timezone: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Asia/Karachi", "Asia/Dubai", "Asia/Riyadh", "Europe/London", "America/New_York"].map((tz) => (
                      <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Date format">
                <Select value={prefs.dateFormat} onValueChange={(v: Prefs["dateFormat"]) => savePrefs({ ...prefs, dateFormat: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dd/mm/yyyy">DD/MM/YYYY</SelectItem>
                    <SelectItem value="mm/dd/yyyy">MM/DD/YYYY</SelectItem>
                    <SelectItem value="yyyy-mm-dd">YYYY-MM-DD</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Currency">
                <Select value={prefs.currency} onValueChange={(v: Prefs["currency"]) => savePrefs({ ...prefs, currency: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["PKR", "USD", "EUR", "AED", "GBP"].map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Week starts on">
                <Select value={prefs.weekStart} onValueChange={(v: Prefs["weekStart"]) => savePrefs({ ...prefs, weekStart: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monday">Monday</SelectItem>
                    <SelectItem value="sunday">Sunday</SelectItem>
                    <SelectItem value="saturday">Saturday</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <div className="flex items-end">
                <div className="rounded-xl border bg-muted/30 p-3 text-xs w-full">
                  <div className="flex items-center gap-1 font-medium mb-1"><Clock className="h-3 w-3" /> Preview</div>
                  <div>{new Intl.DateTimeFormat("en-GB", { dateStyle: "full", timeStyle: "short", timeZone: prefs.timezone }).format(new Date())}</div>
                  <div className="text-muted-foreground mt-1">{prefs.currency} · {prefs.dateFormat.toUpperCase()}</div>
                </div>
              </div>
            </div>
          </Section>
        </TabsContent>

        {/* EMAIL */}
        <TabsContent value="email" className="space-y-5">
          <Section
            icon={<PlugZap className="h-4 w-4" />}
            title="System email"
            description="Connect an email provider so the system can automatically send notifications, alerts, invoices, letters and reports on your behalf."
          >
            <div className="flex items-center justify-between rounded-xl border p-3 bg-muted/30 mb-4">
              <div className="flex items-center gap-3">
                <div className={`h-9 w-9 rounded-lg grid place-items-center ${email.enabled ? "bg-emerald-500/15 text-emerald-600" : "bg-muted text-muted-foreground"}`}>
                  <Mail className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-medium">Email delivery</div>
                  <div className="text-xs text-muted-foreground">
                    {email.enabled ? `Active via SMTP ${email.host || "(not set)"}` : "Disabled — system will not send emails"}
                    {email.lastTestAt && (
                      <> · Last test {email.lastTestOk ? "✓" : "✗"} {new Date(email.lastTestAt).toLocaleString()}</>
                    )}
                  </div>
                </div>
              </div>
              <Switch checked={email.enabled} onCheckedChange={(v) => saveEmail({ ...email, enabled: v })} />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <Field label="Quick preset">
                <Select
                  value=""
                  onValueChange={(v) => {
                    const p = SMTP_PRESETS.find((x) => x.label === v);
                    if (p) saveEmail({ ...email, host: p.host, port: p.port, secure: p.secure });
                  }}
                >
                  <SelectTrigger><SelectValue placeholder="Select a provider preset…" /></SelectTrigger>
                  <SelectContent>
                    {SMTP_PRESETS.map((p) => (
                      <SelectItem key={p.label} value={p.label}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Encryption">
                <Select
                  value={email.secure ? "ssl" : "tls"}
                  onValueChange={(v) => saveEmail({ ...email, secure: v === "ssl", port: v === "ssl" ? 465 : 587 })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ssl">SSL (port 465)</SelectItem>
                    <SelectItem value="tls">STARTTLS (port 587)</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="SMTP host">
                <Input value={email.host} onChange={(e) => saveEmail({ ...email, host: e.target.value })} placeholder="smtp.gmail.com" />
              </Field>
              <Field label="SMTP port">
                <Input type="number" value={email.port} onChange={(e) => saveEmail({ ...email, port: Number(e.target.value) || 587 })} placeholder="587" />
              </Field>
              <Field label="Username">
                <Input value={email.username} onChange={(e) => saveEmail({ ...email, username: e.target.value })} placeholder="you@yourdomain.com" />
              </Field>
              <Field label="Password / App password">
                <div className="relative">
                  <Input
                    type={showKey ? "text" : "password"}
                    value={email.password}
                    onChange={(e) => saveEmail({ ...email, password: e.target.value })}
                    placeholder="••••••••"
                    className="pr-9"
                  />
                  <button type="button" onClick={() => setShowKey(!showKey)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </Field>
              <Field label="From name">
                <Input value={email.fromName} onChange={(e) => saveEmail({ ...email, fromName: e.target.value })} placeholder="Devionic DMS" />
              </Field>
              <Field label="From email">
                <Input type="email" value={email.fromEmail} onChange={(e) => saveEmail({ ...email, fromEmail: e.target.value })} placeholder="no-reply@devionic.com" />
              </Field>
              <Field label="Reply-to (optional)">
                <Input type="email" value={email.replyTo} onChange={(e) => saveEmail({ ...email, replyTo: e.target.value })} placeholder="support@devionic.com" />
              </Field>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Tip: For Gmail use an <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" className="underline">App Password</a> (2FA required). For Outlook/Microsoft 365 use SMTP AUTH-enabled account or app password.
            </p>

            <Separator className="my-4" />

            <div className="rounded-xl border p-4 bg-primary/5">
              <div className="flex items-center gap-2 mb-2">
                <Send className="h-4 w-4 text-primary" />
                <div className="text-sm font-medium">Send a test email</div>
              </div>
              <p className="text-xs text-muted-foreground mb-3">Verify your provider credentials by sending a test message to any address.</p>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <AtSign className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="you@example.com" className="pl-8" />
                </div>
                <Button onClick={onSendTest} disabled={testing} className="gap-1">
                  <Send className="h-4 w-4" /> {testing ? "Sending…" : "Send test"}
                </Button>
              </div>
            </div>
          </Section>

          <Section icon={<Zap className="h-4 w-4" />} title="Auto-send events" description="Which system events trigger automatic emails when delivery is active.">
            <Toggle
              label="Automatic sending"
              desc="Master switch. When ON, the system emails automatically on the events below."
              checked={email.autoSend}
              onCheckedChange={(v) => saveEmail({ ...email, autoSend: v })}
            />
            <div className="mt-3 grid md:grid-cols-2 gap-2 text-xs text-muted-foreground">
              <StatChip label="Invoice paid / due" value="Auto" />
              <StatChip label="New support ticket & replies" value="Auto" />
              <StatChip label="Task assigned / status change" value="Auto" />
              <StatChip label="Project milestones" value="Auto" />
              <StatChip label="Internal notices & alerts" value="Auto" />
              <StatChip label="Letters & generated documents" value="On demand" />
            </div>
          </Section>

          <Section icon={<ShieldCheck className="h-4 w-4" />} title="Security note" description="How your API key is handled.">
            <ul className="text-xs text-muted-foreground list-disc pl-5 space-y-1">
              <li>The API key is saved in your browser only and is sent to the server only when an email needs to be delivered.</li>
              <li>Use a domain-verified sender ({email.fromEmail || "no-reply@yourdomain.com"}) to avoid deliverability issues.</li>
              <li>Disable the master switch above to instantly stop all outgoing emails from the system.</li>
            </ul>
          </Section>
        </TabsContent>

        {/* NOTIFICATIONS */}
        <TabsContent value="notifications" className="space-y-5">
          <Section icon={<Bell className="h-4 w-4" />} title="Alerts" description="Control what pings you inside the workspace.">
            <div className="space-y-1">
              <Toggle
                label="Daily email digest"
                desc="Summary of tasks, tickets & invoices at 8:00 AM."
                checked={notif.emailDigest}
                onCheckedChange={(v) => saveNotif({ ...notif, emailDigest: v })}
              />
              <Toggle
                label="Task assigned to me"
                desc="Get pinged when a task is assigned or reassigned."
                checked={notif.taskAssigned}
                onCheckedChange={(v) => saveNotif({ ...notif, taskAssigned: v })}
              />
              <Toggle
                label="Invoice paid"
                desc="Receive a notification when a client marks an invoice as paid."
                checked={notif.invoicePaid}
                onCheckedChange={(v) => saveNotif({ ...notif, invoicePaid: v })}
              />
              <Toggle
                label="Support ticket updates"
                desc="Replies, status changes and SLA breaches."
                checked={notif.ticketUpdates}
                onCheckedChange={(v) => saveNotif({ ...notif, ticketUpdates: v })}
              />
              <Toggle
                label="System alerts"
                desc="Backup completion, backend health and security warnings."
                checked={notif.systemAlerts}
                onCheckedChange={(v) => saveNotif({ ...notif, systemAlerts: v })}
              />
              <Toggle
                label="Sound"
                desc="Play a subtle chime on incoming messages."
                checked={notif.sounds}
                onCheckedChange={(v) => saveNotif({ ...notif, sounds: v })}
              />
            </div>
          </Section>
        </TabsContent>

        {/* SECURITY */}
        <TabsContent value="security" className="space-y-5">
          <Section icon={<KeyRound className="h-4 w-4" />} title="Change password" description="Use at least 8 characters. Mixing letters, numbers and symbols is best.">
            <div className="grid md:grid-cols-2 gap-4">
              <Field label="New password">
                <Input type="password" value={pwd1} onChange={(e) => setPwd1(e.target.value)} placeholder="••••••••" />
              </Field>
              <Field label="Confirm password">
                <Input type="password" value={pwd2} onChange={(e) => setPwd2(e.target.value)} placeholder="••••••••" />
              </Field>
            </div>
            <div className="flex justify-end mt-3">
              <Button onClick={changePassword} disabled={savingPwd || !pwd1} className="gap-1">
                <KeyRound className="h-4 w-4" /> {savingPwd ? "Updating…" : "Update password"}
              </Button>
            </div>
          </Section>

          <Section icon={<Fingerprint className="h-4 w-4" />} title="Login PIN" description="Set a 4-character PIN (letters, numbers, symbols) to use instead of your password on the login screen.">
            <div className="grid md:grid-cols-2 gap-4">
              <Field label="New 4-character PIN">
                <Input type="password" value={loginPin} onChange={(e) => setLoginPinState(e.target.value)} maxLength={4} placeholder="••••" />
              </Field>
            </div>
            <div className="flex justify-end mt-3">
              <Button onClick={saveLoginPin} disabled={savingPin || loginPin.length !== 4} className="gap-1">
                <Save className="h-4 w-4" /> {savingPin ? "Saving…" : "Save PIN"}
              </Button>
            </div>
          </Section>

          {/* Two-Factor Authentication */}
          <Section icon={<Fingerprint className="h-4 w-4" />} title="Two-factor authentication (2FA)" description="Add a second step at sign-in using an authenticator app (Google Authenticator, Authy, 1Password, Microsoft Authenticator).">
            <div className="flex items-center justify-between rounded-xl border p-3 bg-muted/30 mb-4">
              <div className="flex items-center gap-3">
                <div className={`h-9 w-9 rounded-lg grid place-items-center ${security.twoFAEnabled ? "bg-emerald-500/15 text-emerald-600" : "bg-muted text-muted-foreground"}`}>
                  <Fingerprint className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-medium">{security.twoFAEnabled ? "2FA is ON" : "2FA is OFF"}</div>
                  <div className="text-xs text-muted-foreground">
                    {security.twoFAEnabled
                      ? `Enabled ${security.twoFAVerifiedAt ? new Date(security.twoFAVerifiedAt).toLocaleString() : ""}`
                      : "Turn on to require a 6-digit code at sign-in."}
                  </div>
                </div>
              </div>
              {security.twoFAEnabled ? (
                <Button variant="outline" className="gap-1 text-destructive" onClick={disable2FA}>
                  <Trash2 className="h-4 w-4" /> Disable
                </Button>
              ) : (
                <Button className="gap-1" onClick={start2FASetup} disabled={twoFABusy}>
                  <QrCode className="h-4 w-4" /> {twoFABusy ? "Preparing…" : "Set up 2FA"}
                </Button>
              )}
            </div>

            {!security.twoFAEnabled && twoFAQr && (
              <div className="rounded-xl border p-4 bg-primary/5 space-y-3">
                <div className="grid md:grid-cols-[240px,1fr] gap-4 items-start">
                  <img src={twoFAQr} alt="2FA QR" className="rounded-lg border bg-white p-2 mx-auto" />
                  <div className="space-y-3">
                    <div>
                      <div className="text-sm font-medium mb-1">1. Scan the QR code</div>
                      <div className="text-xs text-muted-foreground">Open your authenticator app and add a new account by scanning this QR.</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium mb-1">Or enter this key manually</div>
                      <div className="flex gap-2">
                        <Input value={security.twoFASecret} readOnly className="font-mono text-xs" />
                        <Button variant="outline" size="icon" onClick={() => copy(security.twoFASecret, "2fa")} title="Copy">
                          {copied === "2fa" ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium mb-1">2. Enter the 6-digit code shown in your app</div>
                      <div className="flex gap-2">
                        <Input
                          value={twoFACode}
                          onChange={(e) => setTwoFACode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                          placeholder="123456"
                          className="font-mono tracking-widest text-center"
                          maxLength={6}
                        />
                        <Button onClick={verifyAndEnable2FA} disabled={twoFABusy || twoFACode.length !== 6} className="gap-1">
                          <ScanLine className="h-4 w-4" /> Verify & enable
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {security.twoFAEnabled && security.backupCodes.length > 0 && (
              <div className="rounded-xl border p-4 bg-amber-500/5 mt-2">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <div className="text-sm font-medium">Backup codes</div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => copy(security.backupCodes.join("\n"), "backup")} className="gap-1">
                      {copied === "backup" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />} Copy all
                    </Button>
                    <Button variant="outline" size="sm" onClick={regenerateBackupCodes} className="gap-1">
                      <RefreshCcw className="h-3 w-3" /> Regenerate
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mb-3">Save these one-time codes. Each works once when you lose access to your authenticator.</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {security.backupCodes.map((c) => (
                    <div key={c} className="rounded-md border bg-background px-3 py-2 font-mono text-sm text-center">{c}</div>
                  ))}
                </div>
              </div>
            )}
          </Section>

          {/* Login security */}
          <Section icon={<ShieldCheck className="h-4 w-4" />} title="Login security" description="Extra protections on how sessions behave.">
            <Toggle
              label="Email me on new sign-ins"
              desc="Get notified whenever your account is accessed from a new device or browser."
              checked={security.loginAlerts}
              onCheckedChange={(v) => saveSecurity({ ...security, loginAlerts: v })}
            />
            <Toggle
              label="Require strong passwords"
              desc="Enforce 8+ characters with a mix of letters, numbers & symbols on password changes."
              checked={security.requireStrongPasswords}
              onCheckedChange={(v) => saveSecurity({ ...security, requireStrongPasswords: v })}
            />
            <div className="grid md:grid-cols-2 gap-4 mt-3">
              <Field label="Auto sign-out after idle (minutes)">
                <Input
                  type="number"
                  min={5}
                  max={480}
                  value={security.sessionTimeoutMin}
                  onChange={(e) => saveSecurity({ ...security, sessionTimeoutMin: Number(e.target.value) || 30 })}
                />
              </Field>
              <Field label="Current session">
                <Input value={`${user?.email || "—"} · ${new Date().toLocaleString()}`} readOnly />
              </Field>
            </div>
          </Section>

          {/* Sessions */}
          <Section icon={<Shield className="h-4 w-4" />} title="Sessions" description="Manage where you're signed in.">
            <div className="rounded-xl border p-3 bg-muted/20 flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-emerald-500/15 text-emerald-600 grid place-items-center">
                  <Monitor className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-medium">This device</div>
                  <div className="text-xs text-muted-foreground truncate max-w-[420px]">{typeof navigator !== "undefined" ? navigator.userAgent : ""}</div>
                </div>
              </div>
              <Badge className="bg-emerald-600 hover:bg-emerald-600 gap-1"><Check className="h-3 w-3" /> Active</Badge>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={signOutEverywhere} className="gap-1">
                <LogOut className="h-4 w-4" /> Sign out this device
              </Button>
              <Button variant="outline" className="gap-1 text-destructive" onClick={signOutAllDevices}>
                <LogOut className="h-4 w-4" /> Sign out all devices
              </Button>
            </div>
          </Section>

          <Section icon={<ShieldCheck className="h-4 w-4" />} title="Data & privacy" description="How your data is stored.">
            <div className="grid md:grid-cols-2 gap-3">
              <StatChip label="Preferences storage" value="Browser (local)" />
              <StatChip label="AI keys storage" value="Browser (local)" />
              <StatChip label="Business data" value="Lovable Cloud (encrypted)" />
              <StatChip label="Backups" value="Automatic — daily" />
            </div>
          </Section>
        </TabsContent>

        {/* SYSTEM */}
        <TabsContent value="system" className="space-y-5">
          <Section icon={<CalendarIcon className="h-4 w-4" />} title="Fiscal year" description="Start of your accounting year. Pakistan uses July 1st by default.">
            <div className="grid md:grid-cols-2 gap-4">
              <Field label="Start month">
                <Select value={String(system.fiscalYearStartMonth)} onValueChange={(v) => saveSystem({ ...system, fiscalYearStartMonth: Number(v) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["January","February","March","April","May","June","July","August","September","October","November","December"].map((m, i) => (
                      <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Start day">
                <Input type="number" min={1} max={31} value={system.fiscalYearStartDay} onChange={(e) => saveSystem({ ...system, fiscalYearStartDay: Math.min(31, Math.max(1, Number(e.target.value) || 1)) })} />
              </Field>
            </div>
          </Section>

          <Section icon={<Hash className="h-4 w-4" />} title="Document numbering" description="Auto-format for invoice and receipt numbers used across the system.">
            <div className="grid md:grid-cols-3 gap-4">
              <Field label="Invoice prefix">
                <Input value={system.invoicePrefix} onChange={(e) => saveSystem({ ...system, invoicePrefix: e.target.value })} placeholder="INV-" />
              </Field>
              <Field label="Next invoice number">
                <Input type="number" min={1} value={system.invoiceNextNumber} onChange={(e) => saveSystem({ ...system, invoiceNextNumber: Number(e.target.value) || 1 })} />
              </Field>
              <Field label="Padding (digits)">
                <Input type="number" min={0} max={10} value={system.invoicePadding} onChange={(e) => saveSystem({ ...system, invoicePadding: Number(e.target.value) || 0 })} />
              </Field>
            </div>
            <div className="text-xs text-muted-foreground mt-2">Next invoice will be <span className="font-mono font-semibold text-primary">{previewInvoiceNo()}</span></div>

            <Separator className="my-4" />
            <div className="grid md:grid-cols-3 gap-4">
              <Field label="Receipt prefix">
                <Input value={system.receiptPrefix} onChange={(e) => saveSystem({ ...system, receiptPrefix: e.target.value })} placeholder="RCP-" />
              </Field>
              <Field label="Next receipt number">
                <Input type="number" min={1} value={system.receiptNextNumber} onChange={(e) => saveSystem({ ...system, receiptNextNumber: Number(e.target.value) || 1 })} />
              </Field>
              <Field label="Padding (digits)">
                <Input type="number" min={0} max={10} value={system.receiptPadding} onChange={(e) => saveSystem({ ...system, receiptPadding: Number(e.target.value) || 0 })} />
              </Field>
            </div>
            <div className="text-xs text-muted-foreground mt-2">Next receipt will be <span className="font-mono font-semibold text-primary">{previewReceiptNo()}</span></div>
          </Section>

          <Section icon={<Percent className="h-4 w-4" />} title="Tax defaults" description="Default tax used on new invoices; per-invoice override is still available.">
            <div className="grid md:grid-cols-3 gap-4">
              <Field label="Tax label">
                <Input value={system.taxLabel} onChange={(e) => saveSystem({ ...system, taxLabel: e.target.value })} placeholder="GST / VAT / Sales Tax" />
              </Field>
              <Field label="Default rate (%)">
                <Input type="number" min={0} max={100} step={0.5} value={system.defaultTaxRate} onChange={(e) => saveSystem({ ...system, defaultTaxRate: Number(e.target.value) || 0 })} />
              </Field>
              <Field label="Pricing model">
                <Select value={system.taxInclusive ? "incl" : "excl"} onValueChange={(v) => saveSystem({ ...system, taxInclusive: v === "incl" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="excl">Tax exclusive (add on top)</SelectItem>
                    <SelectItem value="incl">Tax inclusive (price includes tax)</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </Section>

          <Section icon={<Clock className="h-4 w-4" />} title="Working hours & days" description="Used by attendance, payroll and scheduling.">
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
              {(["mon","tue","wed","thu","fri","sat","sun"] as const).map((d) => (
                <label key={d} className={`flex items-center justify-between rounded-lg border px-3 py-2 cursor-pointer text-sm ${system.workingDays[d] ? "border-primary bg-primary/5" : "hover:bg-muted/50"}`}>
                  <span className="uppercase font-medium">{d}</span>
                  <Switch checked={system.workingDays[d]} onCheckedChange={(v) => saveSystem({ ...system, workingDays: { ...system.workingDays, [d]: v } })} />
                </label>
              ))}
            </div>
            <div className="grid md:grid-cols-2 gap-4 mt-4">
              <Field label="Work day starts at">
                <Input type="time" value={system.workDayStart} onChange={(e) => saveSystem({ ...system, workDayStart: e.target.value })} />
              </Field>
              <Field label="Work day ends at">
                <Input type="time" value={system.workDayEnd} onChange={(e) => saveSystem({ ...system, workDayEnd: e.target.value })} />
              </Field>
            </div>
          </Section>

          <Section icon={<CalendarIcon className="h-4 w-4" />} title="Public holidays" description="Days marked as non-working across the system." >
            <div className="space-y-2">
              {system.holidays.length === 0 && (
                <div className="text-xs text-muted-foreground py-3 text-center">No holidays added yet.</div>
              )}
              {system.holidays.map((h) => (
                <div key={h.id} className="grid grid-cols-[140px,1fr,auto] gap-2 items-center">
                  <Input type="date" value={h.date} onChange={(e) => updateHoliday(h.id, { date: e.target.value })} />
                  <Input value={h.name} onChange={(e) => updateHoliday(h.id, { name: e.target.value })} placeholder="Holiday name" />
                  <Button variant="ghost" size="icon" className="text-destructive" onClick={() => removeHoliday(h.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addHoliday} className="gap-1 mt-2">
                <Plus className="h-4 w-4" /> Add holiday
              </Button>
            </div>
          </Section>
        </TabsContent>

        {/* CONFIGURATIONS */}
        <TabsContent value="configurations" className="space-y-5">
          <ConfigurationsPanel companyName={COMPANY.name} companyEmail={COMPANY.email} />
        </TabsContent>

        {/* BACKUP */}
        <TabsContent value="backup" className="space-y-5">
          <Section icon={<Download className="h-4 w-4" />} title="Export a backup" description="Download all your workspace settings and preferences as a single JSON file. Business data (clients, invoices, tasks, etc.) stays safely in Lovable Cloud with automatic daily backups.">
            <div className="rounded-xl border p-4 bg-primary/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium">Full settings backup</div>
                <div className="text-xs text-muted-foreground">Includes profile, company, appearance, preferences, email, notifications, system & security settings.</div>
              </div>
              <Button onClick={exportBackup} className="gap-1">
                <Download className="h-4 w-4" /> Download backup
              </Button>
            </div>
            <div className="grid md:grid-cols-2 gap-3 mt-4">
              <StatChip label="App version" value={`v${APP_VERSION}`} />
              <StatChip label="Signed in as" value={user?.email || "—"} />
              <StatChip label="Format" value="JSON (human-readable)" />
              <StatChip label="Business data backups" value="Cloud — daily, automatic" />
            </div>
          </Section>

          <Section icon={<Upload className="h-4 w-4" />} title="Restore from a backup" description="Load a previously downloaded backup file. Your current settings will be overwritten and the page will reload.">
            <div className="rounded-xl border-2 border-dashed p-6 text-center bg-muted/20">
              <div className="mx-auto h-12 w-12 rounded-xl bg-primary/10 text-primary grid place-items-center mb-3">
                <Upload className="h-5 w-5" />
              </div>
              <div className="text-sm font-medium mb-1">Select a Devionic DMS backup file</div>
              <div className="text-xs text-muted-foreground mb-4">Only files exported from this app are accepted.</div>
              <label>
                <input
                  type="file"
                  accept="application/json,.json"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) importBackup(f); e.target.value = ""; }}
                />
                <Button asChild disabled={importing} className="gap-1 cursor-pointer">
                  <span><Upload className="h-4 w-4" /> {importing ? "Restoring…" : "Choose file & restore"}</span>
                </Button>
              </label>
            </div>
            <div className="mt-4 rounded-xl border bg-amber-500/5 p-3 flex items-start gap-3">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
              <div className="text-xs text-muted-foreground">
                <div className="font-medium text-foreground mb-0.5">Heads up</div>
                Restore replaces the settings stored in this browser (preferences, company overrides, email config, system rules & 2FA). It does not modify data in Lovable Cloud.
              </div>
            </div>
          </Section>

          <Section icon={<Cloud className="h-4 w-4" />} title="Cloud backups" description="Business data (clients, invoices, tasks, payroll, documents) is backed up automatically.">
            <div className="grid md:grid-cols-2 gap-3">
              <StatChip label="Backup schedule" value="Daily · automatic" />
              <StatChip label="Retention" value="7 days rolling" />
              <StatChip label="Location" value="Lovable Cloud (encrypted)" />
              <StatChip label="Recovery" value="On-request via support" />
            </div>
          </Section>
        </TabsContent>

        {/* ABOUT */}
        <TabsContent value="about" className="space-y-5">
          <Section icon={<Cloud className="h-4 w-4" />} title="Backend" description="Managed database, auth and storage.">
            <div className="rounded-xl border bg-gradient-to-br from-emerald-500/5 to-transparent p-4">
              <div className="flex items-center gap-2 mb-1">
                <Badge className="gap-1 bg-emerald-600 hover:bg-emerald-600"><Check className="h-3 w-3" /> Connected</Badge>
                <span className="text-sm font-medium">Lovable Cloud</span>
              </div>
              <p className="text-xs text-muted-foreground">Database, authentication, file storage and edge functions are managed automatically — no configuration required.</p>
            </div>
          </Section>

          <Section icon={<Info className="h-4 w-4" />} title="About Devionic DMS" description="Application information and useful links.">
            <div className="grid md:grid-cols-2 gap-3">
              <StatChip label="Version" value={`v${APP_VERSION}`} />
              <StatChip label="Build" value={new Date().toISOString().slice(0, 10)} />
              <StatChip label="Owner" value={COMPANY.name} />
              <StatChip label="Support" value={COMPANY.email} />
            </div>
            <Separator className="my-4" />
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" asChild><Link to="/ai"><Sparkles className="h-4 w-4 mr-1" /> AI Assistant</Link></Button>
              <Button variant="outline" size="sm" asChild><Link to="/reports"><Zap className="h-4 w-4 mr-1" /> Reports</Link></Button>
              <Button variant="outline" size="sm" asChild><Link to="/users"><UserIcon className="h-4 w-4 mr-1" /> Users & Access</Link></Button>
              <Button variant="outline" size="sm" asChild>
                <a href={`https://${COMPANY.website}`} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-4 w-4 mr-1" /> {COMPANY.website}
                </a>
              </Button>
            </div>
          </Section>
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}

/* ---------------- helpers ---------------- */

const ACCENT_HEX: Record<AccentKey, string> = Object.fromEntries(
  Object.entries(ACCENTS).map(([k, v]) => [k, v.hex])
) as Record<AccentKey, string>;


function Section({ icon, title, description, children }: { icon: React.ReactNode; title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border bg-card shadow-sm">
      <header className="flex items-start gap-3 px-5 py-4 border-b">
        <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary grid place-items-center shrink-0">{icon}</div>
        <div className="min-w-0">
          <h3 className="font-semibold leading-tight">{title}</h3>
          {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
        </div>
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function InfoRow({ label, value, icon, onCopy, copied, full }: { label: string; value: string; icon?: React.ReactNode; onCopy: () => void; copied: boolean; full?: boolean }) {
  return (
    <div className={"flex items-start gap-3 rounded-xl border bg-muted/20 px-3 py-2.5 " + (full ? "md:col-span-2" : "")}>
      {icon && <div className="h-7 w-7 rounded-md bg-primary/10 text-primary grid place-items-center shrink-0 [&>svg]:h-3.5 [&>svg]:w-3.5">{icon}</div>}
      <div className="min-w-0 flex-1">
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="text-sm font-medium break-words">{value}</div>
      </div>
      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={onCopy} title="Copy">
        {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
      </Button>
    </div>
  );
}

function ThemeTile({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={
        "flex flex-col items-center justify-center gap-2 rounded-xl border p-4 transition " +
        (active ? "border-primary bg-primary/5 shadow-sm" : "hover:bg-muted/50")
      }
    >
      <div className={"h-9 w-9 rounded-lg grid place-items-center " + (active ? "bg-primary text-primary-foreground" : "bg-muted text-foreground")}>
        {icon}
      </div>
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}

function Toggle({ label, desc, checked, onCheckedChange }: { label: string; desc: string; checked: boolean; onCheckedChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 py-3 border-b last:border-b-0">
      <div className="min-w-0">
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">{desc}</div>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-muted/20 px-3 py-2.5">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-sm font-medium break-words">{value}</div>
    </div>
  );
}

// ---------------- Configurations panel ----------------
function ConfigurationsPanel({ companyName, companyEmail }: { companyName: string; companyEmail: string }) {
  const [stored, setStored] = useState<{ key: string; cfg: AppConfig } | null>(null);
  const [applied, setApplied] = useState<AppConfig | null>(null);
  const [reveal, setReveal] = useState(false);
  const [pasteKey, setPasteKey] = useState("");
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    setStored(loadStoredConfig());
    setApplied(loadAppliedConfig());
    // Auto-apply from ?configure=...
    const params = new URLSearchParams(window.location.search);
    const q = params.get("configure");
    if (q) {
      const cfg = decodeConfigKey(q);
      if (cfg) {
        saveAppliedConfig(cfg);
        setApplied(cfg);
        toast.success("Configuration applied from setup link");
        params.delete("configure");
        const url = window.location.pathname + (params.toString() ? "?" + params.toString() : "");
        window.history.replaceState({}, "", url);
      } else {
        toast.error("Invalid configuration link");
      }
    }
  }, []);

  const doGenerate = () => {
    const res = generateConfigKey({ name: companyName, email: companyEmail });
    setStored(res);
    setReveal(true);
    toast.success("New configuration key generated");
  };

  const doRevoke = () => {
    clearStoredConfig();
    setStored(null);
    setApplied(null);
    toast.success("Configuration cleared");
  };

  const copy = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 1500);
      toast.success("Copied to clipboard");
    } catch { toast.error("Copy failed"); }
  };

  const applyPasted = () => {
    const cfg = decodeConfigKey(pasteKey);
    if (!cfg) { toast.error("Not a valid Devionic configuration key"); return; }
    saveAppliedConfig(cfg);
    setApplied(cfg);
    setPasteKey("");
    toast.success("App configured — connected to " + cfg.app_name);
  };

  const setupUrl = stored ? setupUrlFor(stored.key) : "";
  const masked = (s: string) => (reveal ? s : s.replace(/./g, "•").slice(0, 48) + (s.length > 48 ? "…" : ""));

  return (
    <>
      <Section
        icon={<Rocket className="h-4 w-4" />}
        title="One-click configuration key"
        description="Generate a single key that bundles this app's backend URL, publishable key and company identity. Share it with another Devionic installation to configure it instantly — no manual setup."
      >
        {!stored ? (
          <div className="rounded-xl border-2 border-dashed p-8 text-center bg-gradient-to-br from-primary/5 to-transparent">
            <div className="mx-auto h-14 w-14 rounded-2xl bg-primary/10 text-primary grid place-items-center mb-3">
              <Wand2 className="h-6 w-6" />
            </div>
            <div className="text-base font-semibold mb-1">No configuration key yet</div>
            <div className="text-sm text-muted-foreground mb-5 max-w-md mx-auto">
              Click below to generate a single key that other apps and portals can use to auto-configure their connection to this workspace.
            </div>
            <Button onClick={doGenerate} size="lg" className="gap-2">
              <Sparkles className="h-4 w-4" /> Generate Configuration Key
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl border bg-primary/5 p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Badge className="bg-emerald-600 hover:bg-emerald-600 gap-1"><Check className="h-3 w-3" /> Active</Badge>
                  <span className="text-xs text-muted-foreground">Issued {new Date(stored.cfg.issued_at).toLocaleString()}</span>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => setReveal((r) => !r)}>
                    {reveal ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => copy(stored.key, "key")}>
                    {copiedField === "key" ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div className="font-mono text-xs break-all bg-background border rounded-lg p-3">
                {masked(stored.key)}
              </div>
            </div>

            <div className="rounded-xl border p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Link2 className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">One-click setup link</span>
                </div>
                <Button variant="ghost" size="icon" onClick={() => copy(setupUrl, "url")}>
                  {copiedField === "url" ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <div className="font-mono text-xs break-all bg-muted/40 border rounded-lg p-3">{setupUrl}</div>
              <p className="text-xs text-muted-foreground mt-2">Open this link on any Devionic install to auto-apply this configuration.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-3">
              <StatChip label="App name" value={stored.cfg.app_name} />
              <StatChip label="Company" value={stored.cfg.company_name} />
              <StatChip label="Backend URL" value={stored.cfg.api_url || "—"} />
              <StatChip label="Token" value={stored.cfg.token.slice(0, 12) + "…"} />
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              <Button onClick={doGenerate} variant="outline" className="gap-1">
                <RefreshCcw className="h-4 w-4" /> Regenerate
              </Button>
              <Button onClick={doRevoke} variant="ghost" className="text-destructive gap-1">
                <Trash2 className="h-4 w-4" /> Revoke key
              </Button>
            </div>
          </div>
        )}
      </Section>

      <Section
        icon={<PlugZap className="h-4 w-4" />}
        title="Apply a configuration key"
        description="Paste a key generated from another Devionic app or portal to connect this install to it instantly."
      >
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-[1fr,auto] gap-2">
            <Input
              value={pasteKey}
              onChange={(e) => setPasteKey(e.target.value)}
              placeholder="Paste DVNC-… configuration key"
              className="font-mono text-xs"
            />
            <Button onClick={applyPasted} disabled={!pasteKey.trim()} className="gap-1">
              <Zap className="h-4 w-4" /> Apply & Connect
            </Button>
          </div>
          {applied ? (
            <div className="rounded-xl border bg-emerald-500/5 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-emerald-600 hover:bg-emerald-600 gap-1"><Check className="h-3 w-3" /> Connected</Badge>
                <span className="text-sm font-medium">{applied.app_name}</span>
              </div>
              <div className="grid md:grid-cols-2 gap-2 text-xs">
                <div><span className="text-muted-foreground">Company:</span> <span className="font-medium">{applied.company_name}</span></div>
                <div><span className="text-muted-foreground">Backend:</span> <span className="font-mono">{applied.api_url}</span></div>
                <div><span className="text-muted-foreground">Applied:</span> {new Date().toLocaleString()}</div>
                <div><span className="text-muted-foreground">Token:</span> <span className="font-mono">{applied.token.slice(0, 12)}…</span></div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border-2 border-dashed p-4 text-center text-xs text-muted-foreground">
              No configuration applied. Paste a key above to connect this install to an app or portal.
            </div>
          )}
        </div>
      </Section>

      <Section icon={<Info className="h-4 w-4" />} title="How this works" description="Everything the receiving app needs is packed into one key — no separate URLs, tokens or manual setup.">
        <ol className="text-sm space-y-2 list-decimal list-inside text-muted-foreground">
          <li><span className="text-foreground font-medium">Generate</span> a single key on this workspace.</li>
          <li><span className="text-foreground font-medium">Copy</span> the key or share the one-click setup link.</li>
          <li>On the other app or portal, open <span className="font-mono text-xs">Settings → Configurations</span> and <span className="text-foreground font-medium">paste the key</span> (or just open the link).</li>
          <li>The receiving install is <span className="text-foreground font-medium">instantly configured</span> — company identity, backend endpoint and access token are all wired up.</li>
        </ol>
      </Section>
    </>
  );
}
