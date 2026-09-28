/**
 * Build the English SEJIRE investor deck as PowerPoint (.pptx).
 * Run: node presentation/build-pptx-en.mjs
 */
import PptxGenJS from "pptxgenjs";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = join(__dirname, "SEJIRE-investor-deck-en.pptx");

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
pptx.subject = "Free first. Forever later.";

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
  s.addText("Free first.", {
    x: 0.7, y: 2.85, w: 11, h: 0.55,
    fontFace: "Arial", fontSize: 32, bold: true, color: C.white,
  });
  s.addText("Forever later.", {
    x: 0.7, y: 3.45, w: 11, h: 0.55,
    fontFace: "Arial", fontSize: 32, bold: true, color: C.orange,
  });
  s.addText("Shezhire for the whole family.\nArweave when you need it — not because you must.", {
    x: 0.7, y: 4.3, w: 10, h: 1,
    fontFace: "Arial", fontSize: 16, color: C.onDarkMuted,
  });
  s.addText("Kazakhstan → the world", {
    x: 0.7, y: 6.7, w: 6, h: 0.3,
    fontFace: "Arial", fontSize: 12, color: C.orange,
  });
}

// 02 Provocation
{
  const s = pptx.addSlide();
  s.addShape(pptx.shapes.RECTANGLE, { x: 0, y: 0, w: 13.333, h: 7.5, fill: { color: C.bg } });
  brandChrome(s);
  eyebrow(s, "00 · THE BET", 1.1);
  s.addText("A stranger’s company\nshould not own\nyour ancestors.", {
    x: 0.7, y: 1.6, w: 11, h: 2.8,
    fontFace: "Arial", fontSize: 40, bold: true, color: C.ink,
  });
  s.addText(
    "Ancestry and MyHeritage keep family history on their servers — for as long as you pay. SEJIRE gives memory back to the family: 12 words, encryption on the device, Arweave for centuries.",
    { x: 0.7, y: 4.7, w: 11, h: 1.2, fontFace: "Arial", fontSize: 16, color: C.muted }
  );
}

// 03 Problem
{
  const s = pptx.addSlide();
  s.addShape(pptx.shapes.RECTANGLE, { x: 0, y: 0, w: 13.333, h: 7.5, fill: { color: C.bg } });
  brandChrome(s);
  eyebrow(s, "01 · PROBLEM", 1.0);
  s.addText("The lineage is scattered\nacross chats, Excel, and other people’s clouds", {
    x: 0.7, y: 1.4, w: 11, h: 1.2, fontFace: "Arial", fontSize: 26, bold: true, color: C.ink,
  });
  const rows = [
    ["01", "Hard to start", "Genealogy is overloaded. People need to begin with themselves — not a dissertation."],
    ["02", "Nothing to share", "A PDF for the wall, a letter to relatives, a print for a toi — without a subscription."],
    ["03", "The data is not yours", "The history lives only as long as the company and your plan do."],
    ["04", "Forever is locked", "Permaweb can keep records for centuries. An ordinary family does not buy tokens."],
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
  eyebrow(s, "02 · INSIGHT", 1.2, { onDark: true });
  s.addText("Zheti ata —\na ready wedge\ninto the market.", {
    x: 0.7, y: 1.8, w: 11, h: 2.8, fontFace: "Arial", fontSize: 40, bold: true, color: C.white,
  });
  s.addText(
    "In Kazakhstan, knowing seven generations is the norm, not a “why would I?” pitch. One PDF in the family chat brings the next people in. A cultural product beats a generic family tree.",
    { x: 0.7, y: 5.0, w: 11.5, h: 1.3, fontFace: "Arial", fontSize: 16, color: C.white }
  );
}

// 05 Solution
{
  const s = pptx.addSlide();
  s.addShape(pptx.shapes.RECTANGLE, { x: 0, y: 0, w: 13.333, h: 7.5, fill: { color: C.bg } });
  brandChrome(s);
  eyebrow(s, "03 · SOLUTION", 1.0);
  s.addText("SEJIRE — shezhire\nfor the whole family", {
    x: 0.7, y: 1.4, w: 11, h: 1.1, fontFace: "Arial", fontSize: 28, bold: true, color: C.ink,
  });
  const steps = [
    ["01", "Start with yourself", "Mother, father, children — “+” cards. The draft lives in the browser on its own.", false],
    ["02", "Download a PDF", "A tree or an ornamental shezhire — mail, print, toi.", false],
    ["03", "Forever, if you want", "12 words + about $3. No crypto to buy. Ciphertext → Arweave.", true],
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
    ["0 ₸", "create · PDF · share"],
    ["~$3", "eternal option"],
    ["200+", "years, Arweave model"],
    ["12", "words = the family key"],
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
  eyebrow(s, "04 · PRODUCT", 1.0);
  s.addText("This is what\nfamily memory looks like", {
    x: 0.7, y: 1.5, w: 5, h: 1.4, fontFace: "Arial", fontSize: 26, bold: true, color: C.ink,
  });
  s.addText("Quiet, Apple-like UX. Cultural fields are optional. The brand leads the features.", {
    x: 0.7, y: 3.1, w: 5, h: 1, fontFace: "Arial", fontSize: 15, color: C.muted,
  });
  const shots = [
    ["assets/screens/05-tree-wide.png", "Tree · live draft", 6.2, 1.3, 6.4, 3.6],
    ["assets/screens/01-welcome.png", "Entry — only SEJIRE", 6.2, 5.1, 3.05, 1.7],
    ["assets/screens/04-tree-family.png", "Profile · autosave", 9.45, 5.1, 3.15, 1.7],
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
  eyebrow(s, "05 · FREE LAYER", 1.0);
  s.addText("You do not pay\nto use it", {
    x: 0.7, y: 1.4, w: 11, h: 1.2, fontFace: "Arial", fontSize: 28, bold: true, color: C.ink,
  });
  s.addText("Card and crypto only if you want an eternal copy. Everyday family use stays free in this layer, for good.", {
    x: 0.7, y: 2.7, w: 11.5, h: 0.7, fontFace: "Arial", fontSize: 15, color: C.muted,
  });
  const q = [
    ["Create", "Open the site — build the tree."],
    ["Save", "Draft in the browser. No account."],
    ["PDF", "Tree and zheti ata / shezhire."],
    ["Share", "Mail, file, print for the wall."],
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
  eyebrow(s, "06 · THE FOREVER OPTION", 1.0);
  s.addText("Lock the lineage\nfor 200+ years", {
    x: 0.7, y: 1.45, w: 11, h: 1.3, fontFace: "Arial", fontSize: 28, bold: true, color: C.white,
  });
  const cards = [
    ["Key", "12 words", "BIP-39. The seed never hits a server. Only the family can open the vault."],
    ["Payment", "~$3 in fiat", "Kaspi / card. The user does not buy AR. The SEJIRE treasury pays the network."],
    ["Storage", "Arweave", "AES-GCM ciphertext. Endowment model. An immutable snapshot of the family."],
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
  s.addText("Required? No.  ·  Crypto for the user? Zero.  ·  SEJIRE account? Not needed.", {
    x: 0.7, y: 6.0, w: 12, h: 0.4, fontFace: "Arial", fontSize: 13, color: C.onDarkMuted,
  });
}

// 09 Moat
{
  const s = pptx.addSlide();
  s.addShape(pptx.shapes.RECTANGLE, { x: 0, y: 0, w: 13.333, h: 7.5, fill: { color: C.bg } });
  brandChrome(s);
  eyebrow(s, "07 · WHY US", 1.0);
  s.addText("Not Ancestry.\nNot DeepFamily.\nSEJIRE.", {
    x: 0.7, y: 1.35, w: 11, h: 1.7, fontFace: "Arial", fontSize: 28, bold: true, color: C.ink,
  });
  const cols = [
    ["Ancestry", ["Subscription lock-in", "Data sits with the company", "No forever", "West + DNA"], false],
    ["DeepFamily", ["Needs an EVM wallet", "Not permaweb", "Crypto-native UX", "Not shezhire"], false],
    ["SEJIRE", ["Free to start", "12 words with the family", "Arweave · $3 option", "Shezhire / zheti ata"], true],
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
  s.addText("There is no live shezhire analogue on Arweave. The niche is almost empty.", {
    x: 0.7, y: 6.3, w: 12, h: 0.4, fontFace: "Arial", fontSize: 15, bold: true, color: C.ink,
  });
}

// 10 Market
{
  const s = pptx.addSlide();
  s.addShape(pptx.shapes.RECTANGLE, { x: 0, y: 0, w: 13.333, h: 7.5, fill: { color: C.bg } });
  brandChrome(s);
  eyebrow(s, "08 · BEACHHEAD", 1.0);
  s.addText("Kazakhstan is not a pivot.\nIt is a weapon.", {
    x: 0.7, y: 1.4, w: 11, h: 1.2, fontFace: "Arial", fontSize: 28, bold: true, color: C.ink,
  });
  const weapons = [
    ["The culture is already bought", "Zheti ata is the norm. No need to sell “why know your ancestors.”"],
    ["Kinship virality", "One PDF in the family chat = organic growth without a CAC lecture."],
    ["Web3 without the pain", "The free layer removes fear. Forever is a quiet upsell."],
    ["The name is already ours", "sejire on ArNS. Canon: sejire.ar.io."],
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
  s.addText("KZ → the belt → the world", {
    x: 0.7, y: 1.5, w: 11, h: 0.7, fontFace: "Arial", fontSize: 28, bold: true, color: C.white,
  });
  const ladder = [
    ["I", "Kazakhstan", "Zheti ata, PDF for a toi, Kazakh/Russian, lineage communities, Kaspi."],
    ["II", "CIS / Turkic belt", "The same seven-generation tradition — Kyrgyzstan, Uzbekistan, and neighbours."],
    ["III", "The world", "An eternal family vault for diasporas and anyone tired of subscriptions."],
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
  s.addText("The MVP is already live.\nNot a slide — a product.", {
    x: 0.7, y: 1.4, w: 11, h: 1.2, fontFace: "Arial", fontSize: 28, bold: true, color: C.ink,
  });
  const live = [
    ["Live", "Tree, autosave, PDF, ornamental shezhire, JSON, encryption pipeline.", false],
    ["Stack", "React · Vite · BIP-39 · AES-GCM · Arweave/Turbo · jsPDF · ArNS", false],
    ["Next", "Kaspi $3 · Turbo treasury · site on permaweb · sejire.ar.io", true],
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
  s.addText("We accelerate\nthree strikes.", {
    x: 0.7, y: 1.6, w: 11, h: 1.5, fontFace: "Arial", fontSize: 40, bold: true, color: C.white,
  });
  const asks = [
    ["01", "~$3 payment", "Kaspi / merchant + Turbo treasury — forever without tokens for the family."],
    ["02", "Permaweb + ArNS", "SEJIRE on Arweave. Canon: sejire.ar.io."],
    ["03", "Growth in KZ", "Content, lineage pilots, the first thousands of trees and the first vaults."],
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
  s.addText("Free\nfirst.\nForever\nlater.", {
    x: 0.7, y: 2.1, w: 11, h: 2.8, fontFace: "Arial", fontSize: 36, bold: true, color: C.white,
  });
  s.addText("Create. Save. Send. Print.\nAnd when you need it — lock the lineage on Arweave.", {
    x: 0.7, y: 5.1, w: 11, h: 0.8, fontFace: "Arial", fontSize: 15, color: C.onDarkMuted,
  });
  s.addText("Live MVP  ·  azovskaya.github.io/Sejire_arweave  ·  sejire.ar.io", {
    x: 0.7, y: 6.3, w: 12, h: 0.35, fontFace: "Arial", fontSize: 13, color: C.orange,
  });
}

mkdirSync(__dirname, { recursive: true });
await pptx.writeFile({ fileName: outPath });
console.log("Wrote", outPath);
