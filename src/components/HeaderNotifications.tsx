import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useStudyPlan } from "@/lib/stats";
import { format, addDays, getHours } from "date-fns";

export function HeaderNotifications() {
  const { plan } = useStudyPlan();
  const now = new Date();
  const hour = getHours(now);
  
  // Planning Mode: 9 PM (21:00) to Midnight (00:00)
  // During this time, we show Tomorrow's schedule.
  // Otherwise, we show Today's schedule.
  const isPlanningMode = hour >= 21; 
  const targetDate = isPlanningMode ? addDays(now, 1) : now;
  const targetDateStr = format(targetDate, "yyyy-MM-dd");
  
  const events = plan.filter((e) => e.date === targetDateStr);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {events.length > 0 && (
            <span className="absolute top-1 right-1 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="grid gap-4">
          <div className="space-y-2">
            <h4 className="font-medium leading-none">
              {isPlanningMode ? "Planning Mode (Tomorrow)" : "Today's Schedule"}
            </h4>
            <p className="text-sm text-muted-foreground">
              {format(targetDate, "EEEE, MMM do")}
            </p>
          </div>
          <div className="grid gap-2">
            {events.length === 0 ? (
              <p className="text-sm text-center py-4 text-muted-foreground">
                Nothing scheduled for {isPlanningMode ? "tomorrow" : "today"}.
              </p>
            ) : (
              events.map((event) => (
                <div
                  key={event.id}
                  className="flex items-center justify-between p-2 rounded-md bg-muted/50"
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{event.title}</span>
                    <span className="text-[10px] text-muted-foreground uppercase">
                      {event.type}
                    </span>
                  </div>
                  <div className="text-xs font-mono text-primary">
                    {event.startTime} - {event.endTime}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
