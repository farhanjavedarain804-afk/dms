import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { AppLayout, PageHeader } from "@/components/dms/Layout";
import { Button } from "@/components/ui/button";
import { Send, Sparkles, Loader2, Settings, Key, CheckCircle2, XCircle, Shield, GraduationCap, Plus, Trash2, Wrench, Zap, Star, Mic, MicOff, Paperclip, X, FileText, Image as ImageIcon, Film, ClipboardCheck, RefreshCw, ListChecks, Lightbulb, ChevronDown, ChevronRight, Copy, Pencil, Check, Square, History, MessageSquarePlus, Undo2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { chatWithAI, transcribeAudio, planActions, scanAndSuggest, undoActions, testAIProvider } from "@/lib/ai.functions";
import { buildRequest, callProvider } from "@/lib/ai-provider";
import { generatedDocs } from "@/lib/generated-docs";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

const letterheadPdf = () => import("@/lib/letterhead-pdf");

function stripMarkdown(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^#{1,6}\s+(.*)$/gm, (_, t) => t.toUpperCase())
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/_(.+?)_/g, "$1")
    .replace(/^\s*[-*+]\s+/gm, "- ")
    .replace(/^\s*\d+\.\s+/gm, (m) => m.trim() + " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^\s*>\s?/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// jsPDF's default Helvetica font is WinAnsi (single-byte). Any emoji or
// non-Latin glyph becomes garbled bytes like "Ø=ÜÈ". Strip them for PDF output.
function pdfSafe(text: string): string {
  return text
    // Remove emoji / pictographs
    .replace(/[\p{Extended_Pictographic}\p{Emoji_Presentation}]/gu, "")
    // Remove variation selectors + zero-width joiners
    .replace(/[\u200B-\u200F\u2028-\u202F\u2060-\u206F\uFE00-\uFE0F]/g, "")
    // Normalise smart quotes / dashes / bullets to ASCII
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/[\u2022\u25CF\u25AA\u25A0]/g, "-")
    // Drop any remaining non-ASCII characters
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "")
    // Tidy whitespace introduced by removals
    .replace(/[ \t]{2,}/g, " ")
    .replace(/^[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export const Route = createFileRoute("/ai")({
  head: () => ({ meta: [{ title: "AI Assistant — Devionic DMS" }] }),
  component: AIAssistant,
});

type Action = { name: string; args: any; ok: boolean; error?: string; summary?: string; reversal?: any };
type Attachment = { id: string; name: string; mime: string; size: number; dataUrl: string; kind: "image" | "file" };
type Msg = { role: "user" | "assistant"; content: string; actions?: Action[]; attachments?: Attachment[]; kind?: "suggestion"; snapshot?: Msg[]; undone?: boolean };

type ProviderKey = "lovable" | "openai" | "openrouter" | "gemini" | "anthropic" | "deepseek" | "groq" | "mistral" | "perplexity" | "together" | "custom";

type ProviderConfig = {
  key: ProviderKey;
  label: string;
  defaultModel: string;
  modelHint: string;
  needsKey: boolean;
  needsBaseUrl?: boolean;
  keyUrl?: string;
  description?: string;
};

const PROVIDERS: ProviderConfig[] = [
  { key: "lovable", label: "Built-in (Lovable AI)", defaultModel: "google/gemini-3.1-flash-lite", modelHint: "google/gemini-3.1-flash-lite", needsKey: false, description: "Ready by default" },
  { key: "openrouter", label: "OpenRouter", defaultModel: "openai/gpt-4o-mini", modelHint: "openai/gpt-4o-mini or any vendor/model id", needsKey: true, keyUrl: "https://openrouter.ai/keys", description: "Multi-model gateway" },
  { key: "openai", label: "OpenAI / ChatGPT", defaultModel: "gpt-4o-mini", modelHint: "gpt-4o-mini, gpt-4o", needsKey: true, keyUrl: "https://platform.openai.com/api-keys", description: "ChatGPT models" },
  { key: "gemini", label: "Google Gemini", defaultModel: "gemini-1.5-flash", modelHint: "gemini-1.5-flash, gemini-1.5-pro", needsKey: true, keyUrl: "https://aistudio.google.com/app/apikey", description: "Fast Google models" },
  { key: "anthropic", label: "Claude", defaultModel: "claude-3-5-sonnet-20241022", modelHint: "claude-3-5-sonnet-20241022", needsKey: true, keyUrl: "https://console.anthropic.com/settings/keys", description: "Anthropic assistant" },
  { key: "deepseek", label: "DeepSeek", defaultModel: "deepseek-chat", modelHint: "deepseek-chat, deepseek-reasoner", needsKey: true, keyUrl: "https://platform.deepseek.com/api_keys", description: "Coding/reasoning" },
  { key: "groq", label: "Groq", defaultModel: "llama-3.3-70b-versatile", modelHint: "llama-3.3-70b-versatile", needsKey: true, keyUrl: "https://console.groq.com/keys", description: "Low latency" },
  { key: "mistral", label: "Mistral", defaultModel: "mistral-large-latest", modelHint: "mistral-large-latest", needsKey: true, keyUrl: "https://console.mistral.ai/api-keys/", description: "EU AI models" },
  { key: "perplexity", label: "Perplexity", defaultModel: "llama-3.1-sonar-small-128k-online", modelHint: "llama-3.1-sonar-small-128k-online", needsKey: true, description: "Search answers" },
  { key: "together", label: "Together AI", defaultModel: "meta-llama/Llama-3.3-70B-Instruct-Turbo", modelHint: "meta-llama/Llama-3.3-70B-Instruct-Turbo", needsKey: true, description: "Open models" },
  { key: "custom", label: "Custom OpenAI-compatible", defaultModel: "", modelHint: "your model id", needsKey: true, needsBaseUrl: true, description: "Your /v1 endpoint" },
];

type SavedConfig = { provider: ProviderKey; apiKey: string; model: string; baseUrl?: string; status?: "ok" | "error"; lastError?: string; lastSyncedAt?: string };

const CFG_KEY = "devionic.ai.configs";
const ACTIVE_KEY = "devionic.ai.activeProvider";
const PROVIDER_VERSION_KEY = "devionic.ai.providers.version";
const PROVIDER_STORE_VERSION = "rebuilt-2026-07-19";
const TRAIN_KEY = "devionic.ai.training";
const TRAIN_ACTIVE_KEY = "devionic.ai.trainingActive";
const AGENT_KEY = "devionic.ai.agentMode";
const THREADS_KEY = "devionic.ai.threads";
const ACTIVE_THREAD_KEY = "devionic.ai.activeThread";

type Thread = { id: string; title: string; updatedAt: number; messages: Msg[] };

const WELCOME: Msg = { role: "assistant", content: "Hi! I'm your Devionic AI Assistant. Turn on Agent Mode to let me actually create, update or look up records across your modules — just tell me what to do." };

function loadConfigs(): Record<string, SavedConfig> {
  try { return JSON.parse(localStorage.getItem(CFG_KEY) || "{}"); } catch { return {}; }
}
function saveConfigs(c: Record<string, SavedConfig>) { localStorage.setItem(CFG_KEY, JSON.stringify(c)); }

function loadThreads(): Thread[] {
  try { const raw = JSON.parse(localStorage.getItem(THREADS_KEY) || "[]"); return Array.isArray(raw) ? raw : []; } catch { return []; }
}
function saveThreadsLS(t: Thread[]) { localStorage.setItem(THREADS_KEY, JSON.stringify(t)); }
function makeThread(): Thread {
  return { id: crypto.randomUUID(), title: "New chat", updatedAt: Date.now(), messages: [WELCOME] };
}
function deriveTitle(msgs: Msg[]): string {
  const firstUser = msgs.find((m) => m.role === "user" && m.content.trim());
  if (firstUser) return firstUser.content.trim().replace(/\s+/g, " ").slice(0, 60) + (firstUser.content.length > 60 ? "…" : "");
  // Fall back to first meaningful assistant reply (skip the welcome message)
  const firstAssistant = msgs.find((m) => m.role === "assistant" && m.content.trim() && !m.content.startsWith("Hi! I'm your Devionic AI Assistant"));
  if (firstAssistant) return firstAssistant.content.trim().replace(/\s+/g, " ").slice(0, 60) + "…";
  return "New chat";
}
function hasRealContent(t: Thread): boolean {
  return t.messages.some((m) => m.role === "user" && m.content.trim());
}

function AIAssistant() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string>("");
  const [messages, setMessages] = useState<Msg[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const abortedRef = useRef(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const [configs, setConfigs] = useState<Record<string, SavedConfig>>({});
  const [active, setActive] = useState<ProviderKey>("lovable");
  const [training, setTraining] = useState("");
  const [trainingActive, setTrainingActive] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [agentMode, setAgentMode] = useState(true);

  // Load configs + threads once
  useEffect(() => {
    if (localStorage.getItem(PROVIDER_VERSION_KEY) !== PROVIDER_STORE_VERSION) {
      localStorage.removeItem(CFG_KEY);
      localStorage.setItem(ACTIVE_KEY, "lovable");
      localStorage.setItem(PROVIDER_VERSION_KEY, PROVIDER_STORE_VERSION);
    }
    setConfigs(loadConfigs());
    const a = (localStorage.getItem(ACTIVE_KEY) as ProviderKey) || "lovable";
    setActive(a);
    setTraining(localStorage.getItem(TRAIN_KEY) || "");
    setTrainingActive(localStorage.getItem(TRAIN_ACTIVE_KEY) !== "0");
    setAgentMode(localStorage.getItem(AGENT_KEY) !== "0");

    let list = loadThreads();
    let activeId = localStorage.getItem(ACTIVE_THREAD_KEY) || "";
    if (list.length === 0) {
      const t = makeThread();
      list = [t];
      activeId = t.id;
      saveThreadsLS(list);
      localStorage.setItem(ACTIVE_THREAD_KEY, activeId);
    } else if (!list.some((t) => t.id === activeId)) {
      activeId = list[0].id;
      localStorage.setItem(ACTIVE_THREAD_KEY, activeId);
    }
    setThreads(list);
    setActiveThreadId(activeId);
    const active = list.find((t) => t.id === activeId)!;
    setMessages(active.messages && active.messages.length ? active.messages : [WELCOME]);
  }, []);

  // Persist active thread's messages whenever they change
  useEffect(() => {
    if (!activeThreadId) return;
    setThreads((prev) => {
      const next = prev.map((t) => t.id === activeThreadId
        ? { ...t, messages, title: deriveTitle(messages), updatedAt: Date.now() }
        : t);
      saveThreadsLS(next);
      return next;
    });
  }, [messages, activeThreadId]);

  function newChat() {
    if (loading) { abortedRef.current = true; setLoading(false); }
    // If the current thread has no user messages yet, reuse it instead of piling up empty threads.
    const current = threads.find((t) => t.id === activeThreadId);
    if (current && !hasRealContent(current)) {
      setMessages([WELCOME]);
      setInput("");
      setAttachments([]);
      setEditingIdx(null);
      return;
    }
    const t = makeThread();
    const next = [t, ...threads];
    setThreads(next);
    saveThreadsLS(next);
    setActiveThreadId(t.id);
    localStorage.setItem(ACTIVE_THREAD_KEY, t.id);
    setMessages(t.messages);
    setInput("");
    setAttachments([]);
    setEditingIdx(null);
  }

  function switchThread(id: string) {
    if (id === activeThreadId) return;
    if (loading) { abortedRef.current = true; setLoading(false); }
    const t = threads.find((x) => x.id === id);
    if (!t) return;
    setActiveThreadId(id);
    localStorage.setItem(ACTIVE_THREAD_KEY, id);
    setMessages(t.messages && t.messages.length ? t.messages : [WELCOME]);
    setEditingIdx(null);
    setInput("");
    setAttachments([]);
  }

  function deleteThread(id: string) {
    const remaining = threads.filter((t) => t.id !== id);
    if (remaining.length === 0) {
      const t = makeThread();
      remaining.push(t);
    }
    setThreads(remaining);
    saveThreadsLS(remaining);
    if (id === activeThreadId) {
      const nextId = remaining[0].id;
      setActiveThreadId(nextId);
      localStorage.setItem(ACTIVE_THREAD_KEY, nextId);
      setMessages(remaining[0].messages && remaining[0].messages.length ? remaining[0].messages : [WELCOME]);
    }
  }

  function clearAllThreads() {
    if (!confirm("Delete ALL chat history? This cannot be undone.")) return;
    const t = makeThread();
    setThreads([t]);
    saveThreadsLS([t]);
    setActiveThreadId(t.id);
    localStorage.setItem(ACTIVE_THREAD_KEY, t.id);
    setMessages(t.messages);
  }

  async function copyText(text: string) {
    try { await navigator.clipboard.writeText(text); toast.success("Copied"); }
    catch { toast.error("Copy failed"); }
  }

  function deleteMessage(idx: number) {
    setMessages((m) => m.filter((_, i) => i !== idx));
  }

  function startEdit(idx: number) {
    setEditingIdx(idx);
    setEditDraft(messages[idx].content);
  }

  function saveEdit() {
    if (editingIdx == null) return;
    const idx = editingIdx;
    setMessages((m) => m.map((msg, i) => i === idx ? { ...msg, content: editDraft } : msg));
    setEditingIdx(null);
    setEditDraft("");
  }

  function stopGeneration() {
    abortedRef.current = true;
    setLoading(false);
    toast.info("Generation stopped");
  }

  const [undoingIdx, setUndoingIdx] = useState<number | null>(null);
  async function undoMessage(idx: number) {
    const msg = messages[idx];
    if (!msg || msg.role !== "assistant" || msg.undone) return;
    if (!confirm("Undo this AI turn? Any database changes it made will be reverted and the chat will restore to the previous state.")) return;
    setUndoingIdx(idx);
    try {
      const reversals = (msg.actions || [])
        .filter((a) => a.ok && a.reversal)
        .map((a) => a.reversal);
      if (reversals.length) {
        const { results } = await undoActions({ data: { reversals } });
        const failed = results.filter((r) => !r.ok);
        if (failed.length) toast.error(`Undo partial: ${failed.length} step(s) failed`);
        else toast.success(`Reverted ${results.length} change(s)`);
      } else {
        toast.success("Chat turn removed");
      }
      // Restore chat to pre-turn snapshot if available; else just drop this msg + previous user msg
      if (msg.snapshot) {
        setMessages(msg.snapshot);
      } else {
        setMessages((m) => {
          const trimmed = [...m];
          trimmed.splice(idx, 1);
          if (trimmed[idx - 1]?.role === "user") trimmed.splice(idx - 1, 1);
          return trimmed;
        });
      }
    } catch (e: any) {
      toast.error(e.message || "Undo failed");
    } finally {
      setUndoingIdx(null);
    }
  }

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  function currentConfig(): SavedConfig | null {
    if (active === "lovable") return { provider: "lovable", apiKey: "", model: "google/gemini-3.1-flash-lite", status: "ok" };
    return configs[active] || null;
  }

  function fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = () => reject(r.error);
      r.readAsDataURL(file);
    });
  }

  async function addFiles(files: FileList | null) {
    if (!files || !files.length) return;
    const MAX = 15 * 1024 * 1024;
    const added: Attachment[] = [];
    for (const f of Array.from(files)) {
      if (f.size > MAX) { toast.error(`${f.name} is over 15 MB — skipped.`); continue; }
      const url = await fileToDataUrl(f);
      added.push({
        id: crypto.randomUUID(),
        name: f.name,
        mime: f.type || "application/octet-stream",
        size: f.size,
        dataUrl: url,
        kind: f.type.startsWith("image/") ? "image" : "file",
      });
    }
    if (added.length) setAttachments((a) => [...a, ...added]);
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data.size) chunksRef.current.push(e.data); };
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
        if (blob.size < 1500) { toast.error("Recording too short."); return; }
        setTranscribing(true);
        try {
          const buf = await blob.arrayBuffer();
          let b64 = "";
          const bytes = new Uint8Array(buf);
          for (let i = 0; i < bytes.length; i += 0x8000) b64 += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + 0x8000)));
          const audioBase64 = btoa(b64);
          const { text } = await transcribeAudio({ data: { audioBase64, mimeType: blob.type } });
          if (text) setInput((v) => (v ? v + " " : "") + text);
          else toast.error("Nothing recognized. Try again.");
        } catch (e: any) {
          toast.error(e.message || "Transcription failed");
        } finally { setTranscribing(false); }
      };
      rec.start();
      recorderRef.current = rec;
      setRecording(true);
    } catch (e: any) {
      toast.error("Mic permission denied.");
    }
  }
  function stopRecording() {
    recorderRef.current?.stop();
    recorderRef.current = null;
    setRecording(false);
  }

  // ---- Plan / Approve / Execute flow ----
  const [planOpen, setPlanOpen] = useState(false);
  const [planLoading, setPlanLoading] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<any | null>(null);
  const [revisionNotes, setRevisionNotes] = useState("");
  const [pendingRequest, setPendingRequest] = useState<{ text: string; attachments: Attachment[]; wireMessages: any[]; snapshot: Msg[] } | null>(null);

  // Heuristic: does the user's message ask the AI to DO something on the
  // system (create/update/delete/generate records), vs just chat / ask?
  // If not a command, the agent stays idle and we just answer as a chat.
  function isSystemCommand(text: string): boolean {
    const t = text.toLowerCase().trim();
    if (!t) return false;
    // Explicit prefixes always activate
    if (t.startsWith("/do ") || t.startsWith("/agent ") || t.startsWith("!do ")) return true;
    // Pure questions → not a command
    const isQuestion = /[?？]$/.test(t) || /^(what|why|how|when|who|which|where|kya|kese|kaise|kyun|kaisa|batao|explain|show me|list|tell me)\b/.test(t);
    // Action verbs (English + Roman Urdu)
    const actionRe = /\b(create|add|insert|new|make|generate|build|update|edit|modify|change|set|assign|mark|approve|reject|delete|remove|drop|clear|reset|send|email|notify|schedule|book|import|export|upload|download|fill|complete|close|open|lock|unlock|pay|collect|post|record|register|enroll|onboard|terminate|promote|deactivate|activate|banao|banayo|banaya|karo|kardo|update karo|add karo|delete karo|remove karo|mark karo|fill karo|create karo|generate karo|likho|likh do|bhejo|bhej do|khol|band karo)\b/;
    if (actionRe.test(t)) return true;
    if (isQuestion) return false;
    return false;
  }

  function buildWireMessages(all: Msg[]) {
    return all.map((m) => {
      if (!m.attachments || m.attachments.length === 0) return { role: m.role, content: m.content };
      const parts: any[] = [];
      if (m.content) parts.push({ type: "text", text: m.content });
      for (const a of m.attachments) {
        if (a.kind === "image") parts.push({ type: "image_url", image_url: { url: a.dataUrl } });
        else parts.push({ type: "file", file: { filename: a.name, file_data: a.dataUrl } });
      }
      return { role: m.role, content: parts };
    });
  }


  async function runChat(wireMessages: any[], cfg: SavedConfig | null, forcedAgent?: boolean, extraSystem?: string) {
    const payload = {
      messages: wireMessages,
      provider: active,
      apiKey: cfg?.apiKey,
      model: cfg?.model,
      baseUrl: cfg?.baseUrl,
      systemPrompt: [
        (trainingActive && training) ? training : "",
        extraSystem || "",
      ].filter(Boolean).join("\n\n") || undefined,
      agentMode: forcedAgent ?? agentMode,
    };
    try {
      return await chatWithAI({ data: payload });
    } catch (e: any) {
      const msg = String(e?.message || e || "");
      const isNetwork = /failed to fetch|network|unreachable|load failed|typeerror.*fetch/i.test(msg);
      // Browser-side fallback for non-Lovable providers when the server route is blocked.
      if (isNetwork && active !== "lovable" && cfg?.apiKey && !payload.agentMode) {
        const sys = [
          payload.systemPrompt || "You are Devionic DMS AI Assistant — concise, helpful. Reply in English or Roman Urdu to match the user.",
        ].filter(Boolean).join("\n\n");
        const msgs = [{ role: "system", content: sys }, ...wireMessages];
        const req = buildRequest(active, cfg.apiKey, cfg.model || "", cfg.baseUrl, msgs);
        const json = await callProvider(req, active);
        return { reply: req.parse(json) || "(no response)", actions: [] as any[] };
      }
      throw e;
    }
  }


  async function requestPlan(userText: string, notes?: string, previousPlan?: any) {
    const cfg = currentConfig();
    const historyContext = messages
      .slice(-6)
      .map((m) => `${m.role === "user" ? "USER" : "AI"}: ${m.content}`)
      .join("\n");
    const { plan } = await planActions({
      data: {
        userRequest: userText,
        provider: active,
        apiKey: cfg?.apiKey,
        model: cfg?.model,
        baseUrl: cfg?.baseUrl,
        systemPrompt: (trainingActive && training) ? training : undefined,
        revisionNotes: notes,
        previousPlan,
        historyContext,
      },
    });
    return plan;
  }

  async function send() {
    const text = input.trim();
    if ((!text && attachments.length === 0) || loading || planLoading) return;
    const cfg = currentConfig();
    if (active !== "lovable" && (!cfg || !cfg.apiKey)) {
      toast.error("Add & sync an API key in Settings first.");
      return;
    }
    const userMsg: Msg = { role: "user", content: text, attachments: attachments.length ? attachments : undefined };
    const snapshotBefore = messages;
    const next: Msg[] = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setAttachments([]);

    const wireMessages = buildWireMessages(next);

    // Agent mode → plan first, ask user to approve — BUT only when the user's
    // message is actually a system command / instruction. Plain questions or
    // chit-chat should never activate the agent on the system.
    if (agentMode && text && isSystemCommand(text)) {
      setPendingRequest({ text, attachments: userMsg.attachments || [], wireMessages, snapshot: snapshotBefore });
      setRevisionNotes("");
      setCurrentPlan(null);
      setPlanOpen(true);
      setPlanLoading(true);
      try {
        const plan = await requestPlan(text);
        setCurrentPlan(plan);
      } catch (e: any) {
        toast.error(e.message || "Planning failed");
        setPlanOpen(false);
        setPendingRequest(null);
      } finally {
        setPlanLoading(false);
      }
      return;
    }


    // Plain chat (no agent) — go straight to model
    abortedRef.current = false;
    setLoading(true);
    try {
      const { reply, actions } = await runChat(wireMessages, cfg, false);
      if (abortedRef.current) return;
      setMessages((m) => [...m, { role: "assistant", content: reply || "(no response)", actions: actions as Action[], snapshot: snapshotBefore }]);
    } catch (e: any) {
      if (abortedRef.current) return;
      toast.error(e.message ?? "AI request failed");
      setMessages((m) => [...m, { role: "assistant", content: `⚠️ ${e.message ?? "AI request failed"}`, snapshot: snapshotBefore }]);
    } finally {
      setLoading(false);
    }
  }

  async function reviseAndReplan() {
    if (!pendingRequest || !revisionNotes.trim()) {
      toast.error("Enter what you want to change first.");
      return;
    }
    setPlanLoading(true);
    try {
      const plan = await requestPlan(pendingRequest.text, revisionNotes.trim(), currentPlan);
      setCurrentPlan(plan);
      setRevisionNotes("");
      toast.success("New plan generated");
    } catch (e: any) {
      toast.error(e.message || "Re-plan failed");
    } finally {
      setPlanLoading(false);
    }
  }

  async function approveAndExecute() {
    if (!pendingRequest || !currentPlan) return;
    setPlanOpen(false);
    abortedRef.current = false;
    setLoading(true);
    const cfg = currentConfig();
    const approvedPlanText = JSON.stringify(currentPlan);
    const extra = `USER APPROVED THIS EXACT PLAN — execute it now step-by-step using your tools. Do NOT ask for further confirmation. Do NOT deviate from the approved steps.\n\nAPPROVED_PLAN:\n${approvedPlanText}`;
    try {
      const { reply, actions } = await runChat(pendingRequest.wireMessages, cfg, true, extra);
      if (abortedRef.current) return;
      setMessages((m) => [...m, { role: "assistant", content: reply || "(done)", actions: actions as Action[], snapshot: pendingRequest.snapshot }]);
    } catch (e: any) {
      if (abortedRef.current) return;
      toast.error(e.message ?? "Execution failed");
      setMessages((m) => [...m, { role: "assistant", content: `⚠️ ${e.message ?? "Execution failed"}`, snapshot: pendingRequest.snapshot }]);
    } finally {
      setLoading(false);
      setPendingRequest(null);
      setCurrentPlan(null);
    }
  }

  function cancelPlan() {
    setPlanOpen(false);
    setPendingRequest(null);
    setCurrentPlan(null);
    setRevisionNotes("");
    setMessages((m) => [...m, { role: "assistant", content: "⏸️ Plan cancelled — nothing was changed." }]);
  }

  const [suggestLoading, setSuggestLoading] = useState(false);

  async function runSuggestions(focus?: string) {
    if (suggestLoading || loading) return;
    const cfg = currentConfig();
    if (active !== "lovable" && (!cfg || !cfg.apiKey)) {
      toast.error("Add & sync an API key in Settings first.");
      return;
    }
    const focusText = (focus ?? input).trim();
    if (focusText) {
      setMessages((m) => [...m, { role: "user", content: focusText }]);
      setInput("");
    }
    setSuggestLoading(true);
    setMessages((m) => [...m, { role: "assistant", content: "🔍 Scanning your workspace across all modules…" }]);
    try {
      const { suggestions } = await scanAndSuggest({
        data: {
          focus: focusText || undefined,
          provider: active,
          apiKey: cfg?.apiKey,
          model: cfg?.model,
          baseUrl: cfg?.baseUrl,
          systemPrompt: (trainingActive && training) ? training : undefined,
        },
      });
      setMessages((m) => {
        const trimmed = m.slice(0, -1); // remove the scanning placeholder
        return [...trimmed, { role: "assistant", content: suggestions, kind: "suggestion" }];
      });
      toast.success("Suggestions ready — generating PDF report…");
      try {
        const dateStr = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
        const refNo = `SUG-${new Date().toISOString().slice(0,10).replace(/-/g,"")}-${String(Math.floor(Math.random()*900+100))}`;
        const body = pdfSafe(stripMarkdown(suggestions));
        const safeSubject = pdfSafe(focusText ? `Workspace Suggestions - ${focusText}` : "Workspace Suggestions Report");
        const fileBase = `workspace-suggestions-${new Date().toISOString().slice(0,10)}`;
        const opts = {
          refNo,
          date: dateStr,
          subject: safeSubject,
          recipientLines: ["The Management", "Devionic (Private) Limited", "Head Office - Layyah, Punjab"],
          salutation: "Respected Sir/Madam,",
          body:
            `Please find below the AI-generated workspace analysis and prioritised suggestions based on a full scan of the operational modules of Devionic DMS as of ${dateStr}.\n\n` +
            body +
            `\n\nThis report has been generated automatically by the Devionic AI Assistant for internal review and action planning. Kindly consider the recommendations at your convenience.`,
          closing: "For Devionic (Private) Limited,",
          signatoryName: "Devionic AI Assistant",
          signatoryTitle: "Automated Business Intelligence Report",
        };
        const { downloadLetterhead } = await letterheadPdf();
        await downloadLetterhead(fileBase, opts);
        // Register in Docs & Records (system-generated)
        try {
          generatedDocs.add({
            doc_no: refNo,
            title: safeSubject,
            template_id: "ai-suggestions",
            template_name: "AI Workspace Suggestions",
            category: "report",
            party: "Internal — Management",
            owner: "Devionic AI Assistant",
            signatory_title: "Automated Business Intelligence Report",
            date: dateStr,
            opts: opts as any,
          });
        } catch { /* noop */ }
        toast.success("PDF report downloaded & saved to Docs & Records");
      } catch (pdfErr: any) {
        toast.error(`PDF generation failed: ${pdfErr?.message ?? pdfErr}`);
      }
    } catch (e: any) {
      setMessages((m) => {
        const trimmed = m.slice(0, -1);
        return [...trimmed, { role: "assistant", content: `⚠️ Scan failed: ${e.message ?? e}` }];
      });
      toast.error(e.message ?? "Suggestions failed");
    } finally {
      setSuggestLoading(false);
    }
  }






  const activeCfg = currentConfig();
  const activeLabel = PROVIDERS.find((p) => p.key === active)?.label || active;

  return (
    <AppLayout>
      <PageHeader title="AI Assistant" description="Your always-on business co-pilot — bring your own API key or use built-in AI." />

      <div className="flex items-center gap-2 mb-3">
        <Badge variant="secondary" className="gap-1">
          <Star className="h-3 w-3 fill-current" /> Default: {activeLabel}
        </Badge>
        {activeCfg?.status === "ok" && active !== "lovable" && (
          <Badge className="gap-1 bg-emerald-600 hover:bg-emerald-600"><CheckCircle2 className="h-3 w-3" /> Synced</Badge>
        )}
        {activeCfg?.status === "error" && (
          <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> Sync error</Badge>
        )}
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={newChat} title="Start a new chat">
            <MessageSquarePlus className="h-4 w-4 mr-1" /> New chat
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" title="Chat history">
                <History className="h-4 w-4 mr-1" /> History
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">{threads.filter(hasRealContent).length}</Badge>
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-0">
              <div className="flex items-center justify-between px-3 py-2 border-b">
                <p className="text-xs font-semibold">Previous chats</p>
                <Button variant="ghost" size="sm" className="h-7 text-xs text-red-600 hover:text-red-700" onClick={clearAllThreads}>
                  <Trash2 className="h-3 w-3 mr-1" /> Clear all
                </Button>
              </div>
              <ScrollArea className="max-h-80">
                <ul className="p-1">
                  {(() => {
                    const visible = threads.filter(hasRealContent);
                    if (visible.length === 0) {
                      return (
                        <li className="px-3 py-6 text-xs text-muted-foreground text-center">
                          No previous chats yet. Send a message to start one — it will stay here until you delete it.
                        </li>
                      );
                    }
                    return visible.map((t) => (
                      <li key={t.id} className={"group flex items-center gap-1 rounded-md px-2 py-1.5 text-xs " + (t.id === activeThreadId ? "bg-accent" : "hover:bg-muted")}>
                        <button className="flex-1 text-left truncate" onClick={() => switchThread(t.id)}>
                          <span className="font-medium block truncate">{t.title || deriveTitle(t.messages)}</span>
                          <span className="text-[10px] text-muted-foreground">{new Date(t.updatedAt).toLocaleString()}</span>
                        </button>
                        <button
                          className="opacity-0 group-hover:opacity-100 rounded p-1 hover:bg-destructive/10 text-destructive"
                          onClick={(e) => { e.stopPropagation(); deleteThread(t.id); }}
                          title="Delete chat"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </li>
                    ));
                  })()}
                </ul>
              </ScrollArea>
            </PopoverContent>
          </Popover>
          <Button
            variant="outline"
            size="sm"
            onClick={() => runSuggestions()}
            disabled={suggestLoading || loading}
            title="Scan all modules and get prioritised suggestions"
          >
            {suggestLoading
              ? <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              : <Lightbulb className="h-4 w-4 mr-1 text-amber-500" />}
            Suggestions
          </Button>
          <label className="flex items-center gap-2 text-xs cursor-pointer select-none px-2 py-1 rounded-md border bg-card">
            <Zap className={"h-3.5 w-3.5 " + (agentMode ? "text-amber-500" : "text-muted-foreground")} />
            <span className="font-medium">Agent Mode</span>
            <Switch
              checked={agentMode}
              onCheckedChange={(v) => { setAgentMode(v); localStorage.setItem(AGENT_KEY, v ? "1" : "0"); }}
            />
          </label>
          <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm"><Settings className="h-4 w-4 mr-1" /> AI Settings</Button>
            </DialogTrigger>
            <AISettingsDialog
              configs={configs}
              setConfigs={(c) => { setConfigs(c); saveConfigs(c); }}
              active={active}
              setActive={(a) => { setActive(a); localStorage.setItem(ACTIVE_KEY, a); }}
              training={training}
              setTraining={(t) => { setTraining(t); localStorage.setItem(TRAIN_KEY, t); }}
              trainingActive={trainingActive}
              setTrainingActive={(v) => { setTrainingActive(v); localStorage.setItem(TRAIN_ACTIVE_KEY, v ? "1" : "0"); }}
            />
          </Dialog>
        </div>
      </div>

      {agentMode && (
        <div className="mb-3 rounded-lg border border-amber-300/50 bg-amber-50 dark:bg-amber-950/30 p-3 text-xs text-amber-900 dark:text-amber-100 flex items-start gap-2">
          <Wrench className="h-4 w-4 mt-0.5 shrink-0" />
          <div>
            <strong>Agent Mode is on — but idle.</strong> The AI only activates on the system when you give it an actual command (e.g. <em>"create task…"</em>, <em>"mark attendance…"</em>, <em>"update employee…"</em>, or prefix with <code>/do</code>). Plain questions and chat stay conversational and never touch your data.
          </div>
        </div>
      )}



      <div className="rounded-2xl bg-card border shadow-sm flex flex-col h-[calc(100vh-16rem)]">
        <div className="flex items-center gap-2 border-b p-4">
          <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-primary to-accent grid place-items-center text-primary-foreground">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold text-sm">Devionic AI</p>
            <p className="text-xs text-muted-foreground">{activeLabel}{activeCfg?.model ? ` · ${activeCfg.model}` : ""}</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((m, i) => {
            const isUser = m.role === "user";
            const isEditing = editingIdx === i;
            return (
              <div key={i} className={"group " + (isUser ? "flex justify-end" : "flex justify-start")}>
                <div className={"max-w-[85%] space-y-2 " + (isUser ? "items-end" : "items-start")}>
                  {m.actions && m.actions.length > 0 && (
                    <TaskProgress actions={m.actions} />
                  )}
                  <div className={"rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap " +
                    (isUser
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : m.kind === "suggestion"
                        ? "bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/40 dark:to-yellow-950/30 border border-amber-200 dark:border-amber-800 rounded-bl-sm"
                        : "bg-muted rounded-bl-sm")}>
                    {m.kind === "suggestion" && (
                      <div className="flex items-center gap-2 mb-2 pb-2 border-b border-amber-200/60 dark:border-amber-800/60">
                        <Lightbulb className="h-4 w-4 text-amber-600" />
                        <span className="font-semibold text-amber-900 dark:text-amber-100 text-xs uppercase tracking-wide">Workspace Suggestions</span>
                      </div>
                    )}
                    {m.attachments && m.attachments.length > 0 && (
                      <div className="mb-2 flex flex-wrap gap-2">
                        {m.attachments.map((a) => (
                          a.kind === "image" ? (
                            <img key={a.id} src={a.dataUrl} alt={a.name} className="max-h-40 rounded-md border" />
                          ) : (
                            <div key={a.id} className="flex items-center gap-2 rounded-md bg-background/40 border px-2 py-1 text-xs">
                              {a.mime.startsWith("video/") ? <Film className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
                              <span className="truncate max-w-[180px]">{a.name}</span>
                            </div>
                          )
                        ))}
                      </div>
                    )}
                    {isEditing ? (
                      <div className="space-y-2 min-w-[240px]">
                        <Textarea
                          value={editDraft}
                          onChange={(e) => setEditDraft(e.target.value)}
                          rows={3}
                          className="text-sm bg-background text-foreground"
                        />
                        <div className="flex gap-2 justify-end">
                          <Button size="sm" variant="ghost" className="h-7" onClick={() => { setEditingIdx(null); setEditDraft(""); }}>
                            Cancel
                          </Button>
                          <Button size="sm" className="h-7" onClick={saveEdit} disabled={!editDraft.trim()}>
                            <Check className="h-3 w-3 mr-1" /> Save
                          </Button>
                        </div>
                      </div>
                    ) : (
                      m.content
                    )}
                  </div>
                  {!isEditing && (() => {
                    const reversibleCount = (m.actions || []).filter((a) => a.ok && a.reversal).length;
                    const canUndo = !isUser && !m.undone && (!!m.snapshot || reversibleCount > 0);
                    return (
                      <div className={"flex items-center gap-1 " + (isUser ? "justify-end" : "justify-start") + " " + (canUndo ? "" : "opacity-0 group-hover:opacity-100 transition-opacity")}>
                        {canUndo && (
                          <button
                            onClick={() => undoMessage(i)}
                            disabled={undoingIdx === i}
                            className="flex items-center gap-1 px-2 py-1 rounded-md bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 hover:bg-amber-200 dark:hover:bg-amber-900/60 text-xs font-medium disabled:opacity-50"
                            title={reversibleCount ? `Undo this reply and revert ${reversibleCount} DB change(s)` : "Undo this reply"}
                          >
                            {undoingIdx === i ? <Loader2 className="h-3 w-3 animate-spin" /> : <Undo2 className="h-3 w-3" />}
                            Undo
                            {reversibleCount > 0 && (
                              <span className="ml-0.5 rounded-full bg-amber-600/20 px-1 text-[10px]">{reversibleCount}</span>
                            )}
                          </button>
                        )}
                        {m.undone && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">Undone</span>
                        )}
                        <button
                          onClick={() => copyText(m.content)}
                          className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                          title="Copy"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                        {isUser && (
                          <button
                            onClick={() => startEdit(i)}
                            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                            title="Edit"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => deleteMessage(i)}
                          className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                          title="Delete message"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })()}
                </div>
              </div>
            );
          })}
          {(loading || suggestLoading) && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3 text-sm flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> {suggestLoading ? "Scanning workspace…" : "Thinking…"}
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        <div className="border-t p-3 space-y-2">
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {attachments.map((a) => (
                <div key={a.id} className="relative group rounded-md border bg-muted/40 p-1 pr-6 flex items-center gap-2 text-xs">
                  {a.kind === "image"
                    ? <img src={a.dataUrl} alt={a.name} className="h-10 w-10 object-cover rounded" />
                    : <div className="h-10 w-10 grid place-items-center bg-background rounded">
                        {a.mime.startsWith("video/") ? <Film className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                      </div>}
                  <span className="truncate max-w-[160px]">{a.name}</span>
                  <button
                    onClick={() => setAttachments((v) => v.filter((x) => x.id !== a.id))}
                    className="absolute top-0.5 right-0.5 rounded-full bg-background border p-0.5 opacity-70 hover:opacity-100"
                    aria-label="Remove"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2 items-end">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.json"
              className="hidden"
              onChange={(e) => { addFiles(e.target.files); if (fileInputRef.current) fileInputRef.current.value = ""; }}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              title="Attach image, PDF, doc, video"
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant={recording ? "destructive" : "outline"}
              size="icon"
              onClick={recording ? stopRecording : startRecording}
              disabled={transcribing}
              title={recording ? "Stop recording" : "Voice message"}
            >
              {transcribing ? <Loader2 className="h-4 w-4 animate-spin" /> : recording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder={recording ? "🔴 Recording… tap mic to stop" : "Ask anything — any language, or attach a file…"}
              className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
            />
            {loading || planLoading || suggestLoading ? (
              <Button variant="destructive" onClick={stopGeneration} title="Stop generation">
                <Square className="h-4 w-4 mr-1 fill-current" /> Stop
              </Button>
            ) : (
              <Button onClick={send} disabled={loading || (!input.trim() && attachments.length === 0)}>
                <Send className="h-4 w-4 mr-1" /> Send
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Plan approval dialog */}
      <Dialog open={planOpen} onOpenChange={(v) => { if (!v && !loading) cancelPlan(); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-amber-500" />
              Review the AI's plan before it runs
            </DialogTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Agent mode won't touch your data until you approve. Review each step, revise if needed, or approve to execute.
            </p>
          </DialogHeader>

          {planLoading && (
            <div className="py-10 flex flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              Building plan…
            </div>
          )}

          {!planLoading && currentPlan && (
            <div className="space-y-4">
              <div className="rounded-lg border p-3 bg-muted/40">
                <p className="text-sm font-semibold flex items-center gap-2">
                  <ListChecks className="h-4 w-4 text-primary" /> {currentPlan.title || "Proposed plan"}
                </p>
                {currentPlan.summary && (
                  <p className="text-xs text-muted-foreground mt-1">{currentPlan.summary}</p>
                )}
              </div>

              <div className="space-y-2">
                {(currentPlan.steps as any[]).map((s, i) => {
                  const actionColor: Record<string, string> = {
                    add: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-200 dark:border-emerald-800",
                    edit: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/50 dark:text-blue-200 dark:border-blue-800",
                    remove: "bg-red-100 text-red-800 border-red-200 dark:bg-red-950/50 dark:text-red-200 dark:border-red-800",
                    generate: "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/50 dark:text-purple-200 dark:border-purple-800",
                    lookup: "bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700",
                  };
                  const cls = actionColor[s.action] || actionColor.lookup;
                  return (
                    <div key={i} className="rounded-lg border p-3 bg-card">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono text-muted-foreground">#{i + 1}</span>
                        <span className={`text-[11px] px-2 py-0.5 rounded-md border uppercase font-semibold ${cls}`}>
                          {s.action}
                        </span>
                        <Badge variant="outline" className="text-[11px]">{s.module}</Badge>
                      </div>
                      <p className="text-sm mt-2">{s.description}</p>
                      {s.details && Object.keys(s.details).length > 0 && (
                        <pre className="mt-2 text-[11px] bg-muted/60 rounded p-2 overflow-x-auto whitespace-pre-wrap">
{JSON.stringify(s.details, null, 2)}
                        </pre>
                      )}
                    </div>
                  );
                })}
              </div>

              {Array.isArray(currentPlan.risks) && currentPlan.risks.length > 0 && (
                <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-800 p-3">
                  <p className="text-xs font-semibold text-amber-900 dark:text-amber-100 mb-1">⚠️ Please note</p>
                  <ul className="list-disc list-inside text-xs text-amber-900 dark:text-amber-100 space-y-0.5">
                    {currentPlan.risks.map((r: string, i: number) => <li key={i}>{r}</li>)}
                  </ul>
                </div>
              )}

              <div className="space-y-2 pt-2 border-t">
                <Label className="text-xs flex items-center gap-1">
                  <RefreshCw className="h-3 w-3" /> Want changes? Describe them and re-plan
                </Label>
                <Textarea
                  value={revisionNotes}
                  onChange={(e) => setRevisionNotes(e.target.value)}
                  placeholder="e.g. skip step 2, use employee code EMP-023 instead, add status = active…"
                  rows={3}
                />
                <Button variant="outline" size="sm" onClick={reviseAndReplan} disabled={planLoading || !revisionNotes.trim()}>
                  {planLoading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />}
                  Apply changes & re-plan
                </Button>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={cancelPlan} disabled={planLoading}>
              <X className="h-4 w-4 mr-1" /> Cancel
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={approveAndExecute}
              disabled={planLoading || !currentPlan}
            >
              <CheckCircle2 className="h-4 w-4 mr-1" /> Approve & execute
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

function TaskProgress({ actions }: { actions: Action[] }) {
  const [open, setOpen] = useState(true);
  const okCount = actions.filter((a) => a.ok).length;
  const failCount = actions.length - okCount;
  const allOk = failCount === 0;

  function describe(a: Action): string {
    const t = a.args?.table ? ` · ${a.args.table}` : "";
    const parts: string[] = [];
    if (a.args?.filters && Object.keys(a.args.filters).length) {
      parts.push("where " + Object.entries(a.args.filters).map(([k, v]) =>
        `${k}=${Array.isArray(v) ? `[${(v as any[]).join(",")}]` : JSON.stringify(v)}`
      ).join(", "));
    }
    if (a.args?.values && Object.keys(a.args.values).length) {
      const vals = Object.entries(a.args.values).slice(0, 4).map(([k, v]) =>
        `${k}=${typeof v === "string" ? v.slice(0, 40) : JSON.stringify(v)}`
      ).join(", ");
      parts.push("set " + vals + (Object.keys(a.args.values).length > 4 ? " …" : ""));
    }
    if (a.args?.columns) parts.push(`cols: ${a.args.columns}`);
    if (a.args?.limit) parts.push(`limit ${a.args.limit}`);
    return (a.name + t + (parts.length ? " — " + parts.join(" | ") : ""));
  }

  return (
    <div className={"rounded-lg border w-full " + (allOk ? "bg-emerald-50/60 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800" : "bg-amber-50/60 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800")}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium"
      >
        {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        <ClipboardCheck className={"h-4 w-4 " + (allOk ? "text-emerald-600" : "text-amber-600")} />
        <span>
          Task progress — {actions.length} step{actions.length === 1 ? "" : "s"}
          {" · "}
          <span className="text-emerald-700 dark:text-emerald-300">{okCount} ok</span>
          {failCount > 0 && <> · <span className="text-red-700 dark:text-red-300">{failCount} failed</span></>}
        </span>
      </button>
      {open && (
        <ol className="px-3 pb-3 space-y-1.5">
          {actions.map((a, i) => (
            <li key={i} className="text-[11px] rounded-md border bg-background/70 px-2 py-1.5">
              <div className="flex items-start gap-2">
                <span className="font-mono text-muted-foreground shrink-0">#{i + 1}</span>
                {a.ok
                  ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 mt-0.5 shrink-0" />
                  : <XCircle className="h-3.5 w-3.5 text-red-600 mt-0.5 shrink-0" />}
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{a.summary || a.name}</div>
                  <div className="font-mono text-[10px] text-muted-foreground break-all">{describe(a)}</div>
                  {a.error && <div className="text-red-700 dark:text-red-300 mt-0.5">✗ {a.error}</div>}
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function AISettingsDialog({
  configs, setConfigs, active, setActive, training, setTraining, trainingActive, setTrainingActive,
}: {
  configs: Record<string, SavedConfig>;
  setConfigs: (c: Record<string, SavedConfig>) => void;
  active: ProviderKey;
  setActive: (a: ProviderKey) => void;
  training: string;
  setTraining: (t: string) => void;
  trainingActive: boolean;
  setTrainingActive: (v: boolean) => void;
}) {
  const [selected, setSelected] = useState<ProviderKey>(active === "lovable" ? "openai" : active);
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [orModels, setOrModels] = useState<{ id: string; name?: string }[]>([]);
  const [orLoading, setOrLoading] = useState(false);
  const [orFilter, setOrFilter] = useState("");

  const meta = PROVIDERS.find((p) => p.key === selected)!;

  useEffect(() => {
    const existing = configs[selected];
    setApiKey(existing?.apiKey || "");
    setModel(existing?.model || meta.defaultModel);
    setBaseUrl(existing?.baseUrl || "");
    setError(existing?.lastError || null);
    setSuccess(null);
    setOrFilter("");
  }, [selected, configs]);

  useEffect(() => {
    if (selected !== "openrouter" || orModels.length > 0) return;
    setOrLoading(true);
    fetch("https://openrouter.ai/api/v1/models")
      .then((r) => r.json())
      .then((j) => {
        const list = Array.isArray(j?.data) ? j.data.map((m: any) => ({ id: m.id, name: m.name })) : [];
        list.sort((a: any, b: any) => a.id.localeCompare(b.id));
        setOrModels(list);
      })
      .catch(() => {})
      .finally(() => setOrLoading(false));
  }, [selected]);

  async function sync() {
    setSyncing(true); setError(null); setSuccess(null);
    const cleanApiKey = apiKey.trim();
    const cleanModel = model.trim();
    const cleanBaseUrl = baseUrl.trim();
    if (meta.needsKey && !cleanApiKey) {
      const msg = "API key required.";
      setError(msg);
      toast.error(msg);
      setSyncing(false);
      return;
    }
    if (meta.needsBaseUrl && !cleanBaseUrl) {
      const msg = "Base URL required for custom provider.";
      setError(msg);
      toast.error(msg);
      setSyncing(false);
      return;
    }
    const payload = {
      provider: selected,
      apiKey: cleanApiKey,
      model: cleanModel || undefined,
      baseUrl: cleanBaseUrl || undefined,
    };

    try {
      let reply = "OK";
      try {
        const res = await testAIProvider({ data: payload });
        reply = res.reply || "OK";
      } catch (serverErr: any) {
        const raw = String(serverErr?.message || serverErr || "");
        const transportBlocked =
          raw.includes("Failed to fetch") ||
          raw.includes("NetworkError") ||
          raw.includes("Load failed") ||
          raw.includes("Unauthorized") ||
          raw.includes("No authorization header") ||
          raw.includes("Invalid token");
        if (!transportBlocked || selected === "lovable") throw serverErr;
        // Browser-side fallback: call provider API directly (key never leaves browser).
        const req = buildRequest(
          selected,
          cleanApiKey,
          payload.model || meta.defaultModel || "",
          payload.baseUrl,
          [{ role: "user", content: "Reply with the single word: OK" }],
        );
        const json = await callProvider(req, selected, 30000);
        reply = req.parse(json) || "OK";
      }
      const next: SavedConfig = { provider: selected, apiKey: cleanApiKey, model: payload.model || meta.defaultModel || "", baseUrl: payload.baseUrl || "", status: "ok", lastSyncedAt: new Date().toISOString() };
      setConfigs({ ...configs, [selected]: next });
      setActive(selected);
      setSuccess(`Connected. Test reply: ${reply.slice(0, 60)}`);
      toast.success(`${meta.label} tested and activated.`);
    } catch (e: any) {
      const raw = String(e?.message || e || "Sync failed");
      const msg = raw.includes("No authorization header") || raw.includes("Invalid token") || raw.includes("Unauthorized")
        ? "Login session refresh required. Logout/login once, then sync AI provider again."
        : raw.includes("Failed to fetch")
          ? "Network unreachable. Check your internet / VPN / ad-blocker, or use ‘Save & Activate’ and test from chat."
          : raw;
      setError(msg);
      const prev = configs[selected];
      setConfigs({ ...configs, [selected]: { provider: selected, apiKey: cleanApiKey, model: cleanModel || meta.defaultModel || "", baseUrl: cleanBaseUrl, status: "error", lastError: msg, lastSyncedAt: prev?.lastSyncedAt } });
      toast.error(msg);
    } finally { setSyncing(false); }
  }

  function saveWithoutTest() {
    const cleanApiKey = apiKey.trim();
    const cleanModel = model.trim() || meta.defaultModel || "";
    const cleanBaseUrl = baseUrl.trim();
    if (meta.needsKey && !cleanApiKey) { setError("API key required."); return; }
    if (meta.needsBaseUrl && !cleanBaseUrl) { setError("Base URL required for custom provider."); return; }
    const next: SavedConfig = { provider: selected, apiKey: cleanApiKey, model: cleanModel, baseUrl: cleanBaseUrl, status: "ok", lastSyncedAt: new Date().toISOString() };
    setConfigs({ ...configs, [selected]: next });
    setActive(selected);
    setError(null);
    setSuccess("Saved and ready. You can test it from chat now.");
    toast.success(`${meta.label} saved and activated.`);
  }

  function removeKey() {
    const c = { ...configs }; delete c[selected]; setConfigs(c);
    setApiKey(""); setSuccess(null); setError(null);
    if (active === selected) setActive("lovable");
    toast.success("Removed.");
  }

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2"><Key className="h-4 w-4" /> AI Providers & Training</DialogTitle>
      </DialogHeader>

      <Tabs defaultValue="providers">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="providers">Providers</TabsTrigger>
          <TabsTrigger value="training">Training</TabsTrigger>
          <TabsTrigger value="privacy">Privacy</TabsTrigger>
        </TabsList>

        <TabsContent value="providers" className="space-y-3 pt-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-1 border rounded-lg p-2 space-y-1 max-h-[380px] overflow-y-auto">
              {PROVIDERS.map((p) => {
                const cfg = p.key === "lovable" ? { status: "ok" as const } : configs[p.key];
                return (
                  <button
                    key={p.key}
                    onClick={() => setSelected(p.key)}
                    className={"w-full text-left px-2 py-1.5 rounded text-xs flex items-center gap-2 " +
                      (selected === p.key ? "bg-primary text-primary-foreground" : "hover:bg-muted")}
                  >
                    <span className="flex-1 min-w-0">
                      <span className="block truncate">{p.label}</span>
                      {p.description && <span className="block truncate text-[10px] opacity-75">{p.description}</span>}
                    </span>
                    {cfg?.status === "ok" && <CheckCircle2 className="h-3 w-3 text-emerald-500" />}
                    {cfg?.status === "error" && <XCircle className="h-3 w-3 text-red-500" />}
                    {active === p.key && <Badge className="text-[10px] px-1 gap-0.5 bg-amber-500 hover:bg-amber-500 text-white"><Star className="h-2.5 w-2.5 fill-current" /> default</Badge>}
                  </button>
                );
              })}
            </div>

            <div className="col-span-2 space-y-3">
              {selected === "lovable" ? (
                <div className="text-sm p-4 border rounded-lg bg-muted/40">
                  <p className="font-medium">Built-in AI is ready to use.</p>
                    <p className="text-muted-foreground mt-1">No API key needed. Uses Lovable AI.</p>
                  <Button size="sm" className="mt-3" onClick={() => { setActive("lovable"); toast.success("Built-in AI set as default."); }}>
                    <Star className="h-4 w-4 mr-1 fill-current" /> Set as default
                  </Button>
                </div>
              ) : (
                <>
                  <div>
                    <Label className="text-xs">API Key</Label>
                    <Input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="sk-..." />
                    {meta.keyUrl && (
                      <a href={meta.keyUrl} target="_blank" rel="noreferrer" className="text-[11px] text-primary underline">
                        Get an API key →
                      </a>
                    )}
                  </div>
                  <div>
                    <Label className="text-xs">Model {selected === "openrouter" && <span className="text-muted-foreground">(optional — pick or type)</span>}</Label>
                    {selected === "openrouter" && (
                      <div className="mb-2 space-y-1">
                        <Input
                          value={orFilter}
                          onChange={(e) => setOrFilter(e.target.value)}
                          placeholder={orLoading ? "Loading models…" : `Search ${orModels.length} OpenRouter models…`}
                          className="h-8 text-xs"
                        />
                        <div className="max-h-40 overflow-y-auto border rounded text-xs">
                          {orModels
                            .filter((m) => !orFilter || m.id.toLowerCase().includes(orFilter.toLowerCase()) || (m.name || "").toLowerCase().includes(orFilter.toLowerCase()))
                            .slice(0, 80)
                            .map((m) => (
                              <button
                                key={m.id}
                                type="button"
                                onClick={() => setModel(m.id)}
                                className={"w-full text-left px-2 py-1 hover:bg-muted flex items-center justify-between " + (model === m.id ? "bg-primary/10" : "")}
                              >
                                <span className="font-mono truncate">{m.id}</span>
                                {model === m.id && <Check className="h-3 w-3 text-primary shrink-0" />}
                              </button>
                            ))}
                          {orModels.length === 0 && !orLoading && (
                            <div className="p-2 text-muted-foreground">Model list unavailable. Type model id manually below.</div>
                          )}
                        </div>
                      </div>
                    )}
                    <Input value={model} onChange={(e) => setModel(e.target.value)} placeholder={meta.modelHint} />
                      <p className="text-[11px] text-muted-foreground mt-1">Example: {meta.modelHint}. Leave blank to use the default model.</p>
                  </div>
                  {meta.needsBaseUrl && (
                    <div>
                      <Label className="text-xs">Base URL</Label>
                      <Input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://your-endpoint/v1" />
                    </div>
                  )}

                  {error && (
                    <div className="text-xs p-2 rounded border border-red-300 bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-200 flex items-start gap-2">
                      <XCircle className="h-4 w-4 shrink-0 mt-0.5" /> <span className="break-words">{error}</span>
                    </div>
                  )}
                  {success && (
                    <div className="text-xs p-2 rounded border border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200 flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" /> <span className="break-words">{success}</span>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <Button onClick={sync} disabled={syncing || (meta.needsKey && !apiKey.trim())}>
                      {syncing ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Testing…</> : <><Plus className="h-4 w-4 mr-1" /> Test & Activate</>}
                    </Button>
                    <Button variant="outline" onClick={saveWithoutTest} disabled={meta.needsKey && !apiKey.trim()}>
                      Save & Activate
                    </Button>
                    {configs[selected]?.status === "ok" && (
                      active === selected ? (
                        <Button variant="secondary" disabled className="gap-1">
                          <Star className="h-4 w-4 fill-current" /> Default for chat
                        </Button>
                      ) : (
                        <Button
                          className="bg-amber-500 hover:bg-amber-600 text-white"
                          onClick={() => { setActive(selected); toast.success(`${meta.label} set as default for chat.`); }}
                        >
                          <Star className="h-4 w-4 mr-1 fill-current" /> Set as default
                        </Button>
                      )
                    )}
                    {configs[selected] && (
                      <Button variant="outline" onClick={removeKey}><Trash2 className="h-4 w-4 mr-1" /> Remove</Button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="training" className="space-y-3 pt-3">
          <TrainingPanel
            training={training}
            setTraining={setTraining}
            trainingActive={trainingActive}
            setTrainingActive={setTrainingActive}
          />
        </TabsContent>


        <TabsContent value="privacy" className="space-y-2 pt-3 text-sm">
          <div className="flex items-start gap-2">
            <Shield className="h-5 w-5 text-primary mt-0.5" />
            <div className="space-y-2 text-xs text-muted-foreground">
              <p><strong className="text-foreground">Your data stays yours.</strong> API keys are stored only in this browser (localStorage) — never uploaded, never shared.</p>
              <p>When you chat or test, your selected key is sent only for that provider request and is not stored on the server.</p>
              <p>Training instructions live in your browser and are attached to each request as a system prompt so the AI cannot ignore your rules.</p>
              <p>To fully wipe: open Settings → Providers → Remove for each provider.</p>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <DialogFooter>
        <Button variant="outline" onClick={() => (document.activeElement as HTMLElement)?.blur()}>Close</Button>
      </DialogFooter>
    </DialogContent>
  );
}

function TrainingPanel({ training, setTraining, trainingActive, setTrainingActive }: { training: string; setTraining: (t: string) => void; trainingActive: boolean; setTrainingActive: (v: boolean) => void }) {
  const [draft, setDraft] = useState(training);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  useEffect(() => { setDraft(training); }, [training]);
  const dirty = draft !== training;

  function save() {
    setTraining(draft);
    setTrainingActive(true);
    setSavedAt(new Date().toLocaleTimeString());
    toast.success("Training saved & activated — AI will auto-read it on every chat.");
  }
  function reset() { setDraft(training); }
  function clearAll() {
    setDraft("");
    setTraining("");
    setSavedAt(new Date().toLocaleTimeString());
    toast.success("Training cleared.");
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2 text-sm">
        <GraduationCap className="h-5 w-5 text-primary mt-0.5" />
        <div className="flex-1">
          <p className="font-medium">Train your AI</p>
          <p className="text-xs text-muted-foreground">
            Give custom instructions, tone, company knowledge, and rules. When activated, the AI auto-reads this on every chat.
          </p>
        </div>
        {dirty && <Badge variant="secondary" className="text-[10px]">unsaved</Badge>}
      </div>

      <label className="flex items-center gap-3 rounded-lg border p-3 bg-muted/30 cursor-pointer">
        <Switch checked={trainingActive} onCheckedChange={setTrainingActive} />
        <div className="flex-1">
          <p className="text-sm font-medium">Activate training for chat</p>
          <p className="text-[11px] text-muted-foreground">
            {trainingActive
              ? "On — every chat will auto-load your saved training as a system prompt."
              : "Off — your saved training is ignored until you turn this on."}
          </p>
        </div>
        {trainingActive
          ? <Badge className="bg-emerald-600 hover:bg-emerald-600 gap-1"><Zap className="h-3 w-3" /> Active</Badge>
          : <Badge variant="secondary">Inactive</Badge>}
      </label>

      <Textarea
        rows={10}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={`Example:\n• You are Devionic's internal assistant.\n• Never share data outside this chat.\n• Always answer in short, professional English or Urdu when asked.\n• When asked about HR policy, use Pakistan labour law.\n• Refuse anything unrelated to Devionic operations.`}
      />
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={save} disabled={!dirty}>
          <CheckCircle2 className="h-4 w-4 mr-1" /> Save Training
        </Button>
        <Button size="sm" variant="outline" onClick={reset} disabled={!dirty}>Reset</Button>
        <Button size="sm" variant="ghost" onClick={clearAll} disabled={!training && !draft}>
          <Trash2 className="h-4 w-4 mr-1" /> Clear
        </Button>
        <span className="text-[11px] text-muted-foreground ml-auto">
          {savedAt ? `Saved at ${savedAt}` : "Saved locally in your browser."}
        </span>
      </div>
    </div>
  );
}

