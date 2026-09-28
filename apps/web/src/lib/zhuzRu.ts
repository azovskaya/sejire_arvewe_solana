/** Kazakh shezhire affiliation: жүз (union) + ру (clan). Optional for all trees. */

export type ZhuzId = "uly" | "orta" | "kishi" | "other";

export type ZhuzOption = {
  id: ZhuzId;
  /** Short UI label */
  label: string;
  /** Full name for PDF / display */
  fullLabel: string;
};

export const ZHUZ_OPTIONS: ZhuzOption[] = [
  { id: "uly", label: "Ұлы жүз", fullLabel: "Ұлы жүз (Старший)" },
  { id: "orta", label: "Орта жүз", fullLabel: "Орта жүз (Средний)" },
  { id: "kishi", label: "Кіші жүз", fullLabel: "Кіші жүз (Младший)" },
  { id: "other", label: "Вне жузов", fullLabel: "Вне жузов" },
];

/** Well-known ру / объединения — suggestions only; free text always allowed. */
export const RU_BY_ZHUZ: Record<ZhuzId, string[]> = {
  uly: [
    "Дулат",
    "Жалайыр",
    "Албан",
    "Суан",
    "Шапырашты",
    "Ошакты",
    "Ысты",
    "Сиргели",
    "Қаңлы",
    "Шанышқылы",
    "Сарыүйсін",
  ],
  orta: ["Арғын", "Найман", "Қыпшақ", "Керей", "Уақ", "Қоңырат"],
  kishi: [
    "Адай",
    "Беріш",
    "Жаппас",
    "Алимулы",
    "Байұлы",
    "Жетіру",
    "Шөмекей",
    "Қаракесек",
    "Табын",
    "Тама",
    "Кердері",
  ],
  other: ["Төре", "Қожа", "Төлеңгіт", "Сұнақ", "Ноғай-қазақ"],
};

export function isZhuzId(v: unknown): v is ZhuzId {
  return v === "uly" || v === "orta" || v === "kishi" || v === "other";
}

export function zhuzFullLabel(id: ZhuzId | null | undefined): string | null {
  if (!id) return null;
  return ZHUZ_OPTIONS.find((z) => z.id === id)?.fullLabel ?? null;
}

export function ruSuggestions(zhuz: ZhuzId | null | undefined): string[] {
  if (!zhuz) {
    return [...new Set(Object.values(RU_BY_ZHUZ).flat())].sort((a, b) => a.localeCompare(b, "kk"));
  }
  return RU_BY_ZHUZ[zhuz] ?? [];
}

/** Quiet one-line summary for topbar; empty when nothing set. */
export function formatShezhireAffiliation(
  zhuz: ZhuzId | null | undefined,
  clanName: string | null | undefined
): string {
  const z = zhuzFullLabel(zhuz);
  const ru = (clanName || "").trim();
  if (z && ru) return `${z} · ${ru}`;
  if (ru) return ru;
  if (z) return z;
  return "";
}
