import { useState } from "react";
import { Gamepad2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const GAMES = [
  {
    id: "2048",
    name: "2048",
    url: "https://play2048.co/",
    description: "Join the numbers and get to the 2048 tile!",
  },
  {
    id: "tetris",
    name: "Tetris",
    url: "https://chvin.github.io/react-tetris/",
    description: "Classic block-stacking puzzle game.",
  },
  {
    id: "sudoku",
    name: "Sudoku",
    url: "https://sudoku.com/embed",
    description: "Train your brain with number puzzles.",
  },
];

export function GamesWidget({ visible }: { visible: boolean }) {
  const [activeGame, setActiveGame] = useState(GAMES[0]);

  if (!visible) return null;

  return (
    <div className="flex flex-col h-full w-full p-4 sm:p-8 gap-6 overflow-hidden bg-background">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Gamepad2 className="h-8 w-8 text-primary" />
          <h2 className="text-3xl font-bold tracking-tight">Rest Time Games</h2>
        </div>
        <div className="flex gap-2">
          {GAMES.map((game) => (
            <Button
              key={game.id}
              variant={activeGame.id === game.id ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setActiveGame(game)}
              className="rounded-full"
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
              <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/10">
                <p className="text-[10px] uppercase font-bold text-primary tracking-widest mb-1">Tip</p>
                <p className="text-[10px] text-muted-foreground">
                  Use your break wisely! A quick game can help refresh your mind before the next focus session.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
