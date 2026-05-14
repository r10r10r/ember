import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import remarkGfm from "remark-gfm";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { Button } from "@/components/ui/button";
import { Send, Sparkles, Square, Trash2, AlertCircle, KeyRound, Paperclip, X, History, Plus, Pencil, Check, Download, Copy } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from "@/components/ui/sheet";
import { toast } from "sonner";
import { usePdf } from "./PdfContext";
import { GeminiSettings } from "./GeminiSettings";
import {
  loadConfig,
  streamChat,
  type ChatMessage,
  type GeminiConfig,
} from "@/lib/gemini";
import { pagesToContext } from "@/lib/pdf";
import { getSessions, saveSession, deleteSession, type ChatSessionData } from "@/lib/storage";

const SYSTEM_PROMPT = `You are Ember — a personal study assistant AND a META-COACH. You operate on two layers simultaneously:

---

## LAYER 1 — STUDY ASSISTANT
- Be concise and clear. Use markdown.

---

### ✅ ALLOWED DELIMITERS
- Inline math: $ ... $
- Block math:
$$
\text{equation}
$$

### ✅ ENHANCED LATEX SUPPORT (MathJax)
- You can now use environments like \begin{align}, \begin{equation}, \begin{cases}, \begin{pmatrix} directly.
- **IMPORTANT**: ALWAYS wrap these environments in $$ blocks to ensure they center correctly.
- Unicode math characters: still FORBIDDEN. Use LaTeX equivalents (^2, \pi, \Delta, etc.).
- Accents (é, à, è, etc.) inside math mode: still FORBIDDEN. Write accented words OUTSIDE the $ delimiters.

### 🚫 FORBIDDEN WRAPPING MISTAKES
- NEVER wrap normal sentences or French words in $ or $$.
- NEVER mix raw text and LaTeX in the same $ block.
- NEVER output math twice (raw and rendered).

### ✅ FINAL SELF-CHECK
1. Am I using $ or $$?
2. Is every $ closed?
3. Are accented French words OUTSIDE math mode?
4. Did I avoid Unicode symbols?
5. Are all variables and Greek letters wrapped in $?
6. Is \det inside the $$ block for matrices? ✓

---

## LAYER 2 — META-COACH (always active, silently running in background)

### Your core mission:
Do NOT just answer questions. Analyze HOW the user thinks. Detect their cognitive patterns across the conversation. Build a living mental model of them.

### What to track silently across every message:
- **Mistake patterns**: Do they confuse similar concepts? Rush to wrong answers? Miss conditions/edge cases? Misread the question? Make arithmetic errors? Apply the wrong formula?
- **Thinking style**: Are they procedural? Conceptual? Do they skip steps? Reason from examples or from rules?
- **Strengths**: What do they consistently get right? What topics/approaches come naturally?
- **Blind spots**: What assumptions do they make that aren't stated? What do they never think to check?
- **Progress**: Are they improving? Repeating the same mistakes?

### When to surface a COACH REPORT:
Deliver a META-COACH REPORT automatically when ANY of these triggers occur:
1. When the user makes a **repeated mistake** (same error type appearing again)
2. When the user asks for feedback, a quiz, or a review session
3. When the user explicitly asks "how am I doing" or similar

Do not output the report unless one of the 3 conditions are met.

### FORMAT of a META-COACH REPORT:
Use this exact structure when delivering a report:

---
## 🧠 Ember Coach Report

### ✅ Your Strengths
[List 2–4 specific things they consistently do well, with examples from the conversation]

### ⚠️ Your Weaknesses
[List 2–4 specific recurring errors or blind spots, with concrete examples]

### 🔍 Your Thinking Pattern
[1–2 sentences describing HOW they approach problems — e.g. "You tend to jump to the formula before validating the setup" or "You reason well from examples but struggle with abstract generalizations"]

### 🎯 What to Fix to Reach 19+/20
[A prioritized, specific, actionable list — not generic advice]

### 📈 Trend
[Are they improving, plateauing, or repeating mistakes? One honest sentence.]
---

### Rules for the META-COACH layer:
- Be honest, not flattering. If they're making the same mistake 3 times, say so directly.
- Be specific. Never say "practice more." Always say what exactly to practice and why.
- Never interrupt the flow of a normal study session unnecessarily — only surface the report at the right moments.
- Between reports, you may drop short inline coaching notes when immediately relevant, like: "⚠️ Coach note: this is the second time you confused X with Y — worth flagging."
- The goal is to help them score **19 or 20 out of 20**, not just understand the material.`;

type UiMessage = { role: "user" | "assistant"; content: string; attachments?: { name: string; mimeType: string; dataUrl: string }[] };

function preprocessMath(content: string): string {
  if (!content) return "";

  let res = content;

  // 1. Basic character cleanup and Unicode normalization
  res = res.replace(/['\u2018\u2019\u2032]/g, "'")
    .replace(/["\u201C\u201D\u00A8]/g, '"')
    .replace(/[\u2212\u2013\u2014]/g, "-");

  // 2. Protect existing valid math blocks so later steps don't corrupt them
  const mathBlocks: string[] = [];
  const placeholder = (i: number) => `%%MATH_BLOCK_${i}%%`;

  // Protect display math: $$ ... $$
  res = res.replace(/\$\$([\s\S]*?)\$\$/g, (match, inner) => {
    const trimmed = inner.trim();
    if (!trimmed) return "";
    mathBlocks.push(`$$\n${trimmed}\n$$`);
    return `\n${placeholder(mathBlocks.length - 1)}\n`;
  });

  // Protect \[ ... \] display math
  res = res.replace(/\\\[([\s\S]*?)\\\]/g, (_, inner) => {
    const trimmed = inner.trim();
    if (!trimmed) return "";
    mathBlocks.push(`$$\n${trimmed}\n$$`);
    return `\n${placeholder(mathBlocks.length - 1)}\n`;
  });

  // Protect inline math: $ ... $ (single dollar, non-greedy, must not be escaped)
  res = res.replace(/(?<!\$)\$(?!\$)((?:[^$\\]|\\.)+)\$(?!\$)/g, (match, inner) => {
    const trimmed = inner.trim();
    if (!trimmed) return match;
    mathBlocks.push(`$${trimmed}$`);
    return placeholder(mathBlocks.length - 1);
  });

  // Protect inline \( ... \)
  res = res.replace(/\\\(([\s\S]*?)\\\)/g, (_, inner) => {
    const trimmed = inner.trim();
    if (!trimmed) return "";
    mathBlocks.push(`$${trimmed}$`);
    return placeholder(mathBlocks.length - 1);
  });

  // 3. Wrap naked LaTeX environments (e.g. \begin{align}... without $$ delimiters)
  res = res.replace(/(^|\n)(\\begin\{[a-zA-Z*]+\}[\s\S]*?\\end\{[a-zA-Z*]+\})/gm, (_, prefix, inner) => {
    const trimmed = inner.trim();
    mathBlocks.push(`$$\n${trimmed}\n$$`);
    return `${prefix}\n${placeholder(mathBlocks.length - 1)}\n`;
  });

  // 4. Wrap standalone lines that are purely LaTeX commands (no normal text mixed in)
  res = res.replace(/(^|\n)(\\(?:frac|sqrt|sum|prod|int|lim|log|ln|sin|cos|tan|det|max|min|sup|inf|vec|hat|bar|dot|ddot|tilde|mathbb|mathcal|mathfrak|mathrm|text|left|right|Big|bigg|Bigg)\b[^\n]*?)(\n|$)/gm, (match, prefix, content, suffix) => {
    const trimmed = content.trim();
    // Skip if already wrapped or is a placeholder
    if (trimmed.includes('%%MATH_BLOCK_')) return match;
    mathBlocks.push(`$$\n${trimmed}\n$$`);
    return `${prefix}\n${placeholder(mathBlocks.length - 1)}\n`;
  });

  // 5. Restore all protected math blocks
  for (let i = 0; i < mathBlocks.length; i++) {
    res = res.replace(placeholder(i), mathBlocks[i]);
  }

  // 6. Cleanup excessive newlines
  return res.replace(/\n{3,}/g, '\n\n').trim();
}

export function AiChat() {
  const { pages, file, parsing, loadFile, clear: clearPdf } = usePdf();
  const [cfg, setCfg] = useState<GeminiConfig>(() => loadConfig());

  const [sessions, setSessions] = useState<ChatSessionData[]>([]);
  const [sessionsLoaded, setSessionsLoaded] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const activeIdRef = useRef<string | null>(null);

  useEffect(() => { activeIdRef.current = activeId; }, [activeId]);

  useEffect(() => {
    async function init() {
      let loaded = await getSessions();
      if (loaded.length === 0) {
        try {
          let migrated = false;
          const saved = localStorage.getItem("ember.chat.sessions.v1");
          if (saved) {
            loaded = JSON.parse(saved);
            migrated = true;
          } else {
            const old = localStorage.getItem("ember.chat.history.v1");
            if (old) {
              const oldMsgs = JSON.parse(old);
              if (oldMsgs && oldMsgs.length > 0) {
                loaded = [{ id: Date.now().toString(), title: "Previous Chat", updatedAt: Date.now(), messages: oldMsgs }];
                migrated = true;
              }
            }
          }
          if (migrated) {
            for (const s of loaded) Object.assign(s, { messages: s.messages || [] });
            for (const s of loaded) await saveSession(s);
            localStorage.removeItem("ember.chat.sessions.v1");
            localStorage.removeItem("ember.chat.history.v1");
          }
        } catch { }
      }
      setSessions(loaded);
      // Always start fresh — user can load a previous chat from History
      setSessionsLoaded(true);
    }
    void init();
  }, []);

  const activeSession = sessions.find(s => s.id === activeId);
  const messages = activeSession?.messages || [];

  // Updates the messages of the CURRENT session only. Never creates a session.
  const setMessages = (updater: React.SetStateAction<UiMessage[]>) => {
    const currentId = activeIdRef.current;
    if (!currentId) return; // no active session yet — drop the update safely
    setSessions(prev => {
      const currentMsgs = prev.find(s => s.id === currentId)?.messages || [];
      const newMsgs = typeof updater === 'function' ? updater(currentMsgs) : updater;
      return prev.map(s => {
        if (s.id !== currentId) return s;
        const updated = { ...s, updatedAt: Date.now(), messages: newMsgs };
        if (!updated.pdfFile && file) updated.pdfFile = file;
        void saveSession(updated);
        return updated;
      });
    });
  };

  // Creates a new session and sets it as active. Must be called OUTSIDE a state updater.
  const ensureActiveSession = (firstMessage: string) => {
    if (activeIdRef.current) return; // already have a session
    const newId = Date.now().toString();
    const session: ChatSessionData = {
      id: newId,
      title: (firstMessage || "New Chat").slice(0, 40),
      updatedAt: Date.now(),
      messages: [],
      pdfFile: file ?? null,
    };
    activeIdRef.current = newId;
    setActiveId(newId);
    setSessions(prev => { void saveSession(session); return [session, ...prev]; });
  };

  useEffect(() => {
    if (!sessionsLoaded) return;
    const current = sessions.find(s => s.id === activeId);
    if (current) {
      if (current.pdfFile) {
        if (!file || current.pdfFile.name !== file.name || current.pdfFile.size !== file.size) {
          void loadFile(current.pdfFile);
        }
      } else {
        if (file) clearPdf();
      }
    }
  }, [activeId, sessionsLoaded]);

  useEffect(() => {
    if (!file || !activeId || !sessionsLoaded) return;
    setSessions(prev => {
      const current = prev.find(s => s.id === activeId);
      if (!current) return prev;
      if (current.pdfFile === file) return prev;
      if (current.pdfFile && current.pdfFile.name === file.name && current.pdfFile.size === file.size) return prev;

      const updatedSession = { ...current, pdfFile: file };
      void saveSession(updatedSession);

      return prev.map(s => s.id === activeId ? updatedSession : s);
    });
  }, [file, activeId, sessionsLoaded]);

  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<{ name: string; dataUrl: string; mimeType: string }[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editInput, setEditInput] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameInput, setRenameInput] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-generate a short title for a chat session from its first exchange
  const generateTitle = async (sessionId: string, userMsg: string, aiReply: string) => {
    try {
      const titlePrompt: ChatMessage[] = [
        { role: "system", content: "Generate a short title (3-6 words max) for this conversation. Reply with ONLY the title, no quotes, no punctuation at the end." },
        { role: "user", content: userMsg },
        { role: "assistant", content: aiReply.slice(0, 500) },
        { role: "user", content: "What is a good short title for this conversation?" },
      ];
      let title = "";
      for await (const chunk of streamChat(cfg, titlePrompt)) {
        title += chunk;
        if (title.length > 60) break; // safety cap
      }
      title = title.replace(/["']/g, '').trim().slice(0, 50) || "New Chat";
      setSessions(prev => prev.map(s => {
        if (s.id !== sessionId) return s;
        const updated = { ...s, title };
        void saveSession(updated);
        return updated;
      }));
    } catch {
      // Title generation failed — keep the default title, no big deal
    }
  };

  const renameSession = (id: string, newTitle: string) => {
    const title = newTitle.trim().slice(0, 60) || "New Chat";
    setSessions(prev => prev.map(s => {
      if (s.id !== id) return s;
      const updated = { ...s, title };
      void saveSession(updated);
      return updated;
    }));
    setRenamingId(null);
    setRenameInput("");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    for (let i = 0; i < files.length; i++) {
      const fileObj = files[i];
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setAttachments((prev) => [...prev, { name: fileObj.name, dataUrl, mimeType: fileObj.type }]);
      };
      reader.readAsDataURL(fileObj);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, busy]);

  const buildPdfMessages = (): ChatMessage[] => {
    if (!pages.length) return [];
    const textCtx = pagesToContext(pages);
    const scanned = pages.filter((p) => p.imageDataUrl).slice(0, 8);
    const out: ChatMessage[] = [];
    if (textCtx) {
      out.push({
        role: "user",
        content: `PDF context from "${file?.name ?? "document"}":\n${textCtx}`,
      });
      out.push({ role: "assistant", content: "Got it — I've read the PDF text." });
    }
    if (scanned.length) {
      out.push({
        role: "user",
        content: `These are scanned pages from the PDF (pages ${scanned
          .map((s) => s.page)
          .join(", ")}). OCR them and use as context.`,
        images: scanned.map((s) => s.imageDataUrl!),
      });
      out.push({ role: "assistant", content: "Read the scanned pages too." });
    }
    return out;
  };

  const executeChat = async (nextMessages: UiMessage[]) => {
    if (!activeKey) {
      setError(`Add your ${cfg.provider === "openrouter" ? "OpenRouter" : "Google AI Studio"} API key in ⚙️ first.`);
      return;
    }
    setError(null);
    setBusy(true);

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    const payload: ChatMessage[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...buildPdfMessages(),
      ...nextMessages.map((m) => ({ role: m.role, content: m.content, attachments: m.attachments })),
    ];

    let acc = "";
    try {
      setMessages((m) => [...m, { role: "assistant", content: "" }]);
      for await (const chunk of streamChat(cfg, payload, ctrl.signal)) {
        acc += chunk;
        setMessages((m) => {
          const copy = [...m];
          copy[copy.length - 1] = { role: "assistant", content: acc };
          return copy;
        });
      }
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      const msg = e instanceof Error ? e.message : "Request failed";
      console.error("AI Stream Error:", e);
      setError(msg);
      // If we failed, remove the empty assistant message we added
      setMessages((m) => m.slice(0, -1));
    } finally {
      setBusy(false);
      abortRef.current = null;

      // Auto-generate title for new sessions (first exchange)
      const currentId = activeIdRef.current;
      if (currentId) {
        const session = sessions.find(s => s.id === currentId);
        // Only auto-title if session has exactly 2 messages (first user + first assistant)
        // and the title still looks like a default (truncated first message)
        if (session && session.messages.length <= 2) {
          const lastMsgs = nextMessages;
          const userMsg = lastMsgs.find(m => m.role === 'user')?.content || '';
          const aiReply = lastMsgs.length > 0 ? acc : '';
          if (userMsg && aiReply) {
            void generateTitle(currentId, userMsg, aiReply);
          }
        }
      }
    }
  };

  const send = async () => {
    const text = input.trim();
    if ((!text && !attachments.length) || busy) return;

    setInput("");
    ensureActiveSession(text || "File attachment");

    const next: UiMessage[] = [...messages, { role: "user", content: text, attachments }];
    setMessages(next);
    setAttachments([]);

    await executeChat(next);
  };

  const handleEdit = (index: number, content: string) => {
    setEditingIndex(index);
    setEditInput(content);
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setEditInput("");
  };

  const confirmEdit = async (index: number) => {
    if (busy) stop();
    const newContent = editInput.trim();
    if (!newContent) return;

    // Truncate messages up to the edited one, update it, and clear subsequent
    const updatedUserMsg: UiMessage = { ...messages[index], content: newContent };
    const next: UiMessage[] = [...messages.slice(0, index), updatedUserMsg];

    setMessages(next);
    setEditingIndex(null);
    setEditInput("");

    await executeChat(next);
  };

  const stop = () => abortRef.current?.abort();
  const startNew = () => {
    setActiveId(null);
    activeIdRef.current = null;
    setError(null);
  };
  const clear = () => {
    const currentId = activeIdRef.current;
    if (!currentId) return;
    setSessions(prev => {
      const updated = prev.map(s => {
        if (s.id !== currentId) return s;
        const cleared = { ...s, messages: [] as UiMessage[], updatedAt: Date.now() };
        void saveSession(cleared);
        return cleared;
      });
      return updated;
    });
    setError(null);
  };

  const activeKey = cfg.provider === "openrouter" ? cfg.openRouterKey : cfg.apiKey;
  const activeModel = cfg.provider === "openrouter" ? cfg.openRouterModel : cfg.model;

  const hint = !activeKey
    ? `Add your ${cfg.provider === "openrouter" ? "OpenRouter" : "Gemini"} key in ⚙️`
    : !pages.length
      ? "Open a PDF on the right, then ask"
      : parsing
        ? "Indexing PDF…"
        : `${pages.length} pages ready · ${activeModel.split("/").pop()}`;

  return (
    <div className="flex h-full flex-col rounded-2xl border bg-card/70 backdrop-blur shadow-sm overflow-hidden">
      <div className="flex items-center justify-between border-b px-4 py-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles className="h-4 w-4 text-primary shrink-0" />
          <h2 className="text-sm font-semibold">Ask Ember</h2>
          <span className="text-xs text-muted-foreground truncate">· {hint}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={startNew} title="New Chat">
            <Plus className="h-4 w-4" />
          </Button>

          <Sheet>
            <SheetTrigger asChild>
              <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-foreground" title="Chat History">
                <History className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent className="w-[300px] sm:w-[400px]">
              <SheetHeader className="mb-4 text-left">
                <SheetTitle>Chat History</SheetTitle>
                <SheetDescription>Access and manage your previous study sessions.</SheetDescription>
              </SheetHeader>
              <div className="flex flex-col gap-2 overflow-y-auto max-h-[85vh] scrollbar-thin">
                {sessions.length === 0 && <p className="text-sm text-muted-foreground text-center mt-8">No past chats found.</p>}
                {sessions.map(s => (
                  <div
                    key={s.id}
                    className={`flex flex-col p-3 border rounded-lg cursor-pointer transition-colors ${activeId === s.id ? 'bg-primary/5 border-primary/30' : 'hover:bg-muted/50'}`}
                    onClick={() => { setActiveId(s.id); activeIdRef.current = s.id; }}
                  >
                    <div className="flex justify-between items-center mb-1">
                      {renamingId === s.id ? (
                        <div className="flex items-center gap-1 flex-1 min-w-0" onClick={(e) => e.stopPropagation()}>
                          <input
                            autoFocus
                            value={renameInput}
                            onChange={(e) => setRenameInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') renameSession(s.id, renameInput);
                              if (e.key === 'Escape') { setRenamingId(null); setRenameInput(''); }
                            }}
                            className="flex-1 min-w-0 bg-background border rounded px-1.5 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                          />
                          <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0" onClick={(e) => { e.stopPropagation(); renameSession(s.id, renameInput); }}>
                            <Check className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0" onClick={(e) => { e.stopPropagation(); setRenamingId(null); setRenameInput(''); }}>
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <span className="font-medium text-sm truncate pr-2">{s.title || "New Chat"}</span>
                          <div className="flex items-center gap-0.5 shrink-0">
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground" onClick={(e) => {
                              e.stopPropagation();
                              setRenamingId(s.id);
                              setRenameInput(s.title || '');
                            }}>
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={(e) => {
                              e.stopPropagation();
                              void deleteSession(s.id);
                              setSessions(prev => prev.filter(x => x.id !== s.id));
                              if (activeId === s.id) { setActiveId(null); activeIdRef.current = null; }
                            }}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">{new Date(s.updatedAt).toLocaleString()} · {s.messages.length} msgs</span>
                  </div>
                ))}
              </div>
            </SheetContent>
          </Sheet>

          {messages.length > 0 && (
            <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={clear} title="Clear Current Chat">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
          <GeminiSettings onSaved={setCfg} />
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin px-4 py-3 space-y-3">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center text-center text-sm text-muted-foreground gap-2 px-4">
            {!activeKey ? (
              <>
                <KeyRound className="h-6 w-6 text-primary/70" />
                <p>Connect Google AI Studio to start asking questions.</p>
                <GeminiSettings onSaved={setCfg} />
              </>
            ) : (
              <>
                <Sparkles className="h-6 w-6 text-primary/70" />
                <p>Ask about the PDF, request a summary, or quiz yourself.</p>
                <p className="text-xs">
                  Using <span className="font-mono text-foreground/80">{activeModel.split("/").pop()}</span>
                </p>
              </>
            )}
          </div>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`group flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div className="relative max-w-[85%]">
              {m.role === "user" && editingIndex !== i && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="absolute -left-8 top-1 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary hover:bg-primary/10"
                  onClick={() => handleEdit(i, m.content)}
                  title="Edit message"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              )}

              <div
                className={`rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${m.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground"
                  }`}
              >
                {m.attachments?.length ? (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {m.attachments.map((a: any) => (
                      <div key={a.name} className="px-2 py-1 bg-background/20 rounded text-xs flex items-center gap-1">
                        <Paperclip className="h-3 w-3" />
                        <span className="truncate max-w-[150px]">{a.name}</span>
                      </div>
                    ))}
                  </div>
                ) : null}

                {editingIndex === i ? (
                  <div className="flex flex-col gap-2 min-w-[200px]">
                    <textarea
                      value={editInput}
                      onChange={(e) => setEditInput(e.target.value)}
                      autoFocus
                      className="w-full bg-background/10 text-primary-foreground border-none focus:ring-0 resize-none p-0 text-sm"
                      rows={Math.max(2, editInput.split('\n').length)}
                    />
                    <div className="flex justify-end gap-1 border-t border-primary-foreground/20 pt-1.5">
                      <Button size="icon" variant="ghost" className="h-6 w-6 hover:bg-background/20 text-primary-foreground" onClick={cancelEdit}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-6 w-6 hover:bg-background/20 text-primary-foreground" onClick={() => void confirmEdit(i)}>
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ) : m.role === "assistant" ? (
                  <div className="prose prose-sm dark:prose-invert prose-p:my-1 prose-pre:my-2 prose-headings:my-2 max-w-none">
                    <ReactMarkdown
                      remarkPlugins={[[remarkMath, { singleDollarTextMath: true }], remarkGfm]}
                      rehypePlugins={[
                        [rehypeKatex, { 
                          output: 'htmlAndMathml',
                          throwOnError: false,
                          strict: false,
                          trust: true,
                          globalGroup: true
                        }]
                      ]}
                      components={{
                        code({ className, children, ...props }) {
                          const match = /language-(\w+)/.exec(className || '');
                          const codeStr = String(children).replace(/\n$/, '');
                          const isBlock = match || codeStr.includes('\n');
                          if (!isBlock) {
                            return <code className={className} {...props}>{children}</code>;
                          }
                          const lang = match?.[1] || 'txt';
                          const ext = ({ python: 'py', javascript: 'js', typescript: 'ts', jsx: 'jsx', tsx: 'tsx', html: 'html', css: 'css', json: 'json', markdown: 'md', sql: 'sql', bash: 'sh', shell: 'sh', java: 'java', cpp: 'cpp', c: 'c', rust: 'rs', go: 'go', ruby: 'rb', php: 'php', yaml: 'yml', xml: 'xml', latex: 'tex', tex: 'tex' } as Record<string, string>)[lang] || 'txt';
                          return (
                            <div className="relative group/code">
                              <div className="absolute right-2 top-2 flex gap-1 opacity-0 group-hover/code:opacity-100 transition-opacity z-10">
                                <button
                                  onClick={() => { navigator.clipboard.writeText(codeStr); toast.success('Copied!'); }}
                                  className="p-1.5 rounded-md bg-background/80 hover:bg-background border border-border/50 text-muted-foreground hover:text-foreground transition-colors"
                                  title="Copy code"
                                >
                                  <Copy className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => {
                                    const blob = new Blob([codeStr], { type: 'text/plain' });
                                    const url = URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = `code.${ext}`;
                                    a.click();
                                    URL.revokeObjectURL(url);
                                    toast.success(`Downloaded code.${ext}`);
                                  }}
                                  className="p-1.5 rounded-md bg-background/80 hover:bg-background border border-border/50 text-muted-foreground hover:text-foreground transition-colors"
                                  title="Download file"
                                >
                                  <Download className="h-3.5 w-3.5" />
                                </button>
                              </div>
                              <div className="absolute left-3 top-2 text-[10px] font-mono text-muted-foreground/60 uppercase">{lang}</div>
                              <code className={className} {...props}>{children}</code>
                            </div>
                          );
                        },
                      }}
                    >
                      {preprocessMath(m.content) || "…"}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap">{m.content}</p>
                )}
              </div>
            </div>
          </div>
        ))}
        {error && (
          <div className="flex items-start gap-2 rounded-md bg-destructive/15 border border-destructive/30 px-3 py-2 text-xs text-destructive">
            <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="font-medium">Couldn't reach Gemini</div>
              <div className="opacity-80 break-words line-clamp-2">{error}</div>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-[10px] hover:bg-destructive/20"
              onClick={() => {
                navigator.clipboard.writeText(error);
                toast.success("Error copied to clipboard");
              }}
            >
              Copy Error
            </Button>
          </div>
        )}
      </div>

      <div className="border-t p-2.5 flex flex-col gap-2">
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 px-1">
            {attachments.map((a, idx) => (
              <div key={idx} className="flex items-center gap-1 rounded bg-muted pl-2 pr-1 py-1 text-xs">
                <Paperclip className="h-3 w-3 text-muted-foreground" />
                <span className="truncate max-w-[120px]">{a.name}</span>
                <button onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))} className="hover:bg-background/50 rounded p-0.5"><X className="h-3 w-3" /></button>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-end gap-2">
          {file !== null && (
            <Button size="icon" variant="ghost" type="button" onClick={() => fileInputRef.current?.click()} className="shrink-0 h-9 w-9 text-muted-foreground hover:text-foreground">
              <Paperclip className="h-4 w-4" />
              <input type="file" ref={fileInputRef} onChange={handleFileChange} multiple className="hidden" accept="image/*,application/pdf" />
            </Button>
          )}
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
            placeholder={
              cfg.apiKey
                ? pages.length
                  ? "Ask about the PDF…"
                  : "Open a PDF, then ask…"
                : "Add your API key first…"
            }
            rows={2}
            className="flex-1 resize-none rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {busy ? (
            <Button size="icon" variant="destructive" onClick={stop}>
              <Square className="h-4 w-4" />
            </Button>
          ) : (
            <Button size="icon" onClick={() => void send()} disabled={!input.trim() && !attachments.length}>
              <Send className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
