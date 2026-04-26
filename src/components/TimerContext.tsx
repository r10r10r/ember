import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { recordFocusTime, recordRestTime, recordSession } from "@/lib/stats";

type Mode = "focus" | "short" | "long";

interface TimerContextType {
  mode: Mode;
  secondsLeft: number;
  running: boolean;
  setRunning: (r: boolean) => void;
  setMode: (m: Mode) => void;
  reset: () => void;
  addRestTime: (minutes: number) => void;
  setSecondsLeft: (s: number) => void;
  completedSessions: number;
}

const TimerContext = createContext<TimerContextType | undefined>(undefined);

const DEFAULT_DURATIONS: Record<Mode, number> = {
  focus: 25 * 60,
  short: 5 * 60,
  long: 15 * 60,
};

export const TimerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<Mode>("focus");
  const [secondsLeft, setSecondsLeft] = useState(DEFAULT_DURATIONS.focus);
  const [running, setRunning] = useState(false);
  const [completedSessions, setCompletedSessions] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          if (mode === "focus") {
            setCompletedSessions((c) => c + 1);
            recordSession();
          }
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

  // Report time spent
  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => {
      if (mode === "focus") recordFocusTime(10);
      else recordRestTime(10);
    }, 10000);
    return () => clearInterval(interval);
  }, [running, mode]);

  const reset = () => {
    setSecondsLeft(DEFAULT_DURATIONS[mode]);
    setRunning(false);
  };

  const addRestTime = (minutes: number) => {
    setSecondsLeft((s) => s + minutes * 60);
    setRunning(true);
  };

  return (
    <TimerContext.Provider
      value={{
        mode,
        secondsLeft,
        running,
        setRunning,
        setMode: (m) => {
          setMode(m);
          setSecondsLeft(DEFAULT_DURATIONS[m]);
          setRunning(false);
        },
        reset,
        addRestTime,
        setSecondsLeft,
        completedSessions,
      }}
    >
      {children}
    </TimerContext.Provider>
  );
};

export const useTimer = () => {
  const context = useContext(TimerContext);
  if (!context) throw new Error("useTimer must be used within a TimerProvider");
  return context;
};
