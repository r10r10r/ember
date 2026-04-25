// Lazy-loaded pdf.js helper for extracting text (with OCR fallback signal)
import * as pdfjsLib from "pdfjs-dist";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

export type PageContent = {
  page: number;
  text: string;
  /** base64 PNG data URL, only set when text was empty (likely scanned) */
  imageDataUrl?: string;
};

export async function extractPdfContent(
  file: File,
  opts: { maxPages?: number; ocrScale?: number } = {},
): Promise<PageContent[]> {
  const { maxPages = 40, ocrScale = 1.5 } = opts;
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  const pages: PageContent[] = [];
  const total = Math.min(pdf.numPages, maxPages);

  for (let i = 1; i <= total; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const text = textContent.items
      .map((it: any) => ("str" in it ? it.str : ""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    if (text.length > 20) {
      pages.push({ page: i, text });
    } else {
      // Likely scanned — render to image for OCR by the model
      const viewport = page.getViewport({ scale: ocrScale });
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext("2d")!;
      await page.render({ canvas, canvasContext: ctx, viewport } as any).promise;
      pages.push({
        page: i,
        text: "",
        imageDataUrl: canvas.toDataURL("image/png"),
      });
    }
  }
  return pages;
}

export function pagesToContext(pages: PageContent[], maxChars = 60_000): string {
  let out = "";
  for (const p of pages) {
    if (!p.text) continue;
    const chunk = `\n\n--- Page ${p.page} ---\n${p.text}`;
    if (out.length + chunk.length > maxChars) break;
    out += chunk;
  }
  return out.trim();
}
