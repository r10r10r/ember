import { useEffect, useState } from "react";
import { format } from "date-fns";

export function ClockDate() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex items-center gap-3 px-3 py-1 rounded-full bg-muted/30 border border-border/40 select-none">
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
