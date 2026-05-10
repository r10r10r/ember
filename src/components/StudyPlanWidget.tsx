import { useState } from "react";
import { useStudyPlan, StudyEvent } from "@/lib/stats";
import { utils, read, writeFile } from "xlsx";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Calendar as CalendarIcon,
  Plus,
  Trash2,
  Clock,
  MapPin,
  Home,
  Download,
  Upload,
} from "lucide-react";
import { format, isSameDay, parseISO } from "date-fns";
import { toast } from "sonner";

export function StudyPlanWidget({ visible }: { visible: boolean }) {
  const { plan, setPlan } = useStudyPlan();
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [title, setTitle] = useState("");
  const [start, setStart] = useState("08:00");
  const [end, setEnd] = useState("10:00");
  const [type, setType] = useState<"home" | "outside">("home");

  const handleExport = () => {
    if (plan.length === 0) {
      toast.error("No plan to export!");
      return;
    }

    const grouped: Record<string, string[]> = {};
    plan.forEach((event) => {
      if (!grouped[event.date]) grouped[event.date] = [];
      grouped[event.date].push(
        `${event.startTime}-${event.endTime} ${event.title} (${event.type})`
      );
    });

    const dates = Object.keys(grouped).sort();
    const maxRows = Math.max(...dates.map((d) => grouped[d].length), 0);

    const data: string[][] = [];
    data.push(dates);

    for (let i = 0; i < maxRows; i++) {
      const row = dates.map((d) => grouped[d][i] || "");
      data.push(row);
    }

    const ws = utils.aoa_to_sheet(data);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Study Plan");
    writeFile(wb, "study-plan.xlsx");
    toast.success("Plan exported successfully!");
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = utils.sheet_to_json(sheet, { header: 1 }) as any[][];

        if (rows.length === 0) {
          toast.error("The Excel file is empty!");
          return;
        }

        const newEvents: StudyEvent[] = [];
        const dateHeaders = rows[0];

        for (let col = 0; col < dateHeaders.length; col++) {
          const dateStr = String(dateHeaders[col]).trim();
          if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) continue;

          for (let row = 1; row < rows.length; row++) {
            const cellValue = rows[row][col];
            if (!cellValue) continue;

            const match = String(cellValue).match(
              /^(\d{2}:\d{2})-(\d{2}:\d{2})\s+(.+)\s+\((home|outside)\)$/i
            );
            if (match) {
              newEvents.push({
                id: crypto.randomUUID(),
                date: dateStr,
                startTime: match[1],
                endTime: match[2],
                title: match[3],
                type: match[4].toLowerCase() as "home" | "outside",
              });
            }
          }
        }

        if (newEvents.length > 0) {
          // Merge with existing plan, avoiding duplicates if necessary (optional)
          setPlan([...plan, ...newEvents]);
          toast.success(`Successfully imported ${newEvents.length} events!`);
        } else {
          toast.error("No valid events found in the file.");
        }
      } catch (err) {
        toast.error("Failed to parse Excel file.");
        console.error(err);
      }
      // Reset input
      e.target.value = "";
    };
    reader.readAsArrayBuffer(file);
  };

  if (!visible) return null;

  const addEvent = () => {
    if (!date || !title) return;
    const newEvent: StudyEvent = {
      id: crypto.randomUUID(),
      date: format(date, "yyyy-MM-dd"),
      title,
      startTime: start,
      endTime: end,
      type,
    };
    setPlan([...plan, newEvent]);
    setTitle("");
  };

  const removeEvent = (id: string) => {
    setPlan(plan.filter((e) => e.id !== id));
  };

  const selectedDateEvents = plan
    .filter((e) => date && e.date === format(date, "yyyy-MM-dd"))
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  return (
    <div className="flex flex-col h-full w-full p-4 sm:p-8 gap-6 overflow-y-auto bg-background">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CalendarIcon className="h-8 w-8 text-primary" />
          <h2 className="text-3xl font-bold tracking-tight">Study Plan</h2>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={handleExport}>
            <Download className="h-4 w-4" /> Export
          </Button>
          <div className="relative">
            <Button variant="outline" size="sm" className="gap-2" asChild>
              <label htmlFor="import-plan" className="cursor-pointer">
                <Upload className="h-4 w-4" /> Import
              </label>
            </Button>
            <input
              id="import-plan"
              type="file"
              accept=".xlsx, .xls"
              className="hidden"
              onChange={handleImport}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Calendar Column */}
        <div className="lg:col-span-4 space-y-4">
          <Card className="bg-card/40 backdrop-blur border-border/40 overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Select Date</CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex justify-center">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                className="rounded-md border-0"
              />
            </CardContent>
          </Card>

          <Card className="bg-card/40 backdrop-blur border-border/40">
            <CardHeader>
              <CardTitle className="text-sm font-medium">Add Etude / Plan</CardTitle>
              <CardDescription className="text-[10px]">Add study sessions for the selected day.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                placeholder="What are you studying?"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="text-sm"
              />
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase text-muted-foreground font-bold">Start</label>
                  <Input type="time" value={start} onChange={(e) => setStart(e.target.value)} className="h-8 text-xs" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase text-muted-foreground font-bold">End</label>
                  <Input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className="h-8 text-xs" />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={type === "home" ? "secondary" : "outline"}
                  size="sm"
                  className="flex-1 text-xs gap-2"
                  onClick={() => setType("home")}
                >
                  <Home className="h-3 w-3" /> Home
                </Button>
                <Button
                  variant={type === "outside" ? "secondary" : "outline"}
                  size="sm"
                  className="flex-1 text-xs gap-2"
                  onClick={() => setType("outside")}
                >
                  <MapPin className="h-3 w-3" /> Outside
                </Button>
              </div>
              <Button onClick={addEvent} className="w-full gap-2 mt-2">
                <Plus className="h-4 w-4" /> Add to Plan
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Daily Schedule Column */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">
              {date ? format(date, "EEEE, MMMM do") : "Select a date"}
            </h3>
            <span className="text-xs text-muted-foreground">{selectedDateEvents.length} events</span>
          </div>

          <div className="space-y-3">
            {selectedDateEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 bg-card/20 rounded-2xl border border-dashed border-border/60">
                <CalendarIcon className="h-10 w-10 text-muted-foreground/20 mb-3" />
                <p className="text-sm text-muted-foreground">No sessions planned for this day.</p>
              </div>
            ) : (
              selectedDateEvents.map((event) => (
                <Card key={event.id} className="bg-card/40 hover:bg-card/60 transition-colors border-border/40 group">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center ${event.type === 'outside' ? 'bg-amber-500/10 text-amber-500' : 'bg-primary/10 text-primary'}`}>
                        {event.type === 'outside' ? <MapPin className="h-5 w-5" /> : <Home className="h-5 w-5" />}
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm">{event.title}</h4>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground uppercase font-bold tracking-wider mt-0.5">
                          <Clock className="h-3 w-3" /> {event.startTime} — {event.endTime}
                          <span className="mx-1">•</span>
                          <span className={event.type === 'outside' ? 'text-amber-500/80' : 'text-primary/80'}>{event.type}</span>
                        </div>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="opacity-0 group-hover:opacity-100 hover:text-destructive transition-all"
                      onClick={() => removeEvent(event.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
