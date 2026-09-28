/**
 * Lightweight Kazakh-inspired geometric ornaments for PDF posters.
 * Motifs evoke қосқар мүйіз (ram horns) with simple vector strokes — no images.
 */
import type { jsPDF } from "jspdf";

export type Rgb = [number, number, number];

/** Symmetric ram-horn curl from a center point. */
export function drawHornPair(
  doc: jsPDF,
  cx: number,
  cy: number,
  size: number,
  ink: Rgb,
  lineW = 0.35
) {
  doc.setDrawColor(...ink);
  doc.setLineWidth(lineW);
  // left horn
  doc.line(cx, cy, cx - size * 0.55, cy - size * 0.15);
  doc.line(cx - size * 0.55, cy - size * 0.15, cx - size * 0.85, cy - size * 0.55);
  doc.line(cx - size * 0.85, cy - size * 0.55, cx - size * 0.45, cy - size * 0.75);
  // right horn
  doc.line(cx, cy, cx + size * 0.55, cy - size * 0.15);
  doc.line(cx + size * 0.55, cy - size * 0.15, cx + size * 0.85, cy - size * 0.55);
  doc.line(cx + size * 0.85, cy - size * 0.55, cx + size * 0.45, cy - size * 0.75);
}

/** Diamond knot used on the vertical lineage spine. */
export function drawDiamondKnot(doc: jsPDF, cx: number, cy: number, r: number, ink: Rgb, fill: Rgb) {
  doc.setDrawColor(...ink);
  doc.setFillColor(...fill);
  doc.setLineWidth(0.55);
  doc.triangle(cx, cy - r, cx + r, cy, cx, cy + r, "FD");
  doc.triangle(cx, cy - r, cx - r, cy, cx, cy + r, "FD");
  doc.setFillColor(...ink);
  doc.circle(cx, cy, r * 0.28, "F");
}

/** Corner қосқар мүйіз block for poster margins. */
export function drawOrnamentCorner(
  doc: jsPDF,
  x: number,
  y: number,
  facing: "tl" | "tr" | "bl" | "br",
  ink: Rgb,
  size = 8
) {
  doc.setDrawColor(...ink);
  doc.setLineWidth(0.4);
  const sx = facing === "tl" || facing === "bl" ? 1 : -1;
  const sy = facing === "tl" || facing === "tr" ? 1 : -1;
  const x2 = x + sx * size;
  const y2 = y + sy * size;
  doc.line(x, y, x2, y);
  doc.line(x, y, x, y2);
  doc.line(x + sx * size * 0.35, y, x + sx * size * 0.35, y + sy * size * 0.55);
  doc.line(x, y + sy * size * 0.35, x + sx * size * 0.55, y + sy * size * 0.35);
  // inner horn curl
  doc.line(x + sx * 2.2, y + sy * 2.2, x + sx * 5.2, y + sy * 2.8);
  doc.line(x + sx * 5.2, y + sy * 2.8, x + sx * 6.2, y + sy * 5.5);
  doc.line(x + sx * 2.2, y + sy * 2.2, x + sx * 2.8, y + sy * 5.2);
  doc.line(x + sx * 2.8, y + sy * 5.2, x + sx * 5.5, y + sy * 6.2);
}

/** Repeating wave / horn border along an edge. */
export function drawOrnamentBorder(
  doc: jsPDF,
  pageW: number,
  pageH: number,
  inset: number,
  ink: Rgb
) {
  doc.setDrawColor(...ink);
  doc.setLineWidth(0.55);
  doc.rect(inset, inset, pageW - inset * 2, pageH - inset * 2);
  doc.setLineWidth(0.22);
  doc.rect(inset + 2.2, inset + 2.2, pageW - (inset + 2.2) * 2, pageH - (inset + 2.2) * 2);

  drawOrnamentCorner(doc, inset + 3.5, inset + 3.5, "tl", ink, 9);
  drawOrnamentCorner(doc, pageW - inset - 3.5, inset + 3.5, "tr", ink, 9);
  drawOrnamentCorner(doc, inset + 3.5, pageH - inset - 3.5, "bl", ink, 9);
  drawOrnamentCorner(doc, pageW - inset - 3.5, pageH - inset - 3.5, "br", ink, 9);

  // side motif ticks
  doc.setLineWidth(0.3);
  const midY = pageH / 2;
  for (const x of [inset + 1.1, pageW - inset - 1.1]) {
    doc.line(x, midY - 10, x, midY + 10);
    doc.circle(x, midY, 0.7, "S");
  }
}

/** Title wings under Жеті ата. */
export function drawTitleOrnament(doc: jsPDF, cx: number, y: number, halfW: number, ink: Rgb) {
  doc.setDrawColor(...ink);
  doc.setFillColor(...ink);
  doc.setLineWidth(0.4);
  doc.line(cx - halfW, y, cx - 8, y);
  doc.line(cx + 8, y, cx + halfW, y);
  drawHornPair(doc, cx, y + 1.2, 7, ink, 0.4);
  doc.circle(cx, y, 1.1, "F");
}

/**
 * Ornamental name cartouche — each ancestor sits in a framed plaque.
 */
export function drawNameCartouche(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  ink: Rgb,
  fill: Rgb,
  accent: Rgb
) {
  doc.setFillColor(...fill);
  doc.setDrawColor(...ink);
  doc.setLineWidth(0.55);
  doc.roundedRect(x, y, w, h, 1.6, 1.6, "FD");

  // inner hairline
  doc.setLineWidth(0.2);
  doc.setDrawColor(...accent);
  doc.roundedRect(x + 1.3, y + 1.3, w - 2.6, h - 2.6, 1.1, 1.1, "S");

  // corner ticks
  doc.setDrawColor(...ink);
  doc.setLineWidth(0.35);
  const t = 3.2;
  // TL
  doc.line(x + 2, y + 2, x + 2 + t, y + 2);
  doc.line(x + 2, y + 2, x + 2, y + 2 + t);
  // TR
  doc.line(x + w - 2, y + 2, x + w - 2 - t, y + 2);
  doc.line(x + w - 2, y + 2, x + w - 2, y + 2 + t);
  // BL
  doc.line(x + 2, y + h - 2, x + 2 + t, y + h - 2);
  doc.line(x + 2, y + h - 2, x + 2, y + h - 2 - t);
  // BR
  doc.line(x + w - 2, y + h - 2, x + w - 2 - t, y + h - 2);
  doc.line(x + w - 2, y + h - 2, x + w - 2, y + h - 2 - t);

  // side horn flourishes (outside left/right center)
  const mid = y + h / 2;
  doc.setLineWidth(0.3);
  doc.setDrawColor(...accent);
  // left
  doc.line(x - 0.2, mid, x - 3.2, mid - 2.4);
  doc.line(x - 3.2, mid - 2.4, x - 4.4, mid);
  doc.line(x - 0.2, mid, x - 3.2, mid + 2.4);
  doc.line(x - 3.2, mid + 2.4, x - 4.4, mid);
  // right
  doc.line(x + w + 0.2, mid, x + w + 3.2, mid - 2.4);
  doc.line(x + w + 3.2, mid - 2.4, x + w + 4.4, mid);
  doc.line(x + w + 0.2, mid, x + w + 3.2, mid + 2.4);
  doc.line(x + w + 3.2, mid + 2.4, x + w + 4.4, mid);
}

/** Small label plaque for Өзі / Әке / Ата … */
export function drawLabelPlaque(
  doc: jsPDF,
  cx: number,
  cy: number,
  text: string,
  ink: Rgb,
  fill: Rgb,
  setFont: (bold: boolean) => void
) {
  setFont(false);
  doc.setFontSize(6.4);
  const tw = doc.getTextWidth(text);
  const w = tw + 5;
  const h = 6.2;
  const x = cx - w;
  const y = cy - h / 2;
  doc.setFillColor(...fill);
  doc.setDrawColor(...ink);
  doc.setLineWidth(0.35);
  doc.roundedRect(x, y, w, h, 1, 1, "FD");
  doc.setTextColor(...ink);
  doc.text(text, x + w / 2, cy + 1.1, { align: "center" });
}

/**
 * Dense ancient Kazakh өрнек for Тізім — киіз / сырмақ geometry.
 * Angular қосқар мүйіз units, filled bands, no modern rounded UI.
 */

/** Single geometric қосқар мүйіз cell (angular S-horns + center knot). */
export function drawGeometricHornCell(
  doc: jsPDF,
  cx: number,
  cy: number,
  size: number,
  ink: Rgb,
  fill?: Rgb
) {
  const s = size;
  if (fill) {
    doc.setFillColor(...fill);
    doc.rect(cx - s * 0.95, cy - s * 0.85, s * 1.9, s * 1.7, "F");
  }
  doc.setDrawColor(...ink);
  doc.setLineWidth(Math.max(0.35, s * 0.08));

  // Left horn — angular hook (ancient киіз cut)
  const lx = [
    [cx, cy],
    [cx - s * 0.35, cy - s * 0.05],
    [cx - s * 0.72, cy - s * 0.38],
    [cx - s * 0.88, cy - s * 0.72],
    [cx - s * 0.55, cy - s * 0.88],
    [cx - s * 0.32, cy - s * 0.62],
    [cx - s * 0.48, cy - s * 0.42],
    [cx - s * 0.22, cy - s * 0.18],
  ] as const;
  for (let i = 0; i < lx.length - 1; i += 1) {
    doc.line(lx[i][0], lx[i][1], lx[i + 1][0], lx[i + 1][1]);
  }
  // Inner left parallel
  doc.setLineWidth(Math.max(0.2, s * 0.045));
  doc.line(cx - s * 0.12, cy - s * 0.08, cx - s * 0.4, cy - s * 0.12);
  doc.line(cx - s * 0.4, cy - s * 0.12, cx - s * 0.62, cy - s * 0.4);
  doc.line(cx - s * 0.62, cy - s * 0.4, cx - s * 0.7, cy - s * 0.62);

  // Right horn (mirror)
  doc.setLineWidth(Math.max(0.35, s * 0.08));
  const rx = [
    [cx, cy],
    [cx + s * 0.35, cy - s * 0.05],
    [cx + s * 0.72, cy - s * 0.38],
    [cx + s * 0.88, cy - s * 0.72],
    [cx + s * 0.55, cy - s * 0.88],
    [cx + s * 0.32, cy - s * 0.62],
    [cx + s * 0.48, cy - s * 0.42],
    [cx + s * 0.22, cy - s * 0.18],
  ] as const;
  for (let i = 0; i < rx.length - 1; i += 1) {
    doc.line(rx[i][0], rx[i][1], rx[i + 1][0], rx[i + 1][1]);
  }
  doc.setLineWidth(Math.max(0.2, s * 0.045));
  doc.line(cx + s * 0.12, cy - s * 0.08, cx + s * 0.4, cy - s * 0.12);
  doc.line(cx + s * 0.4, cy - s * 0.12, cx + s * 0.62, cy - s * 0.4);
  doc.line(cx + s * 0.62, cy - s * 0.4, cx + s * 0.7, cy - s * 0.62);

  // Center түйін — filled diamond (traditional knot)
  doc.setFillColor(...ink);
  const d = s * 0.18;
  doc.triangle(cx, cy - d, cx + d, cy, cx, cy + d, "F");
  doc.triangle(cx, cy - d, cx - d, cy, cx, cy + d, "F");
}

/** Horizontal repeating өрнек band (сырмақ strip). */
export function drawOrnamentStripH(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  ink: Rgb,
  dye: Rgb
) {
  doc.setFillColor(...dye);
  doc.rect(x, y, w, h, "F");
  doc.setDrawColor(...ink);
  doc.setLineWidth(0.55);
  doc.rect(x, y, w, h);
  doc.setLineWidth(0.22);
  doc.rect(x + 0.9, y + 0.9, w - 1.8, h - 1.8);

  const cell = Math.max(7, Math.min(h * 0.72, 11));
  const cy = y + h / 2 + cell * 0.15;
  const count = Math.max(3, Math.floor((w - 4) / (cell * 1.85)));
  const step = (w - 4) / count;
  for (let i = 0; i < count; i += 1) {
    const cx = x + 2 + step * (i + 0.5);
    drawGeometricHornCell(doc, cx, cy, cell * 0.55, ink);
    // Linking diamond between cells
    if (i < count - 1) {
      const mx = x + 2 + step * (i + 1);
      doc.setFillColor(...ink);
      const r = Math.min(1.3, h * 0.12);
      doc.triangle(mx, cy - r - cell * 0.25, mx + r, cy - cell * 0.25, mx, cy + r - cell * 0.25, "F");
      doc.triangle(mx, cy - r - cell * 0.25, mx - r, cy - cell * 0.25, mx, cy + r - cell * 0.25, "F");
    }
  }
}

/** Vertical repeating өрнек band. */
export function drawOrnamentStripV(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  ink: Rgb,
  dye: Rgb
) {
  doc.setFillColor(...dye);
  doc.rect(x, y, w, h, "F");
  doc.setDrawColor(...ink);
  doc.setLineWidth(0.55);
  doc.rect(x, y, w, h);
  doc.setLineWidth(0.22);
  doc.rect(x + 0.9, y + 0.9, w - 1.8, h - 1.8);

  const cell = Math.max(6.5, Math.min(w * 0.7, 10));
  const cx = x + w / 2;
  const count = Math.max(4, Math.floor((h - 4) / (cell * 1.9)));
  const step = (h - 4) / count;
  for (let i = 0; i < count; i += 1) {
    const cy = y + 2 + step * (i + 0.5) + cell * 0.1;
    drawGeometricHornCell(doc, cx, cy, cell * 0.5, ink);
  }
}

/** Dense corner medallion — layered angular horns. */
export function drawAncientCornerMedallion(
  doc: jsPDF,
  x: number,
  y: number,
  facing: "tl" | "tr" | "bl" | "br",
  ink: Rgb,
  dye: Rgb,
  size = 16
) {
  const sx = facing === "tl" || facing === "bl" ? 1 : -1;
  const sy = facing === "tl" || facing === "tr" ? 1 : -1;

  doc.setFillColor(...dye);
  doc.rect(
    Math.min(x, x + sx * size),
    Math.min(y, y + sy * size),
    size,
    size,
    "F"
  );
  doc.setDrawColor(...ink);
  doc.setLineWidth(0.7);
  doc.rect(
    Math.min(x, x + sx * size),
    Math.min(y, y + sy * size),
    size,
    size
  );

  // Nested stepped L frames
  for (const o of [1.6, 3.2, 4.8]) {
    doc.setLineWidth(o === 1.6 ? 0.55 : 0.28);
    doc.line(x + sx * o, y + sy * o, x + sx * (size - o * 0.4), y + sy * o);
    doc.line(x + sx * o, y + sy * o, x + sx * o, y + sy * (size - o * 0.4));
  }

  // Horn curl into corner (dense multi-stroke)
  const hx = x + sx * size * 0.48;
  const hy = y + sy * size * 0.48;
  for (const o of [0, 0.7, 1.4]) {
    doc.setLineWidth(0.4 - o * 0.08);
    doc.line(hx - sx * o * 0.2, hy - sy * o * 0.2, hx + sx * size * 0.28, hy + sy * size * 0.05);
    doc.line(hx + sx * size * 0.28, hy + sy * size * 0.05, hx + sx * size * 0.42, hy + sy * size * 0.32);
    doc.line(hx + sx * size * 0.42, hy + sy * size * 0.32, hx + sx * size * 0.18, hy + sy * size * 0.46);
    doc.line(hx - sx * o * 0.2, hy - sy * o * 0.2, hx + sx * size * 0.05, hy + sy * size * 0.28);
    doc.line(hx + sx * size * 0.05, hy + sy * size * 0.28, hx + sx * size * 0.28, hy + sy * size * 0.44);
  }

  // Filled diamond at origin
  doc.setFillColor(...ink);
  const d = 2.2;
  doc.triangle(x + sx * d, y, x, y + sy * d, x + sx * d, y + sy * 2 * d, "F");
  doc.triangle(x + sx * d * 2, y + sy * d, x + sx * d, y, x + sx * d, y + sy * 2 * d, "F");
}

/**
 * Full ancient Тізім frame: wide өрнек belts on all sides + corner medallions.
 * Looks like a киіз / сырмақ panel, not a modern certificate.
 */
export function drawAncientTizimFrame(
  doc: jsPDF,
  pageW: number,
  pageH: number,
  ink: Rgb,
  dye: Rgb,
  parchment: Rgb
) {
  const outer = 5;
  const belt = 11;

  // Outer soot frame
  doc.setDrawColor(...ink);
  doc.setLineWidth(1.8);
  doc.rect(outer, outer, pageW - outer * 2, pageH - outer * 2);

  // Dye fill for belt area (between outer and inner)
  doc.setFillColor(...dye);
  // top
  doc.rect(outer + 1.2, outer + 1.2, pageW - (outer + 1.2) * 2, belt, "F");
  // bottom
  doc.rect(outer + 1.2, pageH - outer - 1.2 - belt, pageW - (outer + 1.2) * 2, belt, "F");
  // left
  doc.rect(outer + 1.2, outer + 1.2 + belt, belt, pageH - (outer + 1.2) * 2 - belt * 2, "F");
  // right
  doc.rect(
    pageW - outer - 1.2 - belt,
    outer + 1.2 + belt,
    belt,
    pageH - (outer + 1.2) * 2 - belt * 2,
    "F"
  );

  // Ornament strips
  drawOrnamentStripH(doc, outer + 1.2 + belt, outer + 1.2, pageW - (outer + 1.2) * 2 - belt * 2, belt, ink, dye);
  drawOrnamentStripH(
    doc,
    outer + 1.2 + belt,
    pageH - outer - 1.2 - belt,
    pageW - (outer + 1.2) * 2 - belt * 2,
    belt,
    ink,
    dye
  );
  drawOrnamentStripV(doc, outer + 1.2, outer + 1.2 + belt, belt, pageH - (outer + 1.2) * 2 - belt * 2, ink, dye);
  drawOrnamentStripV(
    doc,
    pageW - outer - 1.2 - belt,
    outer + 1.2 + belt,
    belt,
    pageH - (outer + 1.2) * 2 - belt * 2,
    ink,
    dye
  );

  // Corner medallions (overlap belt junctions)
  const c = outer + 1.2;
  drawAncientCornerMedallion(doc, c, c, "tl", ink, dye, belt + 1);
  drawAncientCornerMedallion(doc, pageW - c, c, "tr", ink, dye, belt + 1);
  drawAncientCornerMedallion(doc, c, pageH - c, "bl", ink, dye, belt + 1);
  drawAncientCornerMedallion(doc, pageW - c, pageH - c, "br", ink, dye, belt + 1);

  // Inner field frame (sharp, triple)
  const ix = outer + 1.2 + belt + 1.5;
  const iy = outer + 1.2 + belt + 1.5;
  const iw = pageW - ix * 2;
  const ih = pageH - iy * 2;
  doc.setFillColor(...parchment);
  doc.rect(ix, iy, iw, ih, "F");
  doc.setDrawColor(...ink);
  doc.setLineWidth(1.1);
  doc.rect(ix, iy, iw, ih);
  doc.setLineWidth(0.35);
  doc.rect(ix + 1.8, iy + 1.8, iw - 3.6, ih - 3.6);
  doc.setLineWidth(0.18);
  doc.rect(ix + 3.2, iy + 3.2, iw - 6.4, ih - 6.4);

  return { contentX: ix + 5, contentY: iy + 5, contentW: iw - 10, contentH: ih - 10 };
}

/** Hand-ruled manuscript separator with horn knot. */
export function drawAncientRule(
  doc: jsPDF,
  x1: number,
  x2: number,
  y: number,
  ink: Rgb
) {
  doc.setDrawColor(...ink);
  doc.setLineWidth(0.35);
  doc.line(x1, y, x2, y);
  doc.setLineWidth(0.15);
  doc.line(x1, y + 0.7, x2, y + 0.7);
  const mx = (x1 + x2) / 2;
  drawGeometricHornCell(doc, mx, y + 0.2, 3.2, ink);
}

/** Angular label box for generation name (Өзі, Әке…) — no radius. */
export function drawAncientLabelBox(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  ink: Rgb,
  dye: Rgb
) {
  doc.setFillColor(...dye);
  doc.rect(x, y, w, h, "F");
  doc.setDrawColor(...ink);
  doc.setLineWidth(0.5);
  doc.rect(x, y, w, h);
  doc.setLineWidth(0.2);
  doc.rect(x + 1, y + 1, w - 2, h - 2);
  // Corner ticks
  const t = Math.min(2.2, h * 0.35);
  doc.setLineWidth(0.35);
  doc.line(x + 1.5, y + 1.5, x + 1.5 + t, y + 1.5);
  doc.line(x + 1.5, y + 1.5, x + 1.5, y + 1.5 + t);
  doc.line(x + w - 1.5, y + 1.5, x + w - 1.5 - t, y + 1.5);
  doc.line(x + w - 1.5, y + 1.5, x + w - 1.5, y + 1.5 + t);
}
