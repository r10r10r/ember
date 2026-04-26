import { useState, useEffect } from "react";

export interface DailyStat {
  date: string; // YYYY-MM-DD
  focusSeconds: number;
  restSeconds: number;
  sessions: number;
  objectivesCompleted: number;
}

export interface StudyEvent {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  type: "home" | "outside";
}

const STATS_STORAGE_KEY = "ember.stats.v2";
const PLAN_STORAGE_KEY = "ember.plan.v1";

function getTodayStr() {
  return new Date().toISOString().split("T")[0];
}

// Stats logic
export function loadStats(): DailyStat[] {
  try {
    const raw = localStorage.getItem(STATS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveStats(stats: DailyStat[]) {
  localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(stats));
}

export function recordFocusTime(seconds: number) {
  const stats = loadStats();
  const today = getTodayStr();
  const index = stats.findIndex((s) => s.date === today);

  if (index !== -1) {
    stats[index].focusSeconds += seconds;
  } else {
    stats.push({
      date: today,
      focusSeconds: seconds,
      restSeconds: 0,
      sessions: 0,
      objectivesCompleted: 0,
    });
  }
  saveStats(stats);
  window.dispatchEvent(new Event("ember-stats-updated"));
}

export function recordRestTime(seconds: number) {
  const stats = loadStats();
  const today = getTodayStr();
  const index = stats.findIndex((s) => s.date === today);

  if (index !== -1) {
    stats[index].restSeconds += seconds;
  } else {
    stats.push({
      date: today,
      focusSeconds: 0,
      restSeconds: seconds,
      sessions: 0,
      objectivesCompleted: 0,
    });
  }
  saveStats(stats);
  window.dispatchEvent(new Event("ember-stats-updated"));
}

export function recordSession() {
  const stats = loadStats();
  const today = getTodayStr();
  const index = stats.findIndex((s) => s.date === today);

  if (index !== -1) {
    stats[index].sessions += 1;
  } else {
    stats.push({
      date: today,
      focusSeconds: 0,
      restSeconds: 0,
      sessions: 1,
      objectivesCompleted: 0,
    });
  }
  saveStats(stats);
  window.dispatchEvent(new Event("ember-stats-updated"));
}

export function recordObjectiveCompletion() {
  const stats = loadStats();
  const today = getTodayStr();
  const index = stats.findIndex((s) => s.date === today);

  if (index !== -1) {
    stats[index].objectivesCompleted += 1;
  } else {
    stats.push({
      date: today,
      focusSeconds: 0,
      restSeconds: 0,
      sessions: 0,
      objectivesCompleted: 1,
    });
  }
  saveStats(stats);
  window.dispatchEvent(new Event("ember-stats-updated"));
}

// Plan logic
export function loadPlan(): StudyEvent[] {
  try {
    const raw = localStorage.getItem(PLAN_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function savePlan(plan: StudyEvent[]) {
  localStorage.setItem(PLAN_STORAGE_KEY, JSON.stringify(plan));
  window.dispatchEvent(new Event("ember-plan-updated"));
}

export function useStats() {
  const [stats, setStats] = useState<DailyStat[]>(loadStats);

  useEffect(() => {
    const handler = () => setStats(loadStats());
    window.addEventListener("ember-stats-updated", handler);
    return () => window.removeEventListener("ember-stats-updated", handler);
  }, []);

  return stats;
}

export function useStudyPlan() {
  const [plan, setPlan] = useState<StudyEvent[]>(loadPlan);

  useEffect(() => {
    const handler = () => setPlan(loadPlan());
    window.addEventListener("ember-plan-updated", handler);
    return () => window.removeEventListener("ember-plan-updated", handler);
  }, []);

  return { plan, setPlan: (p: StudyEvent[]) => savePlan(p) };
}
