import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/lib/auth-middleware";
import { z } from "zod";

const schema = z.object({
  project: z.object({
    name: z.string(),
    status: z.string().nullish(),
    progress: z.number().nullish(),
    deadline: z.string().nullish(),
    budget: z.number().nullish(),
    description: z.string().nullish(),
  }),
  stats: z.object({
    tasks_total: z.number(),
    tasks_done: z.number(),
    hours_logged: z.number(),
    spent: z.number(),
    milestones_total: z.number(),
    milestones_done: z.number(),
    team_size: z.number(),
    days_to_deadline: z.number().nullish(),
  }),
});

export const analyzeProject = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((data: unknown) => schema.parse(data))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("AI is not configured.");

    const prompt = `Analyze this project and give a concise executive summary in markdown with 3 sections:
**Health**: 1-2 lines on overall status.
**Risks**: 2-4 bullets on risks (delays, budget overrun, low progress, etc).
**Recommendations**: 2-4 actionable bullets.

Project: ${JSON.stringify(data.project)}
Stats: ${JSON.stringify(data.stats)}`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Lovable-API-Key": apiKey,
        "X-Lovable-AIG-SDK": "tanstack-server-fn",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3.1-flash-lite",
        messages: [
          { role: "system", content: "You are a senior project management consultant. Be concise, direct, and use markdown." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`AI gateway error (${res.status}): ${text.slice(0, 200)}`);
    }
    const json = await res.json() as { choices?: { message?: { content?: string } }[] };
    return { insights: json.choices?.[0]?.message?.content ?? "" };
  });
