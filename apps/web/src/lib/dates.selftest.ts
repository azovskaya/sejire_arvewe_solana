import { normalizeDateInput, yearFromDate } from "./dates";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

assert(normalizeDateInput("1998") === "1998", "year only");
assert(normalizeDateInput("15.03.1998") === "1998-03-15", "dot date");
assert(normalizeDateInput("1998-03-15") === "1998-03-15", "iso");
assert(yearFromDate("15.03.1998") === "1998", "year from dot");
assert(yearFromDate("1998-03-15") === "1998", "year from iso");
assert(yearFromDate("008") === null, "short junk has no year");
// typing fragment must stay as-is until blur normalize of incomplete
assert(normalizeDateInput("19") === "19", "keep incomplete year text");
assert(normalizeDateInput("198") === "198", "keep 3-digit while incomplete");

import { formatPersonDate } from "./dates";
assert(formatPersonDate("1998-03-15") === "15.03.1998", "format full");
assert(formatPersonDate("1998") === "1998", "format year");

console.log("dates.selftest: OK");
