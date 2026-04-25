import { createFileRoute } from "@tanstack/react-router";
import { Flame, Search, MonitorPlay, MessageCircle, LayoutDashboard } from "lucide-react";
import { PomodoroTimer } from "@/components/PomodoroTimer";
import { PdfViewer } from "@/components/PdfViewer";
import { AiChat } from "@/components/AiChat";
import { PdfProvider } from "@/components/PdfContext";
import { useState } from "react";
import { Button } from "@/components/ui/button";

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

function YouTubeWidget({ visible }: { visible: boolean }) {
  const [query, setQuery] = useState("");
  const [embedUrl, setEmbedUrl] = useState("");
  const handleLoad = () => {
    if (query.includes("youtube.com/watch?v=")) {
       const id = new URL(query).searchParams.get("v");
       setEmbedUrl(`https://www.youtube-nocookie.com/embed/${id}`);
    } else if (query.includes("youtu.be/")) {
       const id = query.split("youtu.be/")[1]?.split("?")[0];
       setEmbedUrl(`https://www.youtube-nocookie.com/embed/${id}`);
    } else {
       setEmbedUrl(`https://www.youtube-nocookie.com/embed?listType=search&list=${encodeURIComponent(query)}`);
    }
  };

  return (
    <div className="flex-col h-full w-full items-center p-4 sm:p-8 gap-4 overflow-y-auto" style={{ display: visible ? 'flex' : 'none' }}>
      <h2 className="text-3xl font-bold flex items-center gap-2"><MonitorPlay className="h-8 w-8 text-red-500" /> YouTube embedded</h2>
      <p className="text-muted-foreground text-sm max-w-xl text-center mb-2">Search for a video topic, or paste a direct YouTube link to embed it instantly while you study.</p>
      <div className="flex gap-2 w-full max-w-2xl">
        <input 
           className="flex-1 rounded-full border bg-background px-6 py-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-ring" 
           placeholder="Search or paste link..." 
           value={query} onChange={e=>setQuery(e.target.value)} 
           onKeyDown={e => { if (e.key === 'Enter') handleLoad(); }}
        />
        <Button onClick={handleLoad} className="rounded-full px-6 py-3 h-auto">Embed</Button>
      </div>
      <div className="flex-1 w-full max-w-5xl rounded-xl overflow-hidden border shadow-sm bg-black/5 flex items-center justify-center min-h-[400px]">
        {embedUrl ? (
          <iframe src={embedUrl} className="w-full h-full" allowFullScreen></iframe>
        ) : (
          <div className="text-muted-foreground">Load a video to begin watching.</div>
        )}
      </div>
    </div>
  )
}

function GoogleWidget({ visible }: { visible: boolean }) {
  const [query, setQuery] = useState("");
  const handleSearch = () => {
    if(query.trim()) window.open(`https://www.google.com/search?q=${encodeURIComponent(query)}`, '_blank');
  };
  return (
    <div className="flex-col h-full w-full items-center justify-center p-8 gap-6" style={{ display: visible ? 'flex' : 'none' }}>
      <div className="text-center space-y-4">
        <div className="flex justify-center mb-4"><Search className="h-16 w-16 text-primary" /></div>
        <h2 className="text-5xl font-bold text-primary tracking-tight">Google</h2>
        <p className="text-muted-foreground">Search opens safely in a new tab to bypass security restrictions.</p>
      </div>
      <div className="flex gap-2 w-full max-w-xl mt-4">
        <input 
           className="flex-1 rounded-full border shadow-sm bg-background px-6 py-4 text-lg focus:outline-none focus:ring-2 focus:ring-ring" 
           placeholder="Search the web..." 
           value={query} onChange={e=>setQuery(e.target.value)} 
           onKeyDown={e => { if (e.key === 'Enter') handleSearch(); }}
        />
      </div>
    </div>
  )
}

function MessengerWidget({ visible }: { visible: boolean }) {
  return (
    <div className="flex-col h-full w-full items-center justify-center p-8 gap-8" style={{ display: visible ? 'flex' : 'none' }}>
      <div className="text-center space-y-4">
        <div className="flex justify-center mb-2"><MessageCircle className="h-20 w-20 text-blue-500 drop-shadow-md" /></div>
        <h2 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">Messenger</h2>
        <p className="text-muted-foreground max-w-md mx-auto">Stay connected while you study. Opens in a sleek mini-window so it never takes up your full screen.</p>
      </div>
      <Button 
         className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-8 py-6 text-lg shadow-lg hover:shadow-xl transition-all"
         onClick={() => window.open('https://messenger.com', 'Messenger', 'width=450,height=650')}
      >
        Open Messenger Mini-Window
      </Button>
    </div>
  )
}

function Index() {
  const [activeTab, setActiveTab] = useState<'workspace' | 'search' | 'videos' | 'messenger'>('workspace');

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
          <p className="text-xs text-muted-foreground">Local · Private · Yours</p>
        </header>

        <div className="flex items-center justify-center gap-1 sm:gap-2 border-b bg-card/60 backdrop-blur p-2 shrink-0 z-10 overflow-x-auto">
          <Button variant={activeTab === 'workspace' ? 'secondary' : 'ghost'} size="sm" onClick={() => setActiveTab('workspace')} className="gap-2 rounded-full whitespace-nowrap">
            <LayoutDashboard className="w-4 h-4" /> Workspace
          </Button>
          <div className="w-px h-6 bg-border mx-1"></div>
          <Button variant={activeTab === 'videos' ? 'secondary' : 'ghost'} size="sm" onClick={() => setActiveTab('videos')} className="gap-2 rounded-full whitespace-nowrap overflow-hidden">
            <MonitorPlay className={`w-4 h-4 ${activeTab === 'videos' ? 'text-red-500' : 'text-muted-foreground'}`} /> 
            <span className={activeTab === 'videos' ? 'font-semibold' : ''}>YouTube</span>
          </Button>
          <Button variant={activeTab === 'search' ? 'secondary' : 'ghost'} size="sm" onClick={() => setActiveTab('search')} className="gap-2 rounded-full whitespace-nowrap overflow-hidden">
            <Search className={`w-4 h-4 ${activeTab === 'search' ? 'text-primary' : 'text-muted-foreground'}`} /> 
            <span className={activeTab === 'search' ? 'font-semibold' : ''}>Google</span>
          </Button>
          <Button variant={activeTab === 'messenger' ? 'secondary' : 'ghost'} size="sm" onClick={() => setActiveTab('messenger')} className="gap-2 rounded-full whitespace-nowrap overflow-hidden">
            <MessageCircle className={`w-4 h-4 ${activeTab === 'messenger' ? 'text-blue-500' : 'text-muted-foreground'}`} /> 
            <span className={activeTab === 'messenger' ? 'font-semibold' : ''}>Messenger</span>
          </Button>
        </div>

        <div className="flex-1 min-h-0 relative">
          <div style={{ display: activeTab === 'workspace' ? 'grid' : 'none', height: '100%', width: '100%' }} className="grid-cols-1 md:grid-cols-2 overflow-hidden">
            <section className="border-r border-border/60 flex flex-col gap-3 p-3 overflow-y-auto min-h-0">
              <div className="shrink-0 flex flex-col min-h-[450px]" style={{ height: "50vh" }}>
                <PomodoroTimer />
              </div>
              <div className="shrink-0 flex flex-col min-h-[550px]" style={{ height: "60vh" }}>
                <AiChat />
              </div>
            </section>
            <section className="min-h-0">
              <PdfViewer />
            </section>
          </div>

          <YouTubeWidget visible={activeTab === 'videos'} />
          <GoogleWidget visible={activeTab === 'search'} />
          <MessengerWidget visible={activeTab === 'messenger'} />
        </div>
      </div>
    </PdfProvider>
  );
}
