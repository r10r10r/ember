import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Play,
  Pause,
  RotateCcw,
  Plus,
  Trash2,
  Coffee,
  Brain,
  Check,
  Pencil,
  X,
} from "lucide-react";

type Mode = "focus" | "short" | "long";
type Objective = { id: string; text: string; done: boolean; createdAt: number };

const DEFAULT_DURATIONS: Record<Mode, number> = {
  focus: 25 * 60,
  short: 5 * 60,
  long: 15 * 60,
};

const MODE_LABEL: Record<Mode, string> = {
  focus: "Focus",
  short: "Short Break",
  long: "Long Break",
};

const STORAGE_KEY = "ember.objectives.v1";
const STATS_KEY = "ember.stats.v1";
const DURATIONS_KEY = "ember.durations.v1";

function loadObjectives(): Objective[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function loadCompleted(): number {
  try {
    return Number(localStorage.getItem(STATS_KEY)) || 0;
  } catch {
    return 0;
  }
}

function loadDurations(): Record<Mode, number> {
  try {
    const raw = localStorage.getItem(DURATIONS_KEY);
    if (!raw) return DEFAULT_DURATIONS;
    return { ...DEFAULT_DURATIONS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_DURATIONS;
  }
}

function format(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60).toString().padStart(2, "0");
  const sec = (s % 60).toString().padStart(2, "0");
  return h > 0 ? `${h}:${m}:${sec}` : `${m}:${sec}`;
}

export function PomodoroTimer() {
  const [durations, setDurations] = useState<Record<Mode, number>>(() => loadDurations());
  const [mode, setMode] = useState<Mode>("focus");
  const [secondsLeft, setSecondsLeft] = useState(durations.focus);
  const [running, setRunning] = useState(false);
  const [editingTime, setEditingTime] = useState(false);
  const [draftMinutes, setDraftMinutes] = useState("25");

  const [objectives, setObjectives] = useState<Objective[]>(() => loadObjectives());
  const [newObj, setNewObj] = useState("");
  const [completedSessions, setCompletedSessions] = useState(() => loadCompleted());

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(objectives));
  }, [objectives]);

  useEffect(() => {
    localStorage.setItem(STATS_KEY, String(completedSessions));
  }, [completedSessions]);

  useEffect(() => {
    localStorage.setItem(DURATIONS_KEY, JSON.stringify(durations));
  }, [durations]);

  useEffect(() => {
    document.title = `${format(secondsLeft)} — Ember`;
  }, [secondsLeft]);

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          if (mode === "focus") setCompletedSessions((c) => c + 1);
          setRunning(false);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running, mode]);

  const switchMode = (m: Mode) => {
    setMode(m);
    setSecondsLeft(durations[m]);
    setRunning(false);
    setEditingTime(false);
  };

  const reset = () => {
    setSecondsLeft(durations[mode]);
    setRunning(false);
  };

  const startEditTime = () => {
    if (running) return;
    setDraftMinutes(String(Math.max(1, Math.round(durations[mode] / 60))));
    setEditingTime(true);
  };

  const saveTime = () => {
    const mins = Math.max(1, Math.min(600, parseInt(draftMinutes, 10) || 1));
    const secs = mins * 60;
    setDurations((d) => ({ ...d, [mode]: secs }));
    setSecondsLeft(secs);
    setEditingTime(false);
  };

  const addObjective = () => {
    const text = newObj.trim();
    if (!text) return;
    const item: Objective = {
      id:
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random()}`,
      text,
      done: false,
      createdAt: Date.now(),
    };
    setObjectives((o) => [item, ...o]);
    setNewObj("");
    // ensure the new (top) item is visible
    requestAnimationFrame(() => listRef.current?.scrollTo({ top: 0, behavior: "smooth" }));
  };

  const toggle = (id: string) =>
    setObjectives((o) => o.map((x) => (x.id === id ? { ...x, done: !x.done } : x)));
  const remove = (id: string) => setObjectives((o) => o.filter((x) => x.id !== id));
  const clearDone = () => setObjectives((o) => o.filter((x) => !x.done));

  const total = durations[mode];
  const progress = ((total - secondsLeft) / total) * 100;
  const accent = mode === "focus" ? "var(--focus)" : "var(--break)";

  const doneCount = objectives.filter((o) => o.done).length;

  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden">
      <div className="flex items-center justify-between">
        <div className="flex gap-1 rounded-full bg-muted p-1">
          {(["focus", "short", "long"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => switchMode(m)}
              className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                mode === m
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {MODE_LABEL[m]}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          {completedSessions} session{completedSessions === 1 ? "" : "s"} · today
        </p>
      </div>

      {/* Timer */}
      <div className="flex flex-col items-center justify-center rounded-2xl border bg-card/70 backdrop-blur p-5 shadow-sm">
        <div className="relative h-40 w-40">
          <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" fill="none" stroke="var(--muted)" strokeWidth="6" />
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke={accent}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 45}`}
              strokeDashoffset={`${2 * Math.PI * 45 * (1 - progress / 100)}`}
              style={{
                transition: "stroke-dashoffset 1s linear",
                filter: "drop-shadow(0 0 6px var(--ember-glow))",
              }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
              {mode === "focus" ? <Brain className="h-3 w-3" /> : <Coffee className="h-3 w-3" />}
              {MODE_LABEL[mode]}
            </div>
            {editingTime ? (
              <div className="mt-1 flex items-center gap-1">
                <input
                  autoFocus
                  type="number"
                  min={1}
                  max={600}
                  value={draftMinutes}
                  onChange={(e) => setDraftMinutes(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveTime();
                    if (e.key === "Escape") setEditingTime(false);
                  }}
                  className="w-14 rounded-md border bg-background px-1.5 py-0.5 text-center font-mono text-2xl font-bold tabular-nums focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <span className="font-mono text-2xl font-bold text-muted-foreground">m</span>
              </div>
            ) : (
              <button
                onClick={startEditTime}
                disabled={running}
                title={running ? "Pause to edit time" : "Click to edit"}
                className="group mt-1 font-mono text-3xl font-bold tabular-nums hover:text-primary disabled:cursor-not-allowed disabled:hover:text-foreground transition-colors flex items-center gap-1"
              >
                {format(secondsLeft)}
                {!running && (
                  <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-60 transition-opacity" />
                )}
              </button>
            )}
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          {editingTime ? (
            <>
              <Button size="sm" onClick={saveTime} className="min-w-24">
                <Check className="mr-2 h-4 w-4" />
                Save
              </Button>
              <Button size="sm" variant="outline" onClick={() => setEditingTime(false)}>
                <X className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <Button size="sm" onClick={() => setRunning((r) => !r)} className="min-w-24">
                {running ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
                {running ? "Pause" : "Start"}
              </Button>
              <Button size="sm" variant="outline" onClick={reset}>
                <RotateCcw className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Objectives */}
      <div className="flex-1 rounded-2xl border bg-card/70 backdrop-blur p-4 shadow-sm flex flex-col min-h-0">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold text-sm">Objectives</h2>
          <span className="text-xs text-muted-foreground">
            {doneCount}/{objectives.length} done
          </span>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            addObjective();
          }}
          className="flex gap-2 mb-2"
        >
          <Input
            value={newObj}
            onChange={(e) => setNewObj(e.target.value)}
            placeholder="Add an objective…"
            className="h-9"
          />
          <Button type="submit" size="icon" className="h-9 w-9 shrink-0">
            <Plus className="h-4 w-4" />
          </Button>
        </form>

        <div
          ref={listRef}
          className="flex-1 min-h-0 overflow-y-auto scrollbar-thin space-y-1.5 pr-1"
        >
          {objectives.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">
              No objectives yet — type one above and press Enter.
            </p>
          ) : (
            objectives.map((o) => (
              <div
                key={o.id}
                className={`group flex items-center gap-3 rounded-lg border px-3 py-2 transition-all reveal-in ${
                  o.done
                    ? "bg-background/30 border-border/50"
                    : "bg-background/60 border-border hover:border-primary/50"
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggle(o.id)}
                  aria-label={o.done ? "Mark not done" : "Mark done"}
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors ${
                    o.done
                      ? "bg-primary border-primary text-primary-foreground"
                      : "border-muted-foreground/40 hover:border-primary"
                  }`}
                >
                  {o.done && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                </button>
                <button
                  type="button"
                  onClick={() => toggle(o.id)}
                  className={`flex-1 text-left text-sm transition-all ${
                    o.done ? "line-through text-muted-foreground" : "text-foreground"
                  }`}
                >
                  {o.text}
                </button>
                <button
                  type="button"
                  onClick={() => remove(o.id)}
                  aria-label="Delete objective"
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity p-1 -m-1"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        {doneCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearDone}
            className="mt-2 self-start text-muted-foreground h-7 text-xs"
          >
            Clear completed
          </Button>
        )}
      </div>
    </div>
  );
}
