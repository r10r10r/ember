import { useState, useEffect } from "react";
import { Gamepad2, Info, AlertTriangle, Play, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTimer } from "./TimerContext";

const GAMES = [
  {
    id: "tetris",
    name: "Tetris",
    url: "https://binary01.github.io/Tetris/",
    description: "Classic block-stacking puzzle game. (English version)",
  },
  {
    id: "2048",
    name: "2048",
    url: "https://git.io/2048",
    description: "Join the numbers and get to the 2048 tile!",
  },
  {
    id: "pacman",
    name: "Pac-Man",
    url: "https://macek.github.io/google_pacman/",
    description: "Classic arcade game. Eat all the dots!",
  },
  {
    id: "flappy",
    name: "Flappy Bird",
    url: "https://hglabor.github.io/FlappyBird/",
    description: "Navigate through the pipes without crashing.",
  },
  {
    id: "minesweeper",
    name: "Minesweeper",
    url: "https://minesweeper.online/light/",
    description: "Clear the board without hitting any mines.",
  },
  {
    id: "snake",
    name: "Snake",
    url: "https://www.google.com/logos/2010/pacman10-i.html", // Google pacman is safer, or a snake clone
    description: "Classic snake game.",
  },
];

export function GamesWidget({ visible }: { visible: boolean }) {
  const [activeGame, setActiveGame] = useState(GAMES[0]);
  const { mode, secondsLeft, addRestTime, setMode, running } = useTimer();
  const [showPopup, setShowPopup] = useState(false);

  // Monitor break end
  useEffect(() => {
    if (visible && (mode === "short" || mode === "long") && secondsLeft === 0 && !running) {
      setShowPopup(true);
    }
  }, [secondsLeft, mode, visible, running]);

  if (!visible) return null;

  return (
    <div className="flex flex-col h-full w-full p-4 sm:p-8 gap-6 overflow-hidden bg-background relative">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Gamepad2 className="h-8 w-8 text-primary" />
          <h2 className="text-3xl font-bold tracking-tight">Rest Time Games</h2>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
          {GAMES.map((game) => (
            <Button
              key={game.id}
              variant={activeGame.id === game.id ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setActiveGame(game)}
              className="rounded-full whitespace-nowrap"
            >
              {game.name}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex gap-6 min-h-0">
        <div className="flex-1 rounded-2xl overflow-hidden border bg-black shadow-2xl relative">
          <iframe
            src={activeGame.url}
            className="w-full h-full border-0"
            title={activeGame.name}
            allow="autoplay; fullscreen"
          />
        </div>
        
        <div className="w-64 shrink-0 hidden lg:flex flex-col gap-4">
          <Card className="bg-card/40 border-primary/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Info className="h-4 w-4" /> About {activeGame.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {activeGame.description}
              </p>
            </CardContent>
          </Card>
          
          <div className="flex-1 flex flex-col justify-end">
             <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 flex flex-col gap-2">
                <p className="text-[10px] uppercase font-bold text-primary tracking-widest">Status</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">{mode === 'focus' ? 'Focusing...' : 'On Break'}</span>
                  <span className="font-mono text-xs text-primary">
                    {Math.floor(secondsLeft / 60)}:{(secondsLeft % 60).toString().padStart(2, '0')}
                  </span>
                </div>
             </div>
          </div>
        </div>
      </div>

      {/* Break End Popup Overlay */}
      {showPopup && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md animate-in fade-in duration-300">
          <Card className="w-[400px] border-primary/20 shadow-2xl scale-in-center">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <CardTitle className="text-2xl font-bold">Break's Over!</CardTitle>
              <p className="text-sm text-muted-foreground mt-2">
                Your rest time has ended. Ready to get back to work?
              </p>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <Button 
                onClick={() => {
                  setShowPopup(false);
                  setMode('focus');
                }}
                className="w-full gap-2 h-12 text-lg"
              >
                <Play className="h-5 w-5" /> Back to Study
              </Button>
              <Button 
                variant="outline"
                onClick={() => {
                  setShowPopup(false);
                  addRestTime(5);
                }}
                className="w-full gap-2 h-12 text-lg"
              >
                <PlusCircle className="h-5 w-5" /> +5 Min Rest
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
