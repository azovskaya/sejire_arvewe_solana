import type { jsPDF } from "jspdf";
import notoRegularUrl from "../../assets/fonts/NotoSans-Regular.ttf?url";
import notoBoldUrl from "../../assets/fonts/NotoSans-Bold.ttf?url";

export const PDF_FONT = "NotoSans";

let cachedRegular: string | null = null;
let cachedBold: string | null = null;

function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunk = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

async function fetchAsBase64(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Не удалось загрузить шрифт PDF (${res.status})`);
  return bufferToBase64(await res.arrayBuffer());
}

async function loadFontBase64() {
  if (cachedRegular && cachedBold) return;
  const [regular, bold] = await Promise.all([
    fetchAsBase64(notoRegularUrl),
    fetchAsBase64(notoBoldUrl),
  ]);
  cachedRegular = regular;
  cachedBold = bold;
}

/** Prime caches from Node (QA export) so the browser bundle never imports `fs`. */
export function primePdfFonts(regularBase64: string, boldBase64: string) {
  cachedRegular = regularBase64;
  cachedBold = boldBase64;
}

/** Embed Cyrillic/Kazakh-capable Noto Sans into this jsPDF document. */
export async function ensurePdfFont(doc: jsPDF): Promise<void> {
  await loadFontBase64();
  doc.addFileToVFS("NotoSans-Regular.ttf", cachedRegular!);
  doc.addFileToVFS("NotoSans-Bold.ttf", cachedBold!);
  doc.addFont("NotoSans-Regular.ttf", PDF_FONT, "normal");
  doc.addFont("NotoSans-Bold.ttf", PDF_FONT, "bold");
  doc.setFont(PDF_FONT, "normal");
}

export function setPdfFont(doc: jsPDF, style: "normal" | "bold" = "normal") {
  doc.setFont(PDF_FONT, style);
}
