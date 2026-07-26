import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/lib/auth-middleware";
import { z } from "zod";
import { buildRequest, callProvider, getProviderDefaultModel } from "./ai-provider";

const auditSchema = z.object({
  auditId: z.string(),
  auditTitle: z.string(),
  auditDescription: z.string().optional(),
  focus: z.array(z.string()).default([]),
  scope: z.string().optional(),
  period: z.string().optional(),
  data: z.record(z.string(), z.any()).default({}),
  // Provider config — same shape as the AI Assistant module
  provider: z.string().optional(),
  apiKey: z.string().optional(),
  model: z.string().optional(),
  baseUrl: z.string().optional(),
});

const AUDIT_SYSTEM = `You are Devionic DMS Internal Auditor — a senior audit & compliance analyst for Devionic (Private) Limited, a Pakistani technology company.
You produce sharp, evidence-based internal audit reports written in clear professional English.

You will receive:
- The audit type & focus areas
- A JSON snapshot of the relevant business data (may contain arrays, counts, empty datasets)

Return STRICT JSON ONLY (no markdown fences, no commentary) matching:
{
  "executiveSummary": string,
  "score": number,
  "rating": "Excellent" | "Good" | "Needs Improvement" | "Poor" | "Critical",
  "kpis": [ { "label": string, "value": string, "note": string } ],
  "sections": [
    {
      "heading": string,
      "body": string,
      "findings": [ { "severity": "info"|"low"|"medium"|"high"|"critical", "text": string } ]
    }
  ],
  "recommendations": [ { "priority": "P1"|"P2"|"P3", "action": string, "owner": string } ],
  "risks": [ { "area": string, "impact": "Low"|"Medium"|"High", "likelihood": "Low"|"Medium"|"High" } ],
  "conclusion": string
}

Rules:
- Be specific: cite counts, percentages, names, or IDs from the provided data when possible.
- If a dataset is empty or missing, say so honestly.
- Never fabricate figures that aren't in the data.
- Use Pakistani business context (PKR, FBR, EOBI, PESSI, SECP) where relevant.
- Never mention that you are an AI, no disclaimers, no emojis.
- Output ONLY the JSON object.`;

type AuditReport = {
  executiveSummary: string;
  score: number;
  rating: string;
  kpis: { label: string; value: string; note?: string }[];
  sections: {
    heading: string;
    body: string;
    findings: { severity: "info" | "low" | "medium" | "high" | "critical"; text: string }[];
  }[];
  recommendations: { priority: "P1" | "P2" | "P3"; action: string; owner?: string }[];
  risks: { area: string; impact: "Low" | "Medium" | "High"; likelihood: "Low" | "Medium" | "High" }[];
  conclusion: string;
};

function stripFences(text: string): string {
  return text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
}
function extractJson(text: string): any {
  const t = stripFences(text);
  try { return JSON.parse(t); } catch { /* noop */ }
  const first = t.indexOf("{");
  const last = t.lastIndexOf("}");
  if (first !== -1 && last > first) {
    try { return JSON.parse(t.slice(first, last + 1)); } catch { /* noop */ }
  }
  throw new Error("AI returned non-JSON response.");
}

export const runAuditReport = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data: unknown) => auditSchema.parse(data))
  .handler(async ({ data }): Promise<AuditReport> => {
    // Compact snapshot to control context size — keep it small so the model responds fast
    const snapshot: Record<string, any> = {};
    for (const [k, v] of Object.entries(data.data || {})) {
      if (Array.isArray(v)) snapshot[k] = { count: v.length, sample: v.slice(0, 8) };
      else snapshot[k] = v;
    }


    const userMsg = [
      `AUDIT TYPE: ${data.auditTitle} (${data.auditId})`,
      data.auditDescription ? `DESCRIPTION: ${data.auditDescription}` : "",
      data.focus.length ? `FOCUS AREAS:\n- ${data.focus.join("\n- ")}` : "",
      data.scope ? `SCOPE: ${data.scope}` : "",
      data.period ? `PERIOD: ${data.period}` : "",
      "",
      "DATA SNAPSHOT (JSON):",
      "```json",
      JSON.stringify(snapshot, null, 2).slice(0, 9000),
      "```",
      "",
      "Produce the audit report as strict JSON per the schema. No markdown, no commentary.",
    ].filter(Boolean).join("\n");

    const messages = [
      { role: "system", content: AUDIT_SYSTEM },
      { role: "user", content: userMsg },
    ];

    const provider = (data.provider || "lovable").toLowerCase();
    let apiKey = data.apiKey || "";
    let model = data.model || "";
    let baseUrl = data.baseUrl;

    if (provider === "lovable") {
      const key = process.env.LOVABLE_API_KEY;
      if (!key) throw new Error("Built-in AI is not configured on this workspace.");
      apiKey = key;
      model = model || "google/gemini-3.1-flash-lite";
    } else {
      if (!apiKey) throw new Error(`API key required for ${provider}. Configure it in AI Assistant → Providers.`);
      model = model || getProviderDefaultModel(provider);
      if (!model) throw new Error(`Model required for ${provider}. Set it in AI Assistant → Providers.`);
    }

    const req = buildRequest(provider, apiKey, model, baseUrl, messages);
    // Nudge OpenAI-compatible providers toward JSON output
    if (!["gemini", "google", "anthropic", "claude"].includes(provider)) {
      (req.body as any).response_format = { type: "json_object" };
      (req.body as any).temperature = 0.3;
    }

    let json: any;
    let lastErr: any;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        json = await callProvider(req, provider, 42000);
        lastErr = null;
        break;
      } catch (e: any) {
        lastErr = e;
        const msg = String(e?.message || e);
        if (msg.includes("429")) throw new Error("AI rate limit hit — please retry in a moment.");
        if (msg.includes("402")) throw new Error("AI credits exhausted — please add credits to continue.");
        if (msg.includes("400") || msg.includes("401") || msg.includes("403")) throw e;
        // transient — wait and retry once
        await new Promise((r) => setTimeout(r, 1500));
      }
    }
    if (lastErr) throw lastErr;


    const raw = req.parse(json) || "";
    const parsed = extractJson(String(raw));
    return {
      executiveSummary: String(parsed.executiveSummary || ""),
      score: Number.isFinite(parsed.score) ? Math.max(0, Math.min(100, Number(parsed.score))) : 0,
      rating: String(parsed.rating || "Needs Improvement"),
      kpis: Array.isArray(parsed.kpis) ? parsed.kpis : [],
      sections: Array.isArray(parsed.sections) ? parsed.sections : [],
      recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
      risks: Array.isArray(parsed.risks) ? parsed.risks : [],
      conclusion: String(parsed.conclusion || ""),
    };
  });
