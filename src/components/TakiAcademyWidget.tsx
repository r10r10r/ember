import { GraduationCap } from "lucide-react";

export function TakiAcademyWidget({ visible }: { visible: boolean }) {
  if (!visible) return null;

  return (
    <div className="flex flex-col h-full w-full p-4 sm:p-8 gap-6 overflow-hidden bg-background relative">
      <div className="flex items-center gap-3 shrink-0">
        <GraduationCap className="h-8 w-8 text-primary" />
        <h2 className="text-3xl font-bold tracking-tight">TakiAcademy</h2>
      </div>

      <div className="flex-1 rounded-2xl overflow-hidden border bg-background shadow-2xl relative min-h-0">
        <iframe
          src="https://app.takiacademy.com"
          className="w-full h-full border-0"
          title="TakiAcademy"
          allow="autoplay; fullscreen"
        />
      </div>
    </div>
  );
}
