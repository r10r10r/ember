import { useEffect, useState } from "react";
import { format } from "date-fns";

export function ClockDate() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col items-end p-4 text-muted-foreground/60 select-none pointer-events-none">
      <div className="text-2xl font-mono font-bold tracking-tighter tabular-nums">
        {format(time, "HH:mm:ss")}
      </div>
      <div className="text-[10px] uppercase tracking-widest font-medium">
        {format(time, "EEEE, MMMM do, yyyy")}
      </div>
    </div>
  );
}
