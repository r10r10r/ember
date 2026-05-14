import { useEffect, useState } from "react";
import { format, differenceInDays, differenceInHours, differenceInMinutes, differenceInSeconds } from "date-fns";
import { Timer } from "lucide-react";

export function ClockDate() {
  const [time, setTime] = useState(new Date());
  
  // Target date: June 3rd, 2026
  const targetDate = new Date(2026, 5, 3); // Month is 0-indexed, so 5 is June

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getCountdown = () => {
    const now = new Date();
    if (now >= targetDate) return "Exam Day!";
    
    const days = differenceInDays(targetDate, now);
    const hours = differenceInHours(targetDate, now) % 24;
    const mins = differenceInMinutes(targetDate, now) % 60;
    const secs = differenceInSeconds(targetDate, now) % 60;

    if (days > 0) {
      return `${days}d ${hours}h left`;
    }
    return `${hours}h ${mins}m ${secs}s left`;
  };

  return (
    <div className="flex items-center gap-3 px-4 py-1.5 rounded-full bg-muted/30 border border-border/40 select-none shadow-sm">
      <div className="flex items-center gap-2 text-primary/90">
        <Timer className="w-3.5 h-3.5" />
        <span className="text-[11px] font-bold tracking-tighter tabular-nums whitespace-nowrap">
          {getCountdown()}
        </span>
      </div>
      
      <div className="w-px h-3 bg-border/60"></div>

      <div className="text-sm font-mono font-bold tracking-tight tabular-nums text-foreground/80">
        {format(time, "HH:mm:ss")}
      </div>
      
      <div className="w-px h-3 bg-border/60"></div>
      
      <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground whitespace-nowrap">
        {format(time, "EEE, MMM do")}
      </div>
    </div>
  );
}
