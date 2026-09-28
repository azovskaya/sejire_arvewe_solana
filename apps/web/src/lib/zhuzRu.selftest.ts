/**
 * Zhuz / ru helpers self-test.
 * npm run test:zhuz
 */
import {
  formatShezhireAffiliation,
  isZhuzId,
  ruSuggestions,
  zhuzFullLabel,
} from "./zhuzRu";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

assert(isZhuzId("orta"), "orta");
assert(!isZhuzId("foo"), "reject");
assert(zhuzFullLabel("uly")?.includes("Ұлы"), "uly label");
assert(ruSuggestions("orta").includes("Арғын"), "orta rus");
assert(formatShezhireAffiliation(null, null) === "", "empty quiet");
assert(formatShezhireAffiliation("orta", "Арғын").includes("Арғын"), "both");
assert(formatShezhireAffiliation(null, "Найман") === "Найман", "ru only");

console.log("zhuzRu.selftest: OK");
