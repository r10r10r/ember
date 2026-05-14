import { useState, useEffect } from "react";
import { Sun, Moon } from "lucide-react";
import { Button } from "./ui/button";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("theme");
      if (saved) return saved as "light" | "dark";
      if (document.body.classList.contains("dark")) return "dark";
    }
    return "dark"; // Default to dark as requested/existing
  });

  useEffect(() => {
    const root = window.document.documentElement;
    const body = window.document.body;
    if (theme === "dark") {
      root.classList.add("dark");
      body.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      root.classList.remove("dark");
      body.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [theme]);

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
      className="w-9 h-9 rounded-full bg-muted/20 hover:bg-muted/40 border border-border/40 transition-all duration-300 relative overflow-hidden"
      title={theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
    >
      <div className="flex items-center justify-center relative w-full h-full">
        {theme === "light" ? (
          <Sun className="h-[1.1rem] w-[1.1rem] text-amber-500 animate-in zoom-in-50 duration-300" />
        ) : (
          <Moon className="h-[1.1rem] w-[1.1rem] text-blue-400 animate-in zoom-in-50 duration-300" />
        )}
      </div>
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
