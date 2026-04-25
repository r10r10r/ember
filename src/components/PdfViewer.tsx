import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { FileText, Upload, X, Loader2 } from "lucide-react";
import { usePdf } from "./PdfContext";

export function PdfViewer() {
  const { file, url, parsing, pages, loadFile, clear, error } = usePdf();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onFile = (f: File | undefined) => {
    if (f) void loadFile(f);
  };

  const close = () => {
    clear();
    if (inputRef.current) inputRef.current.value = "";
  };

  const scannedCount = pages.filter((p) => p.imageDataUrl).length;
  const textCount = pages.filter((p) => p.text).length;

  return (
    <div className="flex h-full flex-col bg-background/40">
      <div className="flex items-center justify-between border-b bg-card/60 backdrop-blur px-4 py-3">
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="h-4 w-4 text-primary shrink-0" />
          <span className="text-sm font-medium truncate">
            {file?.name || "PDF Reader"}
          </span>
          {parsing && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground ml-2">
              <Loader2 className="h-3 w-3 animate-spin" /> indexing…
            </span>
          )}
          {!parsing && pages.length > 0 && (
            <span className="text-xs text-muted-foreground ml-2 hidden lg:inline">
              {pages.length} pages · {textCount} text · {scannedCount} scanned
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => onFile(e.target.files?.[0])}
          />
          <Button size="sm" variant="outline" onClick={() => inputRef.current?.click()}>
            <Upload className="mr-2 h-3.5 w-3.5" />
            {url ? "Change" : "Open PDF"}
          </Button>
          {url && (
            <Button size="icon" variant="ghost" onClick={close}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <div
        className="flex-1 relative"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          onFile(e.dataTransfer.files?.[0]);
        }}
      >
        {url ? (
          <iframe
            src={url}
            title={file?.name ?? "pdf"}
            className="absolute inset-0 h-full w-full border-0 bg-white"
          />
        ) : (
          <button
            onClick={() => inputRef.current?.click()}
            className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-foreground hover:text-foreground hover:bg-accent/30 transition-colors"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-primary/40">
              <Upload className="h-6 w-6 text-primary" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium">Open a PDF</p>
              <p className="text-xs">Click or drop a file here</p>
            </div>
          </button>
        )}
        {error && (
          <div className="absolute bottom-3 left-3 right-3 rounded-md bg-destructive/90 px-3 py-2 text-xs text-destructive-foreground">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
