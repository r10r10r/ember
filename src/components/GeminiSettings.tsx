import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings2, ExternalLink } from "lucide-react";
import { loadConfig, saveConfig, type GeminiConfig, type Provider } from "@/lib/gemini";

const GEMINI_MODELS = [
  "gemini-2.5-pro",
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.0-flash",
  "gemini-3-flash-preview",
  "gemini-3-pro-preview",
  "gemini-3.1-pro-preview",
  "gemini-3.1-flash-image-preview",
];

const OPENROUTER_MODELS = [
  // Gemma 4
  { id: "google/gemma-4-31b-it:free",  label: "Gemma 4 31B (free) ⭐" },
  // Gemma 3
  { id: "google/gemma-3-27b-it",       label: "Gemma 3 27B (free)" },
  { id: "google/gemma-3-12b-it",       label: "Gemma 3 12B (free)" },
  { id: "google/gemma-3-4b-it",        label: "Gemma 3 4B (free)" },
  { id: "google/gemma-2-27b-it",       label: "Gemma 2 27B" },
  // Other popular OpenRouter models
  { id: "meta-llama/llama-4-maverick", label: "Llama 4 Maverick" },
  { id: "mistralai/mistral-nemo",      label: "Mistral Nemo (free)" },
  { id: "deepseek/deepseek-v3.2",      label: "DeepSeek V3.2" },
  { id: "deepseek/deepseek-chat",      label: "DeepSeek V3" },
  { id: "deepseek/deepseek-r1",        label: "DeepSeek R1 (Reasoning)" },
  { id: "openai/gpt-4o-mini",          label: "GPT-4o Mini" },
  { id: "openrouter/elephant-alpha",   label: "Elephant Alpha (100B) (free)" },
  { id: "minimax/minimax-m2.5:free",    label: "MiniMax M2.5 (free)" },
];

export function GeminiSettings({
  onSaved,
}: {
  onSaved?: (cfg: GeminiConfig) => void;
}) {
  const [open, setOpen] = useState(false);
  const [cfg, setCfg] = useState<GeminiConfig>(() => loadConfig());

  const handleChange = (newCfg: GeminiConfig) => {
    setCfg(newCfg);
    saveConfig(newCfg);
    onSaved?.(newCfg);
  };

  const setProvider = (p: Provider) => handleChange({ ...cfg, provider: p });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="icon" variant="ghost" className="h-7 w-7">
          <Settings2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>AI Settings</DialogTitle>
          <DialogDescription>
            Choose your AI provider and paste your API key. Keys are stored only in
            your browser — nothing leaves your machine except calls to the chosen API.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Provider toggle */}
          <div className="space-y-2">
            <Label>Provider</Label>
            <div className="flex gap-2">
              {(["gemini", "openrouter", "azure"] as Provider[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setProvider(p)}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                    cfg.provider === p
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-muted-foreground hover:text-foreground border-border"
                  }`}
                >
                  {p === "gemini"
                    ? "🔵 Gemini"
                    : p === "openrouter"
                    ? "🟣 OpenRouter"
                    : "☁️ Azure / Kimi"}
                </button>
              ))}
            </div>
          </div>

          {/* ── Gemini panel ── */}
          {cfg.provider === "gemini" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="gemini-key">Google AI Studio API Key</Label>
                <Input
                  id="gemini-key"
                  type="password"
                  autoComplete="off"
                  value={cfg.apiKey}
                  onChange={(e) => handleChange({ ...cfg, apiKey: e.target.value })}
                  placeholder="AIza…"
                />
                <a
                  href="https://aistudio.google.com/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  Get a key from Google AI Studio <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              <div className="space-y-2">
                <Label htmlFor="gemini-model">Model</Label>
                <select
                  id="gemini-model"
                  value={cfg.model}
                  onChange={(e) => handleChange({ ...cfg, model: e.target.value })}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {GEMINI_MODELS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* ── OpenRouter panel ── */}
          {cfg.provider === "openrouter" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="or-key">OpenRouter API Key</Label>
                <Input
                  id="or-key"
                  type="password"
                  autoComplete="off"
                  value={cfg.openRouterKey}
                  onChange={(e) => handleChange({ ...cfg, openRouterKey: e.target.value })}
                  placeholder="sk-or-…"
                />
                <a
                  href="https://openrouter.ai/keys"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  Get a key from OpenRouter <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              <div className="space-y-2">
                <Label htmlFor="or-model">Model</Label>
                <select
                  id="or-model"
                  value={cfg.openRouterModel}
                  onChange={(e) => handleChange({ ...cfg, openRouterModel: e.target.value })}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {OPENROUTER_MODELS.map((m) => (
                    <option key={m.id} value={m.id}>{m.label}</option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  Models marked <span className="font-medium">(free)</span> are available without a paid plan on OpenRouter.
                </p>
              </div>
            </>
          )}
          {/* ── Azure panel ── */}
          {cfg.provider === "azure" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="azure-key">Azure API Key</Label>
                <Input
                  id="azure-key"
                  type="password"
                  autoComplete="off"
                  value={cfg.azureKey}
                  onChange={(e) => handleChange({ ...cfg, azureKey: e.target.value })}
                  placeholder="Paste your Azure key here"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="azure-endpoint">Endpoint URL</Label>
                <Input
                  id="azure-endpoint"
                  type="url"
                  autoComplete="off"
                  value={cfg.azureEndpoint}
                  onChange={(e) => handleChange({ ...cfg, azureEndpoint: e.target.value })}
                  placeholder="https://{res}.models.ai.azure.com"
                />
                <p className="text-[10px] text-muted-foreground">
                  The base URL for Chat Completions (without /chat/completions).
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="azure-deployment">Deployment Name</Label>
                  <Input
                    id="azure-deployment"
                    value={cfg.azureDeployment}
                    onChange={(e) =>
                      handleChange({ ...cfg, azureDeployment: e.target.value })
                    }
                    placeholder="kimi-k2.6"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="azure-version">API Version</Label>
                  <Input
                    id="azure-version"
                    value={cfg.azureApiVersion}
                    onChange={(e) =>
                      handleChange({ ...cfg, azureApiVersion: e.target.value })
                    }
                    placeholder="Leave empty for MaaS"
                  />
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button onClick={() => setOpen(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
