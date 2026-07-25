type ProviderCall = {
  url: string;
  headers: Record<string, string>;
  body: any;
  parse: (json: any) => string;
};

function cleanSecret(value: string): string {
  return String(value || "")
    .trim()
    .replace(/^Bearer\s+/i, "")
    .replace(/[\u200B-\u200F\u202A-\u202E\u2060\uFEFF]/g, "");
}

function providerHelp(provider: string, status: number, text: string, req: ProviderCall): string {
  const p = provider.toLowerCase();
  if (p === "openrouter") {
    const token = cleanSecret((req.headers.Authorization || "").replace(/^Bearer\s+/i, ""));
    const message = (() => {
      try { return JSON.parse(text)?.error?.message || text; } catch { return text; }
    })();
    if (!token.startsWith("sk-or-")) {
      return "OpenRouter API key invalid hai. API Key field me OpenRouter key paste karein (sk-or-v1-...), model id nahi. Model field me example: openai/gpt-4o-mini.";
    }
    if (status === 401) {
      return `OpenRouter ne key reject kar di: ${String(message).slice(0, 220)}. OpenRouter dashboard se fresh sk-or-v1 key copy karke dobara sync karein.`;
    }
  }
  return `${provider} error (${status}): ${text.slice(0, 300)}`;
}

const LOVABLE_MODEL_ALIASES: Record<string, string> = {
  "google/gemini-2.5-flash-lite": "google/gemini-3.1-flash-lite",
  "google/gemini-2.5-flash": "google/gemini-3.5-flash",
};

const PROVIDER_DEFAULT_MODELS: Record<string, string> = {
  lovable: "google/gemini-3.1-flash-lite",
  openai: "gpt-4o-mini",
  openrouter: "openai/gpt-4o-mini",
  gemini: "gemini-1.5-flash",
  google: "gemini-1.5-flash",
  anthropic: "claude-3-5-sonnet-20241022",
  claude: "claude-3-5-sonnet-20241022",
  deepseek: "deepseek-chat",
  groq: "llama-3.3-70b-versatile",
  mistral: "mistral-large-latest",
  perplexity: "llama-3.1-sonar-small-128k-online",
  together: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
};

export function getProviderDefaultModel(provider: string): string {
  return PROVIDER_DEFAULT_MODELS[provider.toLowerCase()] || "";
}

function toPlainText(content: any): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.filter((p) => p.type === "text").map((p) => p.text).join("\n");
  return "";
}

export function buildRequest(
  provider: string,
  apiKey: string,
  model: string,
  baseUrl: string | undefined,
  messages: any[],
  tools?: any[],
): ProviderCall {
  const p = provider.toLowerCase();
  const cleanApiKey = cleanSecret(apiKey);
  const cleanModel = String(model || "").trim();
  const cleanBaseUrl = baseUrl?.trim();
  const fallbackModel = getProviderDefaultModel(p);
  const normalizedModel = p === "lovable"
    ? (LOVABLE_MODEL_ALIASES[cleanModel] || cleanModel || fallbackModel)
    : (cleanModel || fallbackModel);
  if (p === "gemini" || p === "google") {
    const url =
      (cleanBaseUrl?.replace(/\/$/, "") ||
        "https://generativelanguage.googleapis.com/v1beta") +
      `/models/${normalizedModel}:generateContent?key=${encodeURIComponent(cleanApiKey)}`;
    const sys = messages.filter((m) => m.role === "system").map((m) => toPlainText(m.content)).join("\n");
    const contents = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: toPlainText(m.content) }] }));
    return {
      url,
      headers: { "Content-Type": "application/json" },
      body: { systemInstruction: sys ? { parts: [{ text: sys }] } : undefined, contents },
      parse: (j) => j?.candidates?.[0]?.content?.parts?.map((part: any) => part.text).join("") ?? "",
    };
  }

  if (p === "anthropic" || p === "claude") {
    const url = (cleanBaseUrl?.replace(/\/$/, "") || "https://api.anthropic.com/v1") + "/messages";
    const sys = messages.filter((m) => m.role === "system").map((m) => toPlainText(m.content)).join("\n");
    return {
      url,
      headers: {
        "x-api-key": cleanApiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: {
        model: normalizedModel,
        max_tokens: 1024,
        system: sys || undefined,
        messages: messages.filter((m) => m.role !== "system").map((m) => ({ role: m.role, content: toPlainText(m.content) })),
      },
      parse: (j) => j?.content?.[0]?.text ?? "",
    };
  }

  const defaults: Record<string, string> = {
    openai: "https://api.openai.com/v1",
    openrouter: "https://openrouter.ai/api/v1",
    deepseek: "https://api.deepseek.com/v1",
    groq: "https://api.groq.com/openai/v1",
    mistral: "https://api.mistral.ai/v1",
    perplexity: "https://api.perplexity.ai",
    together: "https://api.together.xyz/v1",
    lovable: "https://ai.gateway.lovable.dev/v1",
  };
  const url = (cleanBaseUrl?.replace(/\/$/, "") || defaults[p] || defaults.openai) + "/chat/completions";
  const body: any = { model: normalizedModel, messages };
  if (tools && tools.length) {
    body.tools = tools;
    body.tool_choice = "auto";
  }
  const headers: Record<string, string> =
    p === "lovable"
      ? { "Lovable-API-Key": cleanApiKey, "X-Lovable-AIG-SDK": "tanstack-server-fn", "Content-Type": "application/json" }
      : { Authorization: `Bearer ${cleanApiKey}`, "Content-Type": "application/json" };
  if (p === "openrouter") {
    headers["HTTP-Referer"] = "https://devionic.com";
    headers["X-Title"] = "Devionic DMS";
  }


  return {
    url,
    headers,
    body,
    parse: (j) => j?.choices?.[0]?.message?.content ?? "",
  };
}

export async function callProvider(req: ProviderCall, provider: string, timeoutMs = 55000): Promise<any> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(req.url, {
      method: "POST",
      headers: req.headers,
      body: JSON.stringify(req.body),
      signal: ctrl.signal,
    });
  } catch (e: any) {
    clearTimeout(timer);
    if (e?.name === "AbortError") {
      throw new Error(`${provider} timed out after ${Math.round(timeoutMs / 1000)}s. Try a lighter audit or a faster model.`);
    }
    throw new Error(`${provider} unreachable: ${String(e?.message || e)}`);
  }
  clearTimeout(timer);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(providerHelp(provider, res.status, text, req));
  }
  return res.json();
}