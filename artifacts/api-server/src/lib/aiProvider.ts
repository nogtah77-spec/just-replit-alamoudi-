import { logger } from "./logger";

export type ChatMsg = { role: "user" | "assistant"; content: string };

type ProviderName = "gemini" | "groq" | "openrouter";

interface ResolvedProvider {
  provider: ProviderName;
  key: string;
  model: string;
}

// Provider priority order:
//   1. Groq (fast, strong open models, usable free tier — current primary)
//   2. Google Gemini (excellent Arabic + dialects; free tier may be exhausted)
//   3. OpenRouter (free models)
// Keys are read from the environment so providers can be added/removed without
// any code change.
// Returns every configured provider in priority order. The chat layer walks this
// list and falls through to the next provider when one is rate limited or out of
// quota, so configuring more than one key gives the AI a real backup when a
// provider's free tier is exhausted.
export function resolveProviders(): ResolvedProvider[] {
  const list: ResolvedProvider[] = [];
  // Groq first: it has a usable free tier. Gemini is kept as a fallback (its
  // free tier may be exhausted) and OpenRouter last.
  const groq = process.env.GROQ_API_KEY?.trim();
  if (groq) {
    list.push({
      provider: "groq",
      key: groq,
      model: process.env.GROQ_MODEL?.trim() || "llama-3.3-70b-versatile",
    });
  }
  const gemini = process.env.GEMINI_API_KEY?.trim();
  if (gemini) {
    list.push({
      provider: "gemini",
      key: gemini,
      model: process.env.GEMINI_MODEL?.trim() || "gemini-2.0-flash",
    });
  }
  const openrouter = process.env.OPENROUTER_API_KEY?.trim();
  if (openrouter) {
    list.push({
      provider: "openrouter",
      key: openrouter,
      model: process.env.OPENROUTER_MODEL?.trim() || "google/gemini-2.0-flash-exp:free",
    });
  }
  return list;
}

export function resolveProvider(): ResolvedProvider | null {
  return resolveProviders()[0] ?? null;
}

export function aiConfigured(): boolean {
  return resolveProviders().length > 0;
}

export function aiProviderName(): ProviderName | "none" {
  return resolveProvider()?.provider ?? "none";
}

const REQUEST_TIMEOUT_MS = 30_000;

class UpstreamError extends Error {
  status: number;
  constructor(status: number) {
    super("AI_UPSTREAM_ERROR");
    this.status = status;
  }
}

// Gemini free-tier quota is enforced PER MODEL, so when one model is rate
// limited (429) or temporarily unavailable (503) we retry with the next model
// which has its own independent quota bucket. Ordered from highest free quota.
const GEMINI_FALLBACK_MODELS = [
  "gemini-2.0-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.5-flash",
  "gemini-2.0-flash-lite",
];

function geminiModelChain(primary: string): string[] {
  return [primary, ...GEMINI_FALLBACK_MODELS.filter((m) => m !== primary)];
}

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function geminiChat(
  key: string,
  model: string,
  system: string,
  messages: ChatMsg[],
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));
  const body = {
    system_instruction: { parts: [{ text: system }] },
    contents,
    generationConfig: {
      temperature: 0.7,
      topP: 0.95,
      maxOutputTokens: 2048,
    },
  };
  const res = await fetchWithTimeout(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    logger.error({ status: res.status, model, detail: detail.slice(0, 500) }, "gemini upstream error");
    throw new UpstreamError(res.status);
  }
  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const parts = data?.candidates?.[0]?.content?.parts ?? [];
  const text = parts.map((p) => p.text ?? "").join("").trim();
  if (!text) throw new Error("AI_EMPTY_RESPONSE");
  return text;
}

async function openaiCompatChat(
  provider: ProviderName,
  key: string,
  model: string,
  system: string,
  messages: ChatMsg[],
): Promise<string> {
  const url =
    provider === "groq"
      ? "https://api.groq.com/openai/v1/chat/completions"
      : "https://openrouter.ai/api/v1/chat/completions";
  const body = {
    model,
    temperature: 0.7,
    max_tokens: 1024,
    messages: [{ role: "system", content: system }, ...messages],
  };
  const res = await fetchWithTimeout(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    logger.error({ provider, status: res.status, detail: detail.slice(0, 500) }, "ai upstream error");
    throw new UpstreamError(res.status);
  }
  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const text = data?.choices?.[0]?.message?.content?.trim() ?? "";
  if (!text) throw new Error("AI_EMPTY_RESPONSE");
  return text;
}

function isRetryableStatus(err: unknown): boolean {
  // 429 = rate limited / out of quota, 503 = model temporarily overloaded.
  return err instanceof UpstreamError && (err.status === 429 || err.status === 503);
}

export async function aiChat(system: string, messages: ChatMsg[]): Promise<string> {
  const providers = resolveProviders();
  if (providers.length === 0) throw new Error("AI_NOT_CONFIGURED");

  let lastErr: unknown = new Error("AI_UPSTREAM_ERROR");
  for (const { provider, key, model } of providers) {
    // For Gemini we also walk a chain of models, since the free-tier quota is
    // tracked per model.
    const attempts: string[] = provider === "gemini" ? geminiModelChain(model) : [model];
    for (const m of attempts) {
      try {
        return provider === "gemini"
          ? await geminiChat(key, m, system, messages)
          : await openaiCompatChat(provider, key, m, system, messages);
      } catch (err) {
        lastErr = err;
        if (isRetryableStatus(err)) {
          logger.warn(
            { provider, model: m, status: (err as UpstreamError).status },
            "ai model exhausted, trying next",
          );
          continue;
        }
        throw err;
      }
    }
  }
  throw lastErr;
}
