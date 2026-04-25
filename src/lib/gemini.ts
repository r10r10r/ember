// AI chat client — supports Google Gemini (AI Studio) + OpenRouter (Gemma 4, etc.)
export type ChatRole = "system" | "user" | "assistant";
export type ChatMessage = {
  role: ChatRole;
  content: string;
  /** base64 data URLs for vision or docs input */
  images?: string[];
  attachments?: { name: string; mimeType: string; dataUrl: string }[];
};

export type Provider = "gemini" | "openrouter" | "azure";

export type GeminiConfig = {
  apiKey: string;       // Google AI Studio key (for Gemini)
  model: string;        // e.g. gemini-2.5-flash
  provider: Provider;
  openRouterKey: string; // OpenRouter API key
  openRouterModel: string; // e.g. google/gemma-2-27b-it
  // Azure / Kimi Support
  azureKey: string;
  azureEndpoint: string;
  azureDeployment: string;
  azureApiVersion: string;
};

const STORAGE_KEY = "ember.gemini.config.v1";
const DEFAULT_CONFIG: GeminiConfig = {
  apiKey: "",
  model: "gemini-2.5-flash",
  provider: "gemini",
  openRouterKey: "",
  openRouterModel: "google/gemma-4-31b-it:free",
  azureKey: "",
  azureEndpoint: "",
  azureDeployment: "kimi-k2.6",
  azureApiVersion: "", // Default to empty for MaaS/Kimi
};

export function loadConfig(): GeminiConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULT_CONFIG, ...JSON.parse(raw) } : DEFAULT_CONFIG;
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function saveConfig(c: GeminiConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(c));
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function stripDataUrl(dataUrl: string) {
  const idx = dataUrl.indexOf(",");
  return idx >= 0 ? dataUrl.slice(idx + 1) : dataUrl;
}

// ─── Gemini (Google AI Studio) ──────────────────────────────────────────────

type GeminiPart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } };

type GeminiContent = { role: "user" | "model"; parts: GeminiPart[] };

function toGeminiContents(messages: ChatMessage[]): {
  systemInstruction?: { parts: { text: string }[] };
  contents: GeminiContent[];
} {
  const sys = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n\n");
  const contents: GeminiContent[] = [];
  for (const m of messages) {
    if (m.role === "system") continue;
    const parts: GeminiPart[] = [];
    if (m.content) parts.push({ text: m.content });
    if (m.images?.length) {
      for (const img of m.images) {
        parts.push({ inlineData: { mimeType: "image/png", data: stripDataUrl(img) } });
      }
    }
    if (m.attachments?.length) {
      for (const att of m.attachments) {
        parts.push({ inlineData: { mimeType: att.mimeType, data: stripDataUrl(att.dataUrl) } });
      }
    }
    if (!parts.length) continue;
    contents.push({ role: m.role === "assistant" ? "model" : "user", parts });
  }
  return {
    systemInstruction: sys ? { parts: [{ text: sys }] } : undefined,
    contents,
  };
}

async function* streamGeminiChat(
  cfg: GeminiConfig,
  messages: ChatMessage[],
  signal?: AbortSignal,
): AsyncGenerator<string, void, unknown> {
  if (!cfg.apiKey) throw new Error("Missing Google AI Studio API key. Open ⚙️ to add it.");

  const { systemInstruction, contents } = toGeminiContents(messages);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    cfg.model,
  )}:streamGenerateContent?alt=sse&key=${encodeURIComponent(cfg.apiKey)}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ systemInstruction, contents }),
    signal,
  });

  if (!res.ok || !res.body) {
    let detail = res.statusText;
    try { const t = await res.text(); detail = t || detail; } catch {}
    throw new Error(`Gemini error ${res.status}: ${detail}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (!line || !line.startsWith("data:")) continue;
      const json = line.slice(5).trim();
      if (!json || json === "[DONE]") continue;
      try {
        const obj = JSON.parse(json);
        const parts = obj?.candidates?.[0]?.content?.parts as GeminiPart[] | undefined;
        if (parts) {
          for (const p of parts) {
            if ("text" in p && p.text) yield p.text;
          }
        }
      } catch { /* partial line */ }
    }
  }
}

// ─── OpenRouter (OpenAI-compatible) ─────────────────────────────────────────

function toOpenRouterMessages(messages: ChatMessage[]) {
  return messages.map((m) => {
    // System messages — plain string content
    if (m.role === "system") return { role: "system", content: m.content };

    // Assistant messages — always plain string (multimodal not supported for outputs)
    if (m.role === "assistant") return { role: "assistant", content: m.content };

    // User messages — build multimodal array if images/attachments present
    const hasMedia = (m.images?.length ?? 0) + (m.attachments?.length ?? 0) > 0;
    if (!hasMedia) {
      return { role: "user", content: m.content };
    }
    const parts: any[] = [];
    if (m.content) parts.push({ type: "text", text: m.content });
    for (const img of m.images ?? []) {
      parts.push({ type: "image_url", image_url: { url: img } });
    }
    for (const att of m.attachments ?? []) {
      parts.push({ type: "image_url", image_url: { url: att.dataUrl } });
    }
    return { role: "user", content: parts };
  });
}

async function* streamOpenRouterChat(
  cfg: GeminiConfig,
  messages: ChatMessage[],
  signal?: AbortSignal,
): AsyncGenerator<string, void, unknown> {
  if (!cfg.openRouterKey) throw new Error("Missing OpenRouter API key. Open ⚙️ to add it.");

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${cfg.openRouterKey}`,
      "HTTP-Referer": window.location.origin,
      "X-Title": "Ember Study Assistant",
    },
    body: JSON.stringify({
      model: cfg.openRouterModel,
      messages: toOpenRouterMessages(messages),
      stream: true,
      repetition_penalty: 1.1,
      top_p: 0.9,
    }),
    signal,
  });

  if (!res.ok || !res.body) {
    let detail = res.statusText;
    try { const t = await res.text(); detail = t || detail; } catch {}
    throw new Error(`OpenRouter error ${res.status}: ${detail}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (!line || !line.startsWith("data:")) continue;
      const json = line.slice(5).trim();
      if (!json || json === "[DONE]") continue;
      try {
        const obj = JSON.parse(json);
        // Check for error in stream
        if (obj?.error) throw new Error(obj.error.message ?? JSON.stringify(obj.error));
        const delta = obj?.choices?.[0]?.delta?.content;
        // Use explicit null check — empty string "") is a valid chunk and must not be skipped
        if (delta != null) yield delta;
      } catch (parseErr) {
        if ((parseErr as Error).message?.includes('OpenRouter')) throw parseErr;
        /* partial JSON line — ignore */
      }
    }
  }
}

// ─── Azure / Kimi (OpenAI-compatible) ───────────────────────────────────────

async function* streamAzureChat(
  cfg: GeminiConfig,
  messages: ChatMessage[],
  signal?: AbortSignal,
): AsyncGenerator<string, void, unknown> {
  if (!cfg.azureKey || !cfg.azureEndpoint) {
    throw new Error("Missing Azure API Key or Endpoint. Open ⚙️ to add them.");
  }

  // Build URL carefully
  let url = cfg.azureEndpoint.replace(/\/$/, "");
  if (!url.includes("/chat/completions")) {
    url += "/chat/completions";
  }

  if (cfg.azureApiVersion) {
    const separator = url.includes("?") ? "&" : "?";
    url += `${separator}api-version=${encodeURIComponent(cfg.azureApiVersion)}`;
  }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": cfg.azureKey,
    },
    body: JSON.stringify({
      model: cfg.azureDeployment,
      messages: toOpenRouterMessages(messages), // Reuse OpenAI-compatible formatter
      stream: true,
    }),
    signal,
  });

  if (!res.ok || !res.body) {
    let detail = res.statusText;
    try {
      const t = await res.text();
      detail = t || detail;
    } catch {}
    throw new Error(`Azure error ${res.status}: ${detail}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (!line || !line.startsWith("data:")) continue;
      const json = line.slice(5).trim();
      if (!json || json === "[DONE]") continue;
      try {
        const obj = JSON.parse(json);
        if (obj?.error) throw new Error(obj.error.message ?? JSON.stringify(obj.error));
        const delta = obj?.choices?.[0]?.delta?.content;
        if (delta != null) yield delta;
      } catch (parseErr) {
        if ((parseErr as Error).message?.includes("Azure")) throw parseErr;
        /* partial JSON line — ignore */
      }
    }
  }
}

// ─── Unified entry point ─────────────────────────────────────────────────────

export async function* streamChat(
  cfg: GeminiConfig,
  messages: ChatMessage[],
  signal?: AbortSignal,
): AsyncGenerator<string, void, unknown> {
  if (cfg.provider === "openrouter") {
    yield* streamOpenRouterChat(cfg, messages, signal);
  } else if (cfg.provider === "azure") {
    yield* streamAzureChat(cfg, messages, signal);
  } else {
    yield* streamGeminiChat(cfg, messages, signal);
  }
}
