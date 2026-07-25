import { buildRequest, callProvider, getProviderDefaultModel } from "./ai-provider";

type ProviderTestInput = {
  provider: string;
  apiKey?: string;
  model?: string;
  baseUrl?: string;
};

function cleanInput(value?: string): string | undefined {
  const cleaned = String(value || "")
    .trim()
    .replace(/^Bearer\s+/i, "")
    .replace(/[\u200B-\u200F\u202A-\u202E\u2060\uFEFF]/g, "");
  return cleaned || undefined;
}

export function normalizeProviderTestInput(input: ProviderTestInput) {
  const provider = cleanInput(input.provider)?.toLowerCase();
  const apiKey = cleanInput(input.apiKey);
  const model = cleanInput(input.model);
  const baseUrl = cleanInput(input.baseUrl);

  if (!provider) throw new Error("Provider required.");

  if (provider === "lovable") {
    const builtInKey = process.env.LOVABLE_API_KEY;
    if (!builtInKey) throw new Error("Built-in AI key missing.");
    return {
      provider,
      apiKey: builtInKey,
      model: model || "google/gemini-3.1-flash-lite",
      baseUrl,
    };
  }

  if (!apiKey) throw new Error("API key required.");
  const normalizedModel = model || getProviderDefaultModel(provider);
  if (!normalizedModel) throw new Error("Model required.");

  if (provider === "openrouter") {
    if (!apiKey.startsWith("sk-or-")) {
      throw new Error("OpenRouter API Key field me OpenRouter key paste karein (sk-or-v1-...). Model id API key field me na rakhein.");
    }
    if (!normalizedModel.includes("/")) {
      throw new Error("OpenRouter model id vendor/model format me hona chahiye, example: openai/gpt-4o-mini.");
    }
  }

  if (provider === "custom") {
    if (!baseUrl) throw new Error("Custom provider ke liye Base URL required hai, example: https://your-endpoint/v1");
    try {
      new URL(baseUrl);
    } catch {
      throw new Error("Base URL valid URL hona chahiye, example: https://your-endpoint/v1");
    }
  }

  return { provider, apiKey, model: normalizedModel, baseUrl };
}

export async function testProviderConnection(input: ProviderTestInput) {
  const normalized = normalizeProviderTestInput(input);
  const req = buildRequest(
    normalized.provider,
    normalized.apiKey,
    normalized.model,
    normalized.baseUrl,
    [{ role: "user", content: "Reply with the single word: OK" }],
  );
  const json = await callProvider(req, normalized.provider, 30000);
  return { ok: true, reply: req.parse(json) || "OK" };
}