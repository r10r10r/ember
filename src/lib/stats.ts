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
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function cleanupExpiredEvents(plan: StudyEvent[]): StudyEvent[] {
  const now = new Date();
  const todayStr = getTodayStr();
  const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const filtered = plan.filter((event) => {
    // If event is from a previous day, it's expired
    if (event.date < todayStr) return false;
    // If event is from today and its end time has passed, it's expired
    if (event.date === todayStr && event.endTime <= currentTimeStr) return false;
    // Otherwise keep it
    return true;
  });

  if (filtered.length !== plan.length) {
    // If we removed something, update storage silently or return for saving
    localStorage.setItem(PLAN_STORAGE_KEY, JSON.stringify(filtered));
  }

  return filtered;
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
    const plan = raw ? JSON.parse(raw) : [];
    return cleanupExpiredEvents(plan);
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
    
    // Check for expired events every minute
    const interval = setInterval(() => {
      setPlan(loadPlan());
    }, 60000);

    return () => {
      window.removeEventListener("ember-plan-updated", handler);
      clearInterval(interval);
    };
  }, []);

  return { plan, setPlan: (p: StudyEvent[]) => savePlan(p) };
}
