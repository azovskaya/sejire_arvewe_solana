/**
 * PDF / export copy. Keep keyed messages so UI can switch locales later.
 *
 * Terminology (Kazakh tradition):
 * - Шежіре — the genealogy document / lineage record (correct wall-poster title).
 * - Жеті ата — the duty to know seven paternal ancestors (concept, not the document title).
 * Generation names from self upward follow common printed шежіре usage.
 */
export type PdfLocale = "ru" | "kk" | "en";

type PdfMessages = {
  classicTitle: string;
  /** Main poster title — always «Шежіре» for male-line charts */
  shezhireTitle: string;
  /** Optional quiet line under title; empty = omit */
  shezhireSubtitle: string;
  /** Labels by distance from focus: 0 = self, 1 = father, … (supports 13+) */
  jetiAtaLabel: (distanceFromFocus: number) => string;
  clanLabel: string;
  zhuzLabel: string;
  colNumber: string;
  colGeneration: string;
  colName: string;
  colDates: string;
  noPeople: string;
  noMaleLine: string;
  exportedWith: string;
  ancestorsOf: (name: string) => string;
  pageOf: (page: number, total: number) => string;
  kneeRange: (from: number, to: number) => string;
};

/**
 * From the living person upward (өзі → … → түп ата).
 * Beyond the seventh: numbered ата (8-ші ата …).
 */
const FROM_SELF = [
  "Өзі",
  "Әке",
  "Ата",
  "Арғы ата",
  "Баба",
  "Тек ата",
  "Түп ата",
] as const;

const ru: PdfMessages = {
  classicTitle: "Генеалогическое древо",
  shezhireTitle: "Шежіре",
  shezhireSubtitle: "",
  jetiAtaLabel: (d) => {
    const i = Math.max(0, d);
    if (i < FROM_SELF.length) return FROM_SELF[i];
    return `${i + 1}-ші ата`;
  },
  clanLabel: "Ру",
  zhuzLabel: "Жүз",
  colNumber: "№",
  colGeneration: "Ата",
  colName: "Есімі",
  colDates: "Жылдары",
  noPeople: "В древе нет людей для экспорта",
  noMaleLine: "Нет мужской линии для шежіре (нужен отец или выбран мужчина)",
  exportedWith: "SEJIRE",
  ancestorsOf: (name) => `Предки: ${name}`,
  pageOf: (page, total) => `лист ${page} / ${total}`,
  kneeRange: (from, to) => (from === to ? `колено ${from}` : `колена ${from}–${to}`),
};

const kk: PdfMessages = {
  ...ru,
  classicTitle: "Шежіре",
  noPeople: "Шежіреде экспортқа адам жоқ",
  noMaleLine: "Шежіре үшін ер жолы жоқ (әке керек немесе ер адамды таңдаңыз)",
  ancestorsOf: (name) => `Ата-баба: ${name}`,
  pageOf: (page, total) => `бет ${page} / ${total}`,
  kneeRange: (from, to) => (from === to ? `${from}-ата` : `${from}–${to}-ата`),
};

const en: PdfMessages = {
  ...ru,
  classicTitle: "Family tree",
  noPeople: "No people in the tree to export",
  noMaleLine: "No male line for shezhire (need a father, or select a man)",
  ancestorsOf: (name) => `Ancestors: ${name}`,
  pageOf: (page, total) => `sheet ${page} / ${total}`,
  kneeRange: (from, to) => (from === to ? `generation ${from}` : `generations ${from}–${to}`),
};

const catalogs: Record<PdfLocale, PdfMessages> = { ru, kk, en };

export function pdfT(locale: PdfLocale = "ru"): PdfMessages {
  return catalogs[locale] ?? catalogs.ru;
}

/** Soft cap for male-line posters (7 classic жеті ата, up to 13 for deep lines). */
export const SHEZHIRE_MAX_GENERATIONS = 13;
