import { useStats } from "@/lib/stats";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart4, Clock, CheckCircle2, Flame, Coffee } from "lucide-react";
import { format, parseISO, subDays } from "date-fns";

export function StatisticsWidget({ visible }: { visible: boolean }) {
  const stats = useStats();

  // Prepare last 7 days of data
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = subDays(new Date(), 6 - i);
    const dateStr = format(d, "yyyy-MM-dd");
    const stat = stats.find((s) => s.date === dateStr);
    return {
      date: format(d, "EEE"),
      fullName: format(d, "MMM d"),
      focusMinutes: stat ? Math.round(stat.focusSeconds / 60) : 0,
      restMinutes: stat ? Math.round(stat.restSeconds / 60) : 0,
      sessions: stat ? stat.sessions : 0,
      objectives: stat ? stat.objectivesCompleted : 0,
    };
  });

  const totalFocusMinutes = last7Days.reduce((acc, d) => acc + d.focusMinutes, 0);
  const totalRestMinutes = last7Days.reduce((acc, d) => acc + d.restMinutes, 0);
  const totalSessions = last7Days.reduce((acc, d) => acc + d.sessions, 0);
  const totalObjectives = last7Days.reduce((acc, d) => acc + d.objectives, 0);

  if (!visible) return null;

  return (
    <div className="flex flex-col h-full w-full p-4 sm:p-8 gap-6 overflow-y-auto bg-background">
      <div className="flex items-center gap-3">
        <BarChart4 className="h-8 w-8 text-primary" />
        <h2 className="text-3xl font-bold tracking-tight">Study Statistics</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card/50 backdrop-blur border-primary/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Clock className="h-3 w-3 text-primary" /> Focus Time (7d)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.floor(totalFocusMinutes / 60)}h {totalFocusMinutes % 60}m</div>
            <p className="text-[10px] text-muted-foreground mt-1">Active study hours</p>
          </CardContent>
        </Card>
        
        <Card className="bg-card/50 backdrop-blur border-primary/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Coffee className="h-3 w-3 text-amber-500" /> Rest Time (7d)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.floor(totalRestMinutes / 60)}h {totalRestMinutes % 60}m</div>
            <p className="text-[10px] text-muted-foreground mt-1">Total relaxation time</p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur border-primary/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Flame className="h-3 w-3 text-orange-500" /> Total Sessions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSessions}</div>
            <p className="text-[10px] text-muted-foreground mt-1">Completed Pomodoros</p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur border-primary/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="h-3 w-3 text-green-500" /> Objectives Done
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalObjectives}</div>
            <p className="text-[10px] text-muted-foreground mt-1">Tasks accomplished</p>
          </CardContent>
        </Card>
      </div>

      <Card className="flex-1 min-h-[400px] bg-card/40 backdrop-blur border-border/40">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Weekly Activity (Minutes)</CardTitle>
        </CardHeader>
        <CardContent className="h-full pb-12">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={last7Days} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
              <XAxis 
                dataKey="date" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 12, fill: "oklch(0.66 0.01 30)" }}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fill: "oklch(0.66 0.01 30)" }}
              />
              <Tooltip 
                cursor={{ fill: 'oklch(1 0 0 / 5%)' }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-popover border border-border px-3 py-2 rounded-lg shadow-xl flex flex-col gap-1">
                        <p className="text-xs font-bold mb-1">{payload[0].payload.fullName}</p>
                        <div className="flex items-center justify-between gap-4">
                           <span className="text-[10px] text-muted-foreground uppercase font-bold">Focus</span>
                           <span className="text-xs text-primary font-mono">{payload[0].payload.focusMinutes}m</span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                           <span className="text-[10px] text-muted-foreground uppercase font-bold">Rest</span>
                           <span className="text-xs text-amber-500 font-mono">{payload[0].payload.restMinutes}m</span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="focusMinutes" stackId="a" fill="var(--primary)" radius={[0, 0, 0, 0]} />
              <Bar dataKey="restMinutes" stackId="a" fill="oklch(0.7 0.13 45)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
