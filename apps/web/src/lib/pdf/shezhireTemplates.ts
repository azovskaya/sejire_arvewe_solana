export type ShezhireTemplateId = "manuscript" | "registry" | "cascade";

export type ShezhireTemplateInfo = {
  id: ShezhireTemplateId;
  title: string;
  blurb: string;
  /** Shown in picker — page orientation */
  format: string;
};

/** Three distinct presentation styles for жеті ата / deep male line. */
export const SHEZHIRE_TEMPLATES: ShezhireTemplateInfo[] = [
  {
    id: "manuscript",
    title: "Қолжазба",
    blurb: "Пергамент, орнамент, вертикальный свиток",
    format: "A4 книжный",
  },
  {
    id: "registry",
    title: "Тізім",
    blurb: "Древний киіз-өрнек: қосқар мүйіз по всей рамке",
    format: "A4 книжный",
  },
  {
    id: "cascade",
    title: "Баспалдақ",
    blurb: "Горизонтальная линия предков — для широкой рамы",
    format: "A4 альбомный",
  },
];
