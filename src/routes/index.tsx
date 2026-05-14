import { createFileRoute } from "@tanstack/react-router";
import { Flame, LayoutDashboard, BarChart4, Calendar as CalendarIcon, Gamepad2, Lock, GraduationCap } from "lucide-react";
import { PomodoroTimer } from "@/components/PomodoroTimer";
import { PdfViewer } from "@/components/PdfViewer";
import { AiChat } from "@/components/AiChat";
import { PdfProvider } from "@/components/PdfContext";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { StatisticsWidget } from "@/components/StatisticsWidget";
import { StudyPlanWidget } from "@/components/StudyPlanWidget";
import { GamesWidget } from "@/components/GamesWidget";
import { TakiAcademyWidget } from "@/components/TakiAcademyWidget";
import { ClockDate } from "@/components/ClockDate";
import { ThemeToggle } from "@/components/ThemeToggle";
import { HeaderNotifications } from "@/components/HeaderNotifications";
import { TimerProvider, useTimer } from "@/components/TimerContext";
import { toast } from "sonner";

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

function MainLayout() {
  const [activeTab, setActiveTab] = useState<'workspace' | 'stats' | 'plan' | 'games' | 'taki'>('workspace');
  const { mode } = useTimer();

  const handleTabChange = (tab: 'workspace' | 'stats' | 'plan' | 'games' | 'taki') => {
    if (tab === 'games' && mode === 'focus') {
      toast.error("Games are locked!", {
        description: "Finish your focus session first. Return to focusing!",
        icon: <Lock className="h-4 w-4" />,
      });
      return;
    }
    setActiveTab(tab);
  };

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-background">
      <header className="flex items-center justify-between border-b border-border/60 bg-card/40 backdrop-blur px-5 py-2 shrink-0 z-20">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-primary" style={{ filter: "drop-shadow(0 0 6px var(--ember-glow))" }} />
            <h1 className="text-lg font-bold tracking-tight ember-gradient-text hidden sm:block">Ember</h1>
          </div>
          
          <nav className="flex items-center bg-muted/20 rounded-full p-1 border border-border/40">
            <Button 
              variant={activeTab === 'workspace' ? 'secondary' : 'ghost'} 
              size="sm" 
              onClick={() => handleTabChange('workspace')} 
              className="h-8 gap-2 rounded-full text-xs"
            >
              <LayoutDashboard className="w-3.5 h-3.5" /> <span className="hidden md:inline">Workspace</span>
            </Button>
            <Button 
              variant={activeTab === 'stats' ? 'secondary' : 'ghost'} 
              size="sm" 
              onClick={() => handleTabChange('stats')} 
              className="h-8 gap-2 rounded-full text-xs"
            >
              <BarChart4 className="w-3.5 h-3.5" /> <span className="hidden md:inline">Stats</span>
            </Button>
            <Button 
              variant={activeTab === 'plan' ? 'secondary' : 'ghost'} 
              size="sm" 
              onClick={() => handleTabChange('plan')} 
              className="h-8 gap-2 rounded-full text-xs"
            >
              <CalendarIcon className="w-3.5 h-3.5" /> <span className="hidden md:inline">Plan</span>
            </Button>
            <Button 
              variant={activeTab === 'games' ? 'secondary' : 'ghost'} 
              size="sm" 
              onClick={() => handleTabChange('games')} 
              className="h-8 gap-2 rounded-full text-xs"
            >
              <Gamepad2 className="w-3.5 h-3.5" /> <span className="hidden md:inline">Games</span>
              {mode === 'focus' && <Lock className="w-3 h-3 text-muted-foreground/50 ml-0.5" />}
            </Button>
            <Button 
              variant={activeTab === 'taki' ? 'secondary' : 'ghost'} 
              size="sm" 
              onClick={() => handleTabChange('taki')} 
              className="h-8 gap-2 rounded-full text-xs"
            >
              <GraduationCap className="w-3.5 h-3.5" /> <span className="hidden md:inline">TakiAcademy</span>
            </Button>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <div className="w-px h-4 bg-border/60"></div>
          <div className="hidden lg:block">
            <ClockDate />
          </div>
          <div className="w-px h-4 bg-border/60 hidden lg:block"></div>
          <HeaderNotifications />
          <div className="w-px h-4 bg-border/60 hidden sm:block"></div>
          <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground hidden xl:block">
            {mode === 'focus' ? 'Focus Mode' : 'Rest Mode'}
          </p>
        </div>
      </header>

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
          </section>
        </div>

        <StatisticsWidget visible={activeTab === 'stats'} />
        <StudyPlanWidget visible={activeTab === 'plan'} />
        <GamesWidget visible={activeTab === 'games'} />
        <TakiAcademyWidget visible={activeTab === 'taki'} />
      </div>
    </div>
  );
}

function Index() {
  return (
    <PdfProvider>
      <TimerProvider>
        <MainLayout />
      </TimerProvider>
    </PdfProvider>
  );
}
