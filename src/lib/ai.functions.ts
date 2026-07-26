import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/lib/auth-middleware";
import { z } from "zod";
import { buildRequest, callProvider, getProviderDefaultModel } from "./ai-provider";
import { testProviderConnection } from "./ai-provider-test";

const contentPartSchema = z.union([
  z.object({ type: z.literal("text"), text: z.string() }),
  z.object({ type: z.literal("image_url"), image_url: z.object({ url: z.string() }) }),
  z.object({ type: z.literal("file"), file: z.object({ filename: z.string(), file_data: z.string() }) }),
  z.object({ type: z.literal("input_audio"), input_audio: z.object({ data: z.string(), format: z.string() }) }),
]);

const chatSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(["system", "user", "assistant"]),
    content: z.union([z.string(), z.array(contentPartSchema)]),
  })),
  provider: z.string().optional(),
  apiKey: z.string().optional(),
  model: z.string().optional(),
  baseUrl: z.string().optional(),
  systemPrompt: z.string().optional(),
  agentMode: z.boolean().optional(),
});

const DEFAULT_SYSTEM =
  "You are Devionic DMS AI Assistant — a concise, helpful business co-pilot for Devionic (Private) Limited. Help with HR, projects, tasks, finance, and operations questions. " +
  "LANGUAGE: Default to English or Urdu/Roman Urdu only — match whichever of these two the user writes in (including a Roman Urdu + English mix). Do NOT reply in Arabic, Hindi, Chinese, Spanish, French, German, or any other language unless the user themselves writes to you in that language during the conversation; only then mirror it for that discussion. If unsure, use English. " +
  "Never store, share, or leak user data outside this conversation.";

// ---- Whitelisted tables the agent may touch (RLS still applies as the caller) ----
const ALLOWED_TABLES = [
  "employees", "tasks", "projects", "clients", "deals",
  "invoices", "quotations", "attendance", "payroll",
  "cases", "tickets", "support_tickets", "assets", "inventory",
  "feedback_calls", "notices", "documents", "expenses",
  "transactions", "accounts", "letters", "credentials",
  "interns", "catalog", "products", "services", "payments",
  "user_login_logs", "user_activity_logs", "system_logs", "otp_logs", "email_logs",
] as const;


const AGENT_SYSTEM = `${DEFAULT_SYSTEM}

You are running in AGENT MODE with real database tools. When the user asks you to do something (fill data, update status, create records, look up info), use the provided tools instead of guessing.

Rules:
- Always call list_tables first if you're unsure what tables exist.
- Use query_records to look up existing rows before updating or deleting.
- Use short, exact table names from the whitelist.
- After a mutation, briefly confirm what changed in plain English.
- Never invent IDs — always look them up.
- Ask for confirmation ONLY for delete_records with more than 5 matched rows.
- Filter values must match column types (uuid, text, numeric, boolean, date).
Allowed tables: ${ALLOWED_TABLES.join(", ")}.`;

const AGENT_TOOLS = [
  {
    type: "function",
    function: {
      name: "list_tables",
      description: "List the whitelisted tables the agent can operate on.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "query_records",
      description: "Read rows from a whitelisted table. Filters use equality by default; pass an array to filter with IN.",
      parameters: {
        type: "object",
        properties: {
          table: { type: "string", description: "Table name." },
          filters: { type: "object", description: "Column -> value (or array of values for IN)." },
          columns: { type: "string", description: "Comma-separated columns, default *." },
          limit: { type: "number", description: "Row limit, default 20, max 100." },
          order_by: { type: "string" },
          ascending: { type: "boolean" },
        },
        required: ["table"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "insert_record",
      description: "Insert a single row into a whitelisted table.",
      parameters: {
        type: "object",
        properties: {
          table: { type: "string" },
          values: { type: "object", description: "Column -> value." },
        },
        required: ["table", "values"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_records",
      description: "Update rows matching filters in a whitelisted table.",
      parameters: {
        type: "object",
        properties: {
          table: { type: "string" },
          filters: { type: "object", description: "Column -> value (or array for IN). Required." },
          values: { type: "object", description: "New column values." },
        },
        required: ["table", "filters", "values"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_records",
      description: "Delete rows matching filters in a whitelisted table.",
      parameters: {
        type: "object",
        properties: {
          table: { type: "string" },
          filters: { type: "object" },
        },
        required: ["table", "filters"],
      },
    },
  },
];

function applyFilters(q: any, filters: Record<string, unknown> | undefined) {
  if (!filters) return q;
  for (const [k, v] of Object.entries(filters)) {
    if (Array.isArray(v)) q = q.in(k, v);
    else if (v === null) q = q.is(k, null);
    else q = q.eq(k, v as any);
  }
  return q;
}

async function runTool(
  name: string,
  args: any,
  supabase: any,
): Promise<{ ok: boolean; result?: unknown; error?: string; reversal?: any }> {
  try {
    if (name === "list_tables") return { ok: true, result: ALLOWED_TABLES };

    const table = String(args?.table || "");
    if (!ALLOWED_TABLES.includes(table as any)) {
      return { ok: false, error: `Table "${table}" is not allowed. Use list_tables.` };
    }

    if (name === "query_records") {
      const limit = Math.min(Math.max(Number(args?.limit ?? 20), 1), 100);
      let q = db.from(table).select(args?.columns || "*").limit(limit);
      q = applyFilters(q, args?.filters);
      if (args?.order_by) q = q.order(args.order_by, { ascending: args?.ascending !== false });
      const { data, error } = await q;
      if (error) return { ok: false, error: error.message };
      return { ok: true, result: { count: data?.length ?? 0, rows: data } };
    }

    if (name === "insert_record") {
      const { data, error } = await db.from(table).insert(args.values).select();
      if (error) return { ok: false, error: error.message };
      const ids = (data || []).map((r: any) => r?.id).filter(Boolean);
      return {
        ok: true,
        result: { inserted: data },
        reversal: ids.length ? { kind: "delete", table, ids } : undefined,
      };
    }

    if (name === "update_records") {
      if (!args?.filters || Object.keys(args.filters).length === 0)
        return { ok: false, error: "Filters required for update." };
      // capture before state
      let pre = db.from(table).select("*");
      pre = applyFilters(pre, args.filters);
      const { data: beforeRows } = await pre;
      let q = db.from(table).update(args.values);
      q = applyFilters(q, args.filters);
      const { data, error } = await q.select();
      if (error) return { ok: false, error: error.message };
      const restorable = (beforeRows || []).filter((r: any) => r?.id);
      return {
        ok: true,
        result: { updated_count: data?.length ?? 0, rows: data },
        reversal: restorable.length ? { kind: "restore", table, rows: restorable } : undefined,
      };
    }

    if (name === "delete_records") {
      if (!args?.filters || Object.keys(args.filters).length === 0)
        return { ok: false, error: "Filters required for delete." };
      let q = db.from(table).delete();
      q = applyFilters(q, args.filters);
      const { data, error } = await q.select();
      if (error) return { ok: false, error: error.message };
      const rows = (data || []).filter((r: any) => r?.id);
      return {
        ok: true,
        result: { deleted_count: data?.length ?? 0, rows: data },
        reversal: rows.length ? { kind: "reinsert", table, rows } : undefined,
      };
    }

    return { ok: false, error: `Unknown tool: ${name}` };
  } catch (e: any) {
    return { ok: false, error: e?.message || String(e) };
  }
}

const AGENT_CAPABLE = new Set(["lovable", "openai", "openrouter", "deepseek", "groq", "mistral", "together", "custom"]);

export const chatWithAI = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data: unknown) => chatSchema.parse(data))
  .handler(async ({ data, context }) => {
    const provider = (data.provider || "lovable").toLowerCase();
    const useAgent = !!data.agentMode && AGENT_CAPABLE.has(provider);
    const systemPrompt = (useAgent ? AGENT_SYSTEM : (data.systemPrompt?.trim() || DEFAULT_SYSTEM));
    const trainingExtra = useAgent && data.systemPrompt?.trim() ? `\n\nUSER TRAINING:\n${data.systemPrompt.trim()}` : "";

    let apiKey = data.apiKey;
    let model = data.model;
    const baseUrl = data.baseUrl;
    if (provider === "lovable") {
      apiKey = process.env.LOVABLE_API_KEY;
      if (!apiKey) throw new Error("Built-in AI is not configured.");
      model = model || getProviderDefaultModel(provider);
    } else {
      if (!apiKey) throw new Error("API key required for this provider.");
      model = model || getProviderDefaultModel(provider);
      if (!model) throw new Error("Model required for this provider.");
    }

    // Non-agent OR non-openai-compatible: single round trip
    if (!useAgent) {
      const msgs = [{ role: "system", content: systemPrompt }, ...data.messages];
      const req = buildRequest(provider, apiKey!, model!, baseUrl, msgs);
      const json = await callProvider(req, provider);
      return { reply: req.parse(json) || "(no response)", actions: [] as any[] };
    }

    // Agent loop (OpenAI-compatible tool calling)
    const msgs: any[] = [
      { role: "system", content: systemPrompt + trainingExtra },
      ...data.messages,
    ];
    const actions: { name: string; args: any; ok: boolean; error?: string; summary?: string; reversal?: any }[] = [];
    const supabase = (context as any).supabase;

    for (let step = 0; step < 6; step++) {
      const req = buildRequest(provider, apiKey!, model!, baseUrl, msgs, AGENT_TOOLS);
      const json = await callProvider(req, provider);
      const choice = json?.choices?.[0]?.message;
      if (!choice) break;
      const toolCalls = choice.tool_calls;
      if (!toolCalls || !toolCalls.length) {
        return { reply: choice.content || "(no response)", actions };
      }
      // Append assistant message with tool_calls
      msgs.push({ role: "assistant", content: choice.content || "", tool_calls: toolCalls });
      for (const tc of toolCalls) {
        const name = tc.function?.name;
        let args: any = {};
        try { args = JSON.parse(tc.function?.arguments || "{}"); } catch { args = {}; }
        const out = await runTool(name, args, supabase);
        actions.push({
          name,
          args,
          ok: out.ok,
          error: out.error,
          summary: summarize(name, args, out),
          reversal: out.reversal,
        });
        msgs.push({
          role: "tool",
          tool_call_id: tc.id,
          content: JSON.stringify(out).slice(0, 8000),
        });
      }
    }
    return { reply: "Reached max reasoning steps. Please refine your request.", actions };
  });

function summarize(name: string, args: any, out: { ok: boolean; result?: any; error?: string }): string {
  if (!out.ok) return `❌ ${name}: ${out.error}`;
  if (name === "list_tables") return `📋 Listed ${(out.result as any[]).length} tables`;
  if (name === "query_records") return `🔎 ${args.table}: ${(out.result as any)?.count ?? 0} rows`;
  if (name === "insert_record") return `➕ Inserted into ${args.table}`;
  if (name === "update_records") return `✏️ Updated ${(out.result as any)?.updated_count ?? 0} row(s) in ${args.table}`;
  if (name === "delete_records") return `🗑️ Deleted ${(out.result as any)?.deleted_count ?? 0} row(s) from ${args.table}`;
  return `✔ ${name}`;
}

const testSchema = z.object({
  provider: z.string(),
  apiKey: z.string().optional(),
  model: z.string().optional(),
  baseUrl: z.string().optional(),
});

export const testAIProvider = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data: unknown) => testSchema.parse(data))
  .handler(async ({ data }) => {
    try {
      return await testProviderConnection(data);
    } catch (e: any) {
      throw new Error(String(e?.message || e || "Provider test failed"));
    }

  });

// ---- Voice transcription (Lovable AI STT) ----
const transcribeSchema = z.object({
  audioBase64: z.string(),
  mimeType: z.string().default("audio/webm"),
});

export const transcribeAudio = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data: unknown) => transcribeSchema.parse(data))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Voice transcription unavailable (LOVABLE_API_KEY missing).");
    const bin = Uint8Array.from(atob(data.audioBase64), (c) => c.charCodeAt(0));
    const ext = data.mimeType.includes("mp4") ? "mp4" : data.mimeType.includes("wav") ? "wav" : data.mimeType.includes("mp3") || data.mimeType.includes("mpeg") ? "mp3" : "webm";
    const form = new FormData();
    form.append("model", "openai/gpt-4o-mini-transcribe");
    form.append("file", new Blob([bin], { type: data.mimeType }), `voice.${ext}`);
    const res = await fetch("https://ai.gateway.lovable.dev/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body: form,
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Transcription failed (${res.status}): ${t.slice(0, 200)}`);
    }
    const json = await res.json();
    return { text: (json?.text as string) || "" };
  });

// ---- Plan Actions (dry-run planner for approval flow) ----
const planSchema = z.object({
  userRequest: z.string(),
  provider: z.string().optional(),
  apiKey: z.string().optional(),
  model: z.string().optional(),
  baseUrl: z.string().optional(),
  systemPrompt: z.string().optional(),
  revisionNotes: z.string().optional(),
  previousPlan: z.any().optional(),
  historyContext: z.string().optional(),
});

const PLANNER_SYSTEM = `${DEFAULT_SYSTEM}

You are the PLANNER. Do NOT execute anything. Your only job is to convert the user's request into a short, concrete execution plan the user will review and approve.

Return ONLY valid JSON matching this exact shape (no prose, no markdown, no code fences):
{
  "title": "short plan title",
  "summary": "1-2 sentence plain-language summary",
  "steps": [
    { "module": "employees | tasks | projects | clients | deals | invoices | quotations | attendance | payroll | cases | tickets | support_tickets | assets | inventory | feedback_calls | notices | documents | expenses | transactions | accounts | letters | credentials",
      "action": "add | edit | remove | generate | lookup",
      "description": "one clear sentence — what will change and for whom",
      "details": { "any": "extra key data like fields, filters, values" }
    }
  ],
  "risks": ["optional short warnings for the user"],
  "needs_confirmation": true
}

Rules:
- Keep steps small and specific. Prefer 1-6 steps.
- If the request is only a question/lookup, use action "lookup" — do not invent writes.
- Never fabricate IDs or values — use placeholders like "<looked up>" inside details.
- Use the SAME language the user wrote in for title/summary/description.
- Output MUST be a single JSON object. No commentary.`;

export const planActions = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data: unknown) => planSchema.parse(data))
  .handler(async ({ data }) => {
    const provider = (data.provider || "lovable").toLowerCase();
    let apiKey = data.apiKey;
    let model = data.model;
    if (provider === "lovable") {
      apiKey = process.env.LOVABLE_API_KEY;
      if (!apiKey) throw new Error("Built-in AI is not configured.");
      model = model || getProviderDefaultModel(provider);
    } else {
      if (!apiKey) throw new Error("API key required.");
      model = model || getProviderDefaultModel(provider);
      if (!model) throw new Error("Model required.");
    }

    const sys = PLANNER_SYSTEM + (data.systemPrompt?.trim() ? `\n\nUSER TRAINING:\n${data.systemPrompt.trim()}` : "");
    const userParts: string[] = [];
    if (data.historyContext?.trim()) userParts.push(`CONVERSATION CONTEXT:\n${data.historyContext.trim()}`);
    userParts.push(`USER REQUEST:\n${data.userRequest}`);
    if (data.previousPlan) userParts.push(`PREVIOUS PLAN (needs revision):\n${JSON.stringify(data.previousPlan)}`);
    if (data.revisionNotes?.trim()) userParts.push(`USER REVISION NOTES (apply these):\n${data.revisionNotes.trim()}`);

    const req = buildRequest(provider, apiKey!, model!, data.baseUrl, [
      { role: "system", content: sys },
      { role: "user", content: userParts.join("\n\n") },
    ]);
    // Encourage JSON on OpenAI-compatible providers
    if (req.body && typeof req.body === "object" && "messages" in req.body) {
      (req.body as any).response_format = { type: "json_object" };
    }
    const json = await callProvider(req, provider);
    const raw = req.parse(json) || "";
    let plan: any;
    try {
      plan = JSON.parse(raw);
    } catch {
      const m = raw.match(/\{[\s\S]*\}/);
      if (!m) throw new Error("Planner did not return valid JSON.");
      plan = JSON.parse(m[0]);
    }
    if (!plan || !Array.isArray(plan.steps)) throw new Error("Plan has no steps.");
    return { plan };
  });

// ---- Workspace Scan & Suggestions ----
const suggestSchema = z.object({
  focus: z.string().optional(),
  provider: z.string().optional(),
  apiKey: z.string().optional(),
  model: z.string().optional(),
  baseUrl: z.string().optional(),
  systemPrompt: z.string().optional(),
});

const SCAN_TABLES: { table: string; date?: string; status?: string }[] = [
  { table: "employees", date: "created_at", status: "status" },
  { table: "tasks", date: "created_at", status: "status" },
  { table: "projects", date: "created_at", status: "status" },
  { table: "clients", date: "created_at", status: "status" },
  { table: "deals", date: "created_at", status: "stage" },
  { table: "invoices", date: "created_at", status: "status" },
  { table: "quotations", date: "created_at", status: "status" },
  { table: "attendance", date: "date", status: "status" },
  { table: "payroll", date: "created_at", status: "status" },
  { table: "cases", date: "created_at", status: "status" },
  { table: "support_tickets", date: "created_at", status: "status" },
  { table: "assets", date: "created_at", status: "status" },
  { table: "feedback_calls", date: "created_at" },
  { table: "notices", date: "created_at" },
  { table: "documents", date: "created_at" },
  { table: "expenses", date: "created_at" },
  { table: "transactions", date: "created_at" },
  { table: "interns", date: "created_at", status: "status" },
  { table: "catalog", date: "created_at", status: "status" },
  { table: "payments", date: "created_at" },
];

async function scanWorkspace(supabase: any) {
  const summary: any[] = [];
  for (const t of SCAN_TABLES) {
    try {
      const { count } = await db.from(t.table).select("*", { count: "exact", head: true });
      const row: any = { table: t.table, total: count ?? 0 };
      if (t.status) {
        const { data } = await db.from(t.table).select(t.status).limit(500);
        if (Array.isArray(data)) {
          const buckets: Record<string, number> = {};
          for (const r of data) {
            const v = String((r as any)[t.status!] ?? "unknown");
            buckets[v] = (buckets[v] || 0) + 1;
          }
          row.by_status = buckets;
        }
      }
      if (t.date) {
        const since = new Date(Date.now() - 7 * 864e5).toISOString();
        const { count: recent } = await supabase
          .from(t.table)
          .select("*", { count: "exact", head: true })
          .gte(t.date, since);
        row.last_7_days = recent ?? 0;
      }
      summary.push(row);
    } catch (e: any) {
      summary.push({ table: t.table, error: e?.message || String(e) });
    }
  }
  return summary;
}

const SUGGEST_SYSTEM = `${DEFAULT_SYSTEM}

You are the WORKSPACE ADVISOR for Devionic DMS. You will receive a JSON snapshot of the user's business data (counts, statuses, recent 7-day activity across HR, Projects, CRM, Finance, Support, Cases, Assets, etc.).

Analyse the snapshot and produce PRACTICAL, PRIORITISED suggestions a manager can act on. Cover:
1. 🚨 Risks & red flags (overdue tasks, unpaid invoices, stalled projects, dropping activity, empty critical modules)
2. ⚡ Quick wins (things they can do this week)
3. 🧹 Data hygiene (missing statuses, stale records, thin data)
4. 📈 Growth ideas based on what's active

Format as clean markdown with clear sections, headings, and bullet points. Be specific — quote the actual numbers from the snapshot. Reply in the same language as the user's focus (default English; use Roman Urdu if the focus is in Roman Urdu).`;

export const scanAndSuggest = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data: unknown) => suggestSchema.parse(data))
  .handler(async ({ data, context }) => {
    const supabase = (context as any).supabase;
    const snapshot = await scanWorkspace(supabase);

    const provider = (data.provider || "lovable").toLowerCase();
    let apiKey = data.apiKey;
    let model = data.model;
    if (provider === "lovable") {
      apiKey = process.env.LOVABLE_API_KEY;
      if (!apiKey) throw new Error("Built-in AI is not configured.");
      model = model || getProviderDefaultModel(provider);
    } else {
      if (!apiKey) throw new Error("API key required.");
      model = model || getProviderDefaultModel(provider);
      if (!model) throw new Error("Model required.");
    }

    const sys = SUGGEST_SYSTEM + (data.systemPrompt?.trim() ? `\n\nUSER TRAINING:\n${data.systemPrompt.trim()}` : "");
    const userMsg = `WORKSPACE SNAPSHOT (JSON):\n${JSON.stringify(snapshot)}\n\nFOCUS: ${data.focus?.trim() || "Give me an overall health-check with prioritised, actionable suggestions across all modules."}`;

    const req = buildRequest(provider, apiKey!, model!, data.baseUrl, [
      { role: "system", content: sys },
      { role: "user", content: userMsg },
    ]);
    const json = await callProvider(req, provider);
    const suggestions = req.parse(json) || "(no suggestions generated)";
    return { suggestions, snapshot };
  });

// ---- Undo previously executed agent actions ----
const undoSchema = z.object({
  reversals: z.array(z.object({
    kind: z.enum(["delete", "restore", "reinsert"]),
    table: z.string(),
    ids: z.array(z.any()).optional(),
    rows: z.array(z.record(z.any())).optional(),
  })),
});

export const undoActions = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data: unknown) => undoSchema.parse(data))
  .handler(async ({ data, context }) => {
    const supabase = (context as any).supabase;
    const results: { table: string; kind: string; ok: boolean; error?: string; affected?: number }[] = [];
    // reverse order so newest changes undo first
    for (const r of [...data.reversals].reverse()) {
      if (!ALLOWED_TABLES.includes(r.table as any)) {
        results.push({ table: r.table, kind: r.kind, ok: false, error: "Table not allowed" });
        continue;
      }
      try {
        if (r.kind === "delete" && r.ids?.length) {
          const { data: d, error } = await db.from(r.table).delete().in("id", r.ids).select();
          if (error) results.push({ table: r.table, kind: r.kind, ok: false, error: error.message });
          else results.push({ table: r.table, kind: r.kind, ok: true, affected: d?.length ?? 0 });
        } else if (r.kind === "restore" && r.rows?.length) {
          let affected = 0;
          let err: string | undefined;
          for (const row of r.rows) {
            if (!row?.id) continue;
            const { id, ...rest } = row as any;
            const { error } = await db.from(r.table).update(rest).eq("id", id);
            if (error) { err = error.message; break; }
            affected++;
          }
          results.push({ table: r.table, kind: r.kind, ok: !err, error: err, affected });
        } else if (r.kind === "reinsert" && r.rows?.length) {
          const { data: d, error } = await db.from(r.table).insert(r.rows).select();
          if (error) results.push({ table: r.table, kind: r.kind, ok: false, error: error.message });
          else results.push({ table: r.table, kind: r.kind, ok: true, affected: d?.length ?? 0 });
        }
      } catch (e: any) {
        results.push({ table: r.table, kind: r.kind, ok: false, error: e?.message || String(e) });
      }
    }
    return { results };
  });

