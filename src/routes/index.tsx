import { createFileRoute } from "@tanstack/react-router";
import { Flame, LayoutDashboard, BarChart4, Calendar as CalendarIcon } from "lucide-react";
import { PomodoroTimer } from "@/components/PomodoroTimer";
import { PdfViewer } from "@/components/PdfViewer";
import { AiChat } from "@/components/AiChat";
import { PdfProvider } from "@/components/PdfContext";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { StatisticsWidget } from "@/components/StatisticsWidget";
import { StudyPlanWidget } from "@/components/StudyPlanWidget";
import { ClockDate } from "@/components/ClockDate";
import { HeaderNotifications } from "@/components/HeaderNotifications";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Ember — Focus, Read, Ask" },
      {
        name: "description",
        content:
          "Ember is a personal study workspace: a Pomodoro timer with saved objectives, a built-in PDF reader, and a local AI tutor that reads your PDFs.",
      },
    ],
  }),
});

function Index() {
  const [activeTab, setActiveTab] = useState<'workspace' | 'stats' | 'plan'>('workspace');

  return (
    <PdfProvider>
      <div className="flex h-screen w-screen flex-col overflow-hidden bg-background">
        <header className="flex items-center justify-between border-b border-border/60 bg-card/40 backdrop-blur px-5 py-2.5 shrink-0 z-20">
          <div className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-primary" style={{ filter: "drop-shadow(0 0 6px var(--ember-glow))" }} />
            <h1 className="text-lg font-bold tracking-tight ember-gradient-text">Ember</h1>
            <span className="text-xs text-muted-foreground hidden sm:inline">
              · focus, read, ask
            </span>
          </div>
          <div className="flex items-center gap-3">
            <HeaderNotifications />
            <div className="w-px h-4 bg-border/60 hidden sm:block"></div>
            <p className="text-xs text-muted-foreground hidden sm:block">Local · Private · Yours</p>
          </div>
        </header>

        <div className="flex items-center justify-center gap-1 sm:gap-2 border-b bg-card/60 backdrop-blur p-2 shrink-0 z-10 overflow-x-auto">
          <Button variant={activeTab === 'workspace' ? 'secondary' : 'ghost'} size="sm" onClick={() => setActiveTab('workspace')} className="gap-2 rounded-full whitespace-nowrap">
            <LayoutDashboard className="w-4 h-4" /> Workspace
          </Button>
          <div className="w-px h-6 bg-border mx-1"></div>
          <Button variant={activeTab === 'stats' ? 'secondary' : 'ghost'} size="sm" onClick={() => setActiveTab('stats')} className="gap-2 rounded-full whitespace-nowrap overflow-hidden">
            <BarChart4 className={`w-4 h-4 ${activeTab === 'stats' ? 'text-primary' : 'text-muted-foreground'}`} /> 
            <span className={activeTab === 'stats' ? 'font-semibold' : ''}>Statistics</span>
          </Button>
          <Button variant={activeTab === 'plan' ? 'secondary' : 'ghost'} size="sm" onClick={() => setActiveTab('plan')} className="gap-2 rounded-full whitespace-nowrap overflow-hidden">
            <CalendarIcon className={`w-4 h-4 ${activeTab === 'plan' ? 'text-primary' : 'text-muted-foreground'}`} /> 
            <span className={activeTab === 'plan' ? 'font-semibold' : ''}>Study Plan</span>
          </Button>
        </div>

        <div className="flex-1 min-h-0 relative">
          <div style={{ display: activeTab === 'workspace' ? 'grid' : 'none', height: '100%', width: '100%' }} className="grid-cols-1 md:grid-cols-2 overflow-hidden">
            <section className="border-r border-border/60 flex flex-col gap-3 p-3 overflow-y-auto min-h-0 relative">
              <div className="shrink-0 flex flex-col min-h-[450px]" style={{ height: "50vh" }}>
                <PomodoroTimer />
              </div>
              <div className="shrink-0 flex flex-col min-h-[550px]" style={{ height: "60vh" }}>
                <AiChat />
              </div>
            </section>
            <section className="min-h-0 relative">
              <PdfViewer />
              <div className="absolute top-0 right-0 z-10">
                <ClockDate />
              </div>
            </section>
          </div>

          <StatisticsWidget visible={activeTab === 'stats'} />
          <StudyPlanWidget visible={activeTab === 'plan'} />
        </div>
      </div>
    </PdfProvider>
  );
}
