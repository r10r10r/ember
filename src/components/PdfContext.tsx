import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { extractPdfContent, type PageContent } from "@/lib/pdf";

type PdfState = {
  file: File | null;
  url: string | null;
  pages: PageContent[];
  parsing: boolean;
  error: string | null;
  loadFile: (f: File) => Promise<void>;
  clear: () => void;
};

const Ctx = createContext<PdfState | null>(null);

export function PdfProvider({ children }: { children: ReactNode }) {
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [pages, setPages] = useState<PageContent[]>([]);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFile = useCallback(async (f: File) => {
    if (f.type !== "application/pdf") {
      setError("Please choose a PDF file.");
      return;
    }
    setError(null);
    setFile(f);
    setUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(f);
    });
    setParsing(true);
    setPages([]);
    try {
      const p = await extractPdfContent(f);
      setPages(p);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to read PDF");
    } finally {
      setParsing(false);
    }
  }, []);

  const clear = useCallback(() => {
    setUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setFile(null);
    setPages([]);
    setError(null);
  }, []);

  return (
    <Ctx.Provider value={{ file, url, pages, parsing, error, loadFile, clear }}>
      {children}
    </Ctx.Provider>
  );
}

export function usePdf() {
  const v = useContext(Ctx);
  if (!v) throw new Error("usePdf must be used inside PdfProvider");
  return v;
}
