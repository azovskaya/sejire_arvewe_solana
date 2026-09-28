/**
 * Flexible genealogy dates: year-only or full day.
 * Stored preferably as YYYY, YYYY-MM, or YYYY-MM-DD.
 * Also accepts DD.MM.YYYY while typing / on blur.
 */

export function normalizeDateInput(raw: string): string {
  const s = raw.trim();
  if (!s) return "";

  // Already ISO-ish
  if (/^\d{4}$/.test(s)) return s;
  if (/^\d{4}-\d{2}$/.test(s)) return s;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // DD.MM.YYYY or D.M.YYYY
  const dot = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (dot) {
    const dd = dot[1].padStart(2, "0");
    const mm = dot[2].padStart(2, "0");
    const yyyy = dot[3];
    if (validYmd(yyyy, mm, dd)) return `${yyyy}-${mm}-${dd}`;
  }

  // DD.MM.YY → assume 19xx if YY>=30 else 20xx (genealogy-friendly)
  const dot2 = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2})$/);
  if (dot2) {
    const dd = dot2[1].padStart(2, "0");
    const mm = dot2[2].padStart(2, "0");
    const yy = Number(dot2[3]);
    const yyyy = String(yy >= 30 ? 1900 + yy : 2000 + yy);
    if (validYmd(yyyy, mm, dd)) return `${yyyy}-${mm}-${dd}`;
  }

  // YYYY.MM.DD
  const ymdDot = s.match(/^(\d{4})\.(\d{1,2})\.(\d{1,2})$/);
  if (ymdDot) {
    const yyyy = ymdDot[1];
    const mm = ymdDot[2].padStart(2, "0");
    const dd = ymdDot[3].padStart(2, "0");
    if (validYmd(yyyy, mm, dd)) return `${yyyy}-${mm}-${dd}`;
  }

  return s;
}

function validYmd(y: string, m: string, d: string) {
  const yi = Number(y);
  const mi = Number(m);
  const di = Number(d);
  if (yi < 1000 || yi > 2100 || mi < 1 || mi > 12 || di < 1 || di > 31) return false;
  const dt = new Date(Date.UTC(yi, mi - 1, di));
  return dt.getUTCFullYear() === yi && dt.getUTCMonth() === mi - 1 && dt.getUTCDate() === di;
}

/** Year for display on cards / PDF */
export function yearFromDate(value?: string | null): string | null {
  if (!value) return null;
  const n = normalizeDateInput(value);
  if (/^\d{4}/.test(n)) {
    const y = n.slice(0, 4);
    return /^\d{4}$/.test(y) ? y : null;
  }
  const dig = value.trim().match(/(\d{4})/);
  return dig ? dig[1] : null;
}

/** Human date for PDF: 15.03.1990, 03.1990, or 1990 */
export function formatPersonDate(value?: string | null): string | null {
  if (!value?.trim()) return null;
  const n = normalizeDateInput(value.trim());
  if (/^\d{4}-\d{2}-\d{2}$/.test(n)) {
    const [y, m, d] = n.split("-");
    return `${d}.${m}.${y}`;
  }
  if (/^\d{4}-\d{2}$/.test(n)) {
    const [y, m] = n.split("-");
    return `${m}.${y}`;
  }
  if (/^\d{4}$/.test(n)) return n;
  return yearFromDate(value);
}

export function isLooseDateTyping(value: string) {
  // Allow incomplete strings while the user types (don't normalize yet)
  return /^[\d.\-/\s]*$/.test(value);
}
