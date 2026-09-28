/**
 * Build SEJIRE investor deck as PowerPoint (.pptx).
 * Run: node presentation/build-pptx.mjs
 */
import PptxGenJS from "pptxgenjs";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = join(__dirname, "SEJIRE-investor-deck.pptx");

const C = {
  ink: "141210",
  bg: "F3F1EC",
  elev: "EBE7DF",
  orange: "FF6700",
  white: "FFFFFF",
  muted: "5A554E",
  onDark: "F7F4EE",
  onDarkMuted: "B8B0A4",
  inkSoft: "1C1A17",
};

const pptx = new PptxGenJS();
pptx.defineLayout({ name: "WIDE", width: 13.333, height: 7.5 });
pptx.layout = "WIDE";
pptx.author = "SEJIRE";
pptx.title = "SEJIRE — Investor Deck";
pptx.subject = "Сначала бесплатно. Потом — навсегда.";

function brandChrome(slide, opts = {}) {
  const dark = opts.dark;
  const orangeBg = opts.orange;
  slide.addShape(pptx.shapes.OVAL, {
    x: 0.55,
    y: 0.32,
    w: 0.18,
    h: 0.18,
    fill: { color: C.orange },
    line: { color: C.orange },
  });
  slide.addText("SEJIRE", {
    x: 0.85,
    y: 0.26,
    w: 3,
    h: 0.32,
    fontFace: "Arial",
    fontSize: 11,
    bold: true,
    color: dark || orangeBg ? C.white : C.ink,
    charSpacing: 6,
  });
  slide.addText("Investor deck · 2026", {
    x: 9.2,
    y: 0.28,
    w: 3.6,
    h: 0.28,
    fontFace: "Arial",
    fontSize: 10,
    color: orangeBg ? "FFE8D6" : dark ? C.onDarkMuted : C.muted,
    align: "right",
  });
}

function eyebrow(slide, text, y, opts = {}) {
  slide.addText(text, {
    x: 0.7,
    y,
    w: 12,
    h: 0.35,
    fontFace: "Arial",
    fontSize: 11,
    bold: true,
    color: opts.onDark ? "FFFFFF" : C.orange,
    charSpacing: 3,
  });
}

// 01 Title
{
  const s = pptx.addSlide();
  s.addShape(pptx.shapes.RECTANGLE, {
    x: 0, y: 0, w: 13.333, h: 7.5,
    fill: { color: C.inkSoft },
  });
  brandChrome(s, { dark: true });
  s.addText("SEJIRE", {
    x: 0.7, y: 1.6, w: 12, h: 1.1,
    fontFace: "Arial", fontSize: 60, bold: true, color: C.white, charSpacing: -1,
  });
  s.addText("Сначала бесплатно.", {
    x: 0.7, y: 2.85, w: 11, h: 0.55,
    fontFace: "Arial", fontSize: 32, bold: true, color: C.white,
  });
  s.addText("Потом — навсегда.", {
    x: 0.7, y: 3.45, w: 11, h: 0.55,
    fontFace: "Arial", fontSize: 32, bold: true, color: C.orange,
  });
  s.addText("Шежіре для всей семьи.\nArweave — когда нужно, не когда «обязательно».", {
    x: 0.7, y: 4.3, w: 10, h: 1,
    fontFace: "Arial", fontSize: 16, color: C.onDarkMuted,
  });
  s.addText("Казахстан → мир", {
    x: 0.7, y: 6.7, w: 6, h: 0.3,
    fontFace: "Arial", fontSize: 12, color: C.orange,
  });
}

// 02 Provocation
{
  const s = pptx.addSlide();
  s.addShape(pptx.shapes.RECTANGLE, { x: 0, y: 0, w: 13.333, h: 7.5, fill: { color: C.bg } });
  brandChrome(s);
  eyebrow(s, "00 · СТАВКА", 1.1);
  s.addText("Чужая компания\nне должна владеть\nвашими предками.", {
    x: 0.7, y: 1.6, w: 11, h: 2.8,
    fontFace: "Arial", fontSize: 40, bold: true, color: C.ink,
  });
  s.addText(
    "Ancestry и MyHeritage держат историю рода на своих серверах — пока платите. SEJIRE отдаёт память семье: 12 слов, шифр на устройстве, Arweave на века.",
    { x: 0.7, y: 4.7, w: 11, h: 1.2, fontFace: "Arial", fontSize: 16, color: C.muted }
  );
}

// 03 Problem
{
  const s = pptx.addSlide();
  s.addShape(pptx.shapes.RECTANGLE, { x: 0, y: 0, w: 13.333, h: 7.5, fill: { color: C.bg } });
  brandChrome(s);
  eyebrow(s, "01 · ПРОБЛЕМА", 1.0);
  s.addText("Род размазан по чатам,\nExcel и чужим облакам", {
    x: 0.7, y: 1.4, w: 11, h: 1.2, fontFace: "Arial", fontSize: 28, bold: true, color: C.ink,
  });
  const rows = [
    ["01", "Сложно начать", "Генеалогия перегружена. Людям нужен старт с себя — не с диссертации."],
    ["02", "Нечем поделиться", "PDF на стену, письмо родным, распечатка на той — без подписки."],
    ["03", "Данные не ваши", "История живёт, пока жива компания и ваш тариф."],
    ["04", "Вечность закрыта", "Permaweb умеет хранить века. Обычная семья не покупает токены."],
  ];
  rows.forEach((r, i) => {
    const y = 2.8 + i * 0.95;
    s.addText(r[0], { x: 0.7, y, w: 0.7, h: 0.35, fontFace: "Arial", fontSize: 12, bold: true, color: C.orange });
    s.addText(r[1], { x: 1.5, y, w: 10, h: 0.35, fontFace: "Arial", fontSize: 16, bold: true, color: C.ink });
    s.addText(r[2], { x: 1.5, y: y + 0.32, w: 10.5, h: 0.4, fontFace: "Arial", fontSize: 13, color: C.muted });
  });
}

// 04 Insight
{
  const s = pptx.addSlide();
  s.addShape(pptx.shapes.RECTANGLE, { x: 0, y: 0, w: 13.333, h: 7.5, fill: { color: C.orange } });
  brandChrome(s, { orange: true });
  eyebrow(s, "02 · ИНСАЙТ", 1.2, { onDark: true });
  s.addText("Жеті ата —\nготовый клин\nв рынок.", {
    x: 0.7, y: 1.8, w: 11, h: 2.8, fontFace: "Arial", fontSize: 40, bold: true, color: C.white,
  });
  s.addText(
    "В Казахстане знание семи колен — норма, а не «надо объяснять зачем». Один PDF уходит в чат рода — следующие приходят сами. Культурный продукт бьёт универсальный «family tree».",
    { x: 0.7, y: 5.0, w: 11.5, h: 1.3, fontFace: "Arial", fontSize: 16, color: C.white }
  );
}

// 05 Solution
{
  const s = pptx.addSlide();
  s.addShape(pptx.shapes.RECTANGLE, { x: 0, y: 0, w: 13.333, h: 7.5, fill: { color: C.bg } });
  brandChrome(s);
  eyebrow(s, "03 · РЕШЕНИЕ", 1.0);
  s.addText("SEJIRE — шежіре\nдля всей семьи", {
    x: 0.7, y: 1.4, w: 11, h: 1.1, fontFace: "Arial", fontSize: 28, bold: true, color: C.ink,
  });
  const steps = [
    ["01", "Начать с себя", "Мама, папа, дети — карточками «+». Черновик сам живёт в браузере.", false],
    ["02", "Скачать PDF", "Древо или орнаментальное шежіре — почта, печать, той.", false],
    ["03", "По желанию — навсегда", "12 слов + оплата ~$3. Без покупки крипты. Шифр → Arweave.", true],
  ];
  steps.forEach((st, i) => {
    const x = 0.7 + i * 4.1;
    s.addShape(pptx.shapes.RECTANGLE, {
      x, y: 2.8, w: 3.85, h: 2.5,
      fill: { color: st[3] ? C.ink : C.elev },
    });
    s.addText(st[0], { x: x + 0.25, y: 2.95, w: 3.3, h: 0.3, fontFace: "Arial", fontSize: 11, bold: true, color: C.orange });
    s.addText(st[1], { x: x + 0.25, y: 3.35, w: 3.3, h: 0.5, fontFace: "Arial", fontSize: 16, bold: true, color: st[3] ? C.white : C.ink });
    s.addText(st[2], { x: x + 0.25, y: 3.95, w: 3.3, h: 1.1, fontFace: "Arial", fontSize: 13, color: st[3] ? C.onDarkMuted : C.muted });
  });
  const stats = [
    ["0 ₸", "создать · PDF · шаринг"],
    ["~$3", "вечная опция"],
    ["200+", "лет модели Arweave"],
    ["12", "слов = ключ семьи"],
  ];
  stats.forEach((st, i) => {
    const x = 0.7 + i * 3.1;
    s.addText(st[0], { x, y: 5.7, w: 2.9, h: 0.45, fontFace: "Arial", fontSize: 22, bold: true, color: C.orange });
    s.addText(st[1], { x, y: 6.15, w: 2.9, h: 0.35, fontFace: "Arial", fontSize: 11, color: C.muted });
  });
}

// 06 Product
{
  const s = pptx.addSlide();
  s.addShape(pptx.shapes.RECTANGLE, { x: 0, y: 0, w: 13.333, h: 7.5, fill: { color: C.bg } });
  brandChrome(s);
  eyebrow(s, "04 · ПРОДУКТ", 1.0);
  s.addText("Так выглядит\nпамять рода", {
    x: 0.7, y: 1.5, w: 5, h: 1.4, fontFace: "Arial", fontSize: 28, bold: true, color: C.ink,
  });
  s.addText("Тихий Apple-like UX. Культурные поля — по желанию. Бренд впереди функций.", {
    x: 0.7, y: 3.1, w: 5, h: 1, fontFace: "Arial", fontSize: 15, color: C.muted,
  });
  const shots = [
    ["assets/screens/05-tree-wide.png", "Древо · живой черновик", 6.2, 1.3, 6.4, 3.6],
    ["assets/screens/01-welcome.png", "Вход — только SEJIRE", 6.2, 5.1, 3.05, 1.7],
    ["assets/screens/04-tree-family.png", "Профиль · автосейв", 9.45, 5.1, 3.15, 1.7],
  ];
  for (const [src, cap, x, y, w, h] of shots) {
    try {
      s.addImage({ path: join(__dirname, src), x, y, w, h: h - 0.28 });
      s.addText(cap, { x, y: y + h - 0.28, w, h: 0.28, fontFace: "Arial", fontSize: 10, color: C.muted });
    } catch {
      s.addShape(pptx.shapes.RECTANGLE, { x, y, w, h: h - 0.28, fill: { color: C.elev } });
      s.addText(cap, { x, y: y + h - 0.28, w, h: 0.28, fontFace: "Arial", fontSize: 10, color: C.muted });
    }
  }
}

// 07 Free
{
  const s = pptx.addSlide();
  s.addShape(pptx.shapes.RECTANGLE, { x: 0, y: 0, w: 13.333, h: 7.5, fill: { color: C.bg } });
  brandChrome(s);
  eyebrow(s, "05 · БЕСПЛАТНЫЙ СЛОЙ", 1.0);
  s.addText("Платить не нужно,\nчтобы пользоваться", {
    x: 0.7, y: 1.4, w: 11, h: 1.2, fontFace: "Arial", fontSize: 28, bold: true, color: C.ink,
  });
  s.addText("Карта и крипта — только если хотите вечную копию. Весь повседневный цикл рода — бесплатно и навсегда в этом слое.", {
    x: 0.7, y: 2.7, w: 11.5, h: 0.7, fontFace: "Arial", fontSize: 15, color: C.muted,
  });
  const q = [
    ["Создать", "Открыл сайт — строишь дерево."],
    ["Сохранить", "Черновик в браузере. Без аккаунта."],
    ["PDF", "Древо и жеті ата / шежіре."],
    ["Шаринг", "Почта, файл, печать на стену."],
  ];
  q.forEach((item, i) => {
    const x = 0.7 + i * 3.1;
    s.addShape(pptx.shapes.RECTANGLE, { x, y: 3.6, w: 2.9, h: 2.0, fill: { color: C.elev } });
    s.addShape(pptx.shapes.RECTANGLE, { x, y: 3.6, w: 2.9, h: 0.08, fill: { color: C.orange } });
    s.addText(item[0], { x: x + 0.2, y: 3.9, w: 2.5, h: 0.4, fontFace: "Arial", fontSize: 16, bold: true, color: C.ink });
    s.addText(item[1], { x: x + 0.2, y: 4.4, w: 2.5, h: 0.9, fontFace: "Arial", fontSize: 13, color: C.muted });
  });
}

// 08 Eternal
{
  const s = pptx.addSlide();
  s.addShape(pptx.shapes.RECTANGLE, { x: 0, y: 0, w: 13.333, h: 7.5, fill: { color: C.inkSoft } });
  brandChrome(s, { dark: true });
  eyebrow(s, "06 · ОПЦИЯ ВЕЧНОСТИ", 1.0);
  s.addText("Зафиксировать род\nна 200+ лет", {
    x: 0.7, y: 1.45, w: 11, h: 1.3, fontFace: "Arial", fontSize: 28, bold: true, color: C.white,
  });
  const cards = [
    ["Ключ", "12 слов", "BIP-39. Seed не уходит на сервер. Открыть сейф — только у семьи."],
    ["Оплата", "~$3 фиатом", "Kaspi / карта. Пользователь не покупает AR. Сеть платит казна SEJIRE."],
    ["Хранение", "Arweave", "AES-GCM ciphertext. Endowment-модель. Неизменяемый снимок рода."],
  ];
  cards.forEach((c, i) => {
    const x = 0.7 + i * 4.1;
    s.addShape(pptx.shapes.RECTANGLE, {
      x, y: 3.1, w: 3.85, h: 2.5,
      fill: { color: "2A2622" },
      line: { color: "3A342E", width: 1 },
    });
    s.addText(c[0], { x: x + 0.25, y: 3.3, w: 3.3, h: 0.3, fontFace: "Arial", fontSize: 11, bold: true, color: C.orange });
    s.addText(c[1], { x: x + 0.25, y: 3.7, w: 3.3, h: 0.45, fontFace: "Arial", fontSize: 20, bold: true, color: C.white });
    s.addText(c[2], { x: x + 0.25, y: 4.3, w: 3.3, h: 1.0, fontFace: "Arial", fontSize: 13, color: C.onDarkMuted });
  });
  s.addText("Обязательно? Нет.  ·  Крипта у юзера? 0.  ·  Аккаунт SEJIRE? Не нужен.", {
    x: 0.7, y: 6.0, w: 12, h: 0.4, fontFace: "Arial", fontSize: 13, color: C.onDarkMuted,
  });
}

// 09 Moat
{
  const s = pptx.addSlide();
  s.addShape(pptx.shapes.RECTANGLE, { x: 0, y: 0, w: 13.333, h: 7.5, fill: { color: C.bg } });
  brandChrome(s);
  eyebrow(s, "07 · ПОЧЕМУ МЫ", 1.0);
  s.addText("Не Ancestry.\nНе DeepFamily.\nSEJIRE.", {
    x: 0.7, y: 1.35, w: 11, h: 1.7, fontFace: "Arial", fontSize: 28, bold: true, color: C.ink,
  });
  const cols = [
    ["Ancestry", ["Подписка и lock-in", "Данные у компании", "Нет вечности", "Запад + ДНК"], false],
    ["DeepFamily", ["Нужен EVM-кошелёк", "Не permaweb", "Crypto-native UX", "Не шежіре"], false],
    ["SEJIRE", ["Бесплатный вход", "12 слов у семьи", "Arweave · опция $3", "Шежіре / жеті ата"], true],
  ];
  cols.forEach((col, i) => {
    const x = 0.7 + i * 4.1;
    s.addShape(pptx.shapes.RECTANGLE, {
      x, y: 3.3, w: 3.85, h: 2.7,
      fill: { color: col[2] ? C.ink : C.elev },
      line: col[2] ? { color: C.orange, width: 2 } : undefined,
    });
    s.addText(col[0], {
      x: x + 0.25, y: 3.5, w: 3.3, h: 0.4,
      fontFace: "Arial", fontSize: 18, bold: true, color: col[2] ? C.orange : C.ink,
    });
    col[1].forEach((line, j) => {
      s.addText("—  " + line, {
        x: x + 0.25, y: 4.1 + j * 0.4, w: 3.3, h: 0.35,
        fontFace: "Arial", fontSize: 13, color: col[2] ? C.onDarkMuted : C.muted,
      });
    });
  });
  s.addText("На Arweave живого аналога шежіре нет. Ниша почти пустая.", {
    x: 0.7, y: 6.3, w: 12, h: 0.4, fontFace: "Arial", fontSize: 15, bold: true, color: C.ink,
  });
}

// 10 Market
{
  const s = pptx.addSlide();
  s.addShape(pptx.shapes.RECTANGLE, { x: 0, y: 0, w: 13.333, h: 7.5, fill: { color: C.bg } });
  brandChrome(s);
  eyebrow(s, "08 · BEACHHEAD", 1.0);
  s.addText("Казахстан — не пивот.\nЭто оружие.", {
    x: 0.7, y: 1.4, w: 11, h: 1.2, fontFace: "Arial", fontSize: 28, bold: true, color: C.ink,
  });
  const weapons = [
    ["Культура уже куплена", "Жеті ата — норма. Не надо продавать «зачем знать предков»."],
    ["Вирусность рода", "Один PDF в семейный чат = органический рост без CAC-лекции."],
    ["Web3 без боли", "Бесплатный слой снимает страх. Вечность — тихий апселл."],
    ["Имя уже наше", "sejire на ArNS. Канон: sejire.ar.io."],
  ];
  weapons.forEach((w, i) => {
    const x = 0.7 + (i % 2) * 6.2;
    const y = 2.9 + Math.floor(i / 2) * 1.7;
    s.addShape(pptx.shapes.RECTANGLE, { x, y, w: 5.9, h: 1.45, fill: { color: C.elev } });
    s.addShape(pptx.shapes.RECTANGLE, { x, y, w: 0.08, h: 1.45, fill: { color: C.orange } });
    s.addText(w[0], { x: x + 0.35, y: y + 0.25, w: 5.3, h: 0.4, fontFace: "Arial", fontSize: 16, bold: true, color: C.ink });
    s.addText(w[1], { x: x + 0.35, y: y + 0.7, w: 5.3, h: 0.55, fontFace: "Arial", fontSize: 13, color: C.muted });
  });
}

// 11 GTM
{
  const s = pptx.addSlide();
  s.addShape(pptx.shapes.RECTANGLE, { x: 0, y: 0, w: 13.333, h: 7.5, fill: { color: C.inkSoft } });
  brandChrome(s, { dark: true });
  eyebrow(s, "09 · GO-TO-MARKET", 1.0);
  s.addText("KZ → пояс → мир", {
    x: 0.7, y: 1.5, w: 11, h: 0.7, fontFace: "Arial", fontSize: 28, bold: true, color: C.white,
  });
  const ladder = [
    ["I", "Казахстан", "Жеті ата, PDF на той, каз/рус, родовые сообщества, Kaspi."],
    ["II", "СНГ / тюркский пояс", "Та же традиция семи колен — Кыргызстан, Узбекистан и соседи."],
    ["III", "Мир", "«Eternal family vault» для диаспор и всех, кто устал от подписок."],
  ];
  ladder.forEach((l, i) => {
    const y = 2.5 + i * 1.35;
    s.addShape(pptx.shapes.RECTANGLE, {
      x: 0.7, y, w: 11.9, h: 1.15,
      fill: { color: "2A2622" },
      line: { color: "3A342E", width: 1 },
    });
    s.addText(l[0], { x: 0.95, y: y + 0.3, w: 1, h: 0.5, fontFace: "Arial", fontSize: 24, bold: true, color: C.orange });
    s.addText(l[1], { x: 2.2, y: y + 0.2, w: 9.8, h: 0.4, fontFace: "Arial", fontSize: 18, bold: true, color: C.white });
    s.addText(l[2], { x: 2.2, y: y + 0.6, w: 9.8, h: 0.4, fontFace: "Arial", fontSize: 14, color: C.onDarkMuted });
  });
}

// 12 Live
{
  const s = pptx.addSlide();
  s.addShape(pptx.shapes.RECTANGLE, { x: 0, y: 0, w: 13.333, h: 7.5, fill: { color: C.bg } });
  brandChrome(s);
  eyebrow(s, "10 · TRACTION", 1.0);
  s.addText("MVP уже онлайн.\nНе слайд — продукт.", {
    x: 0.7, y: 1.4, w: 11, h: 1.2, fontFace: "Arial", fontSize: 28, bold: true, color: C.ink,
  });
  const live = [
    ["Live", "Древо, автосейв, PDF, орнаментальное шежіре, JSON, шифр-пайплайн.", false],
    ["Стек", "React · Vite · BIP-39 · AES-GCM · Arweave/Turbo · jsPDF · ArNS", false],
    ["Следом", "Kaspi $3 · казна Turbo · сайт на permaweb · sejire.ar.io", true],
  ];
  live.forEach((c, i) => {
    const x = 0.7 + i * 4.1;
    s.addShape(pptx.shapes.RECTANGLE, {
      x, y: 3.0, w: 3.85, h: 2.4,
      fill: { color: c[2] ? C.ink : C.elev },
    });
    s.addText(c[0], { x: x + 0.25, y: 3.25, w: 3.3, h: 0.4, fontFace: "Arial", fontSize: 18, bold: true, color: C.orange });
    s.addText(c[1], { x: x + 0.25, y: 3.8, w: 3.3, h: 1.3, fontFace: "Arial", fontSize: 14, color: c[2] ? C.onDarkMuted : C.muted });
  });
  s.addText("azovskaya.github.io/Sejire_arweave", {
    x: 0.7, y: 5.8, w: 12, h: 0.4, fontFace: "Arial", fontSize: 14, color: C.orange,
  });
}

// 13 Ask
{
  const s = pptx.addSlide();
  s.addShape(pptx.shapes.RECTANGLE, { x: 0, y: 0, w: 13.333, h: 7.5, fill: { color: C.orange } });
  brandChrome(s, { orange: true });
  eyebrow(s, "11 · ASK", 1.1, { onDark: true });
  s.addText("Ускоряем три\nудара.", {
    x: 0.7, y: 1.6, w: 11, h: 1.5, fontFace: "Arial", fontSize: 40, bold: true, color: C.white,
  });
  const asks = [
    ["01", "Оплата ~$3", "Kaspi / мерчант + казна Turbo — вечность без токенов у семьи."],
    ["02", "Permaweb + ArNS", "SEJIRE на Arweave. Канон: sejire.ar.io."],
    ["03", "Рост в KZ", "Контент, пилоты с родами, первые тысячи древьев и первые сейфы."],
  ];
  asks.forEach((a, i) => {
    const y = 3.5 + i * 1.05;
    s.addText(a[0], { x: 0.7, y, w: 0.8, h: 0.4, fontFace: "Arial", fontSize: 14, bold: true, color: "FFE8D6" });
    s.addText(a[1], { x: 1.7, y, w: 10, h: 0.35, fontFace: "Arial", fontSize: 18, bold: true, color: C.white });
    s.addText(a[2], { x: 1.7, y: y + 0.35, w: 10.5, h: 0.4, fontFace: "Arial", fontSize: 14, color: C.white });
  });
}

// 14 Close
{
  const s = pptx.addSlide();
  s.addShape(pptx.shapes.RECTANGLE, { x: 0, y: 0, w: 13.333, h: 7.5, fill: { color: C.inkSoft } });
  brandChrome(s, { dark: true });
  s.addText("SEJIRE", {
    x: 0.7, y: 1.5, w: 12, h: 0.4, fontFace: "Arial", fontSize: 12, bold: true, color: C.orange, charSpacing: 4,
  });
  s.addText("Сначала\nбесплатно.\nПотом —\nнавсегда.", {
    x: 0.7, y: 2.1, w: 11, h: 2.8, fontFace: "Arial", fontSize: 36, bold: true, color: C.white,
  });
  s.addText("Создать. Сохранить. Отправить. Распечатать.\nА когда нужно — закрепить род в Arweave.", {
    x: 0.7, y: 5.1, w: 11, h: 0.8, fontFace: "Arial", fontSize: 15, color: C.onDarkMuted,
  });
  s.addText("Live MVP  ·  azovskaya.github.io/Sejire_arweave  ·  sejire.ar.io", {
    x: 0.7, y: 6.3, w: 12, h: 0.35, fontFace: "Arial", fontSize: 13, color: C.orange,
  });
}

mkdirSync(__dirname, { recursive: true });
await pptx.writeFile({ fileName: outPath });
console.log("Wrote", outPath);
