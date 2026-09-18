/**
 * Formats a number as South African Rand.
 *
 * Grouping is done explicitly rather than via `toLocaleString("en-ZA")`:
 * the en-ZA CLDR group separator is a (non-breaking) space, not a comma, and
 * which one you get depends on the ICU data compiled into the running
 * JavaScript engine. That made the output both wrong (the documented and
 * tested contract is "R 85,000") and *inconsistent between server and
 * browser*, which surfaces as a React hydration mismatch on every page that
 * renders a fee.
 *
 * @param amount - numeric value (e.g. 85000). Numeric strings are accepted
 *   because Postgres `NUMERIC` columns can arrive as strings.
 * @returns formatted string (e.g. "R 85,000")
 */
export function formatZAR(amount: number | string | null | undefined): string {
  const value = typeof amount === "string" ? Number(amount) : amount;

  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "R 0";
  }

  const rounded = Math.round(value as number);
  const negative = rounded < 0;
  const digits = Math.abs(rounded).toString();
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  return `R ${negative ? "-" : ""}${grouped}`;
}

/**
 * Formats an exact cent amount as South African Rand, cents included.
 *
 * `formatZAR` above deliberately rounds to whole rand — that is the right
 * treatment for a speaker's listed fee, and its "R 85,000" output is a tested
 * contract. It is the wrong treatment for money that has actually moved: a
 * R 1,234.56 refund must never render as "R 1,235" in a ledger.
 *
 * Grouping is hand-rolled for the same reason documented on `formatZAR` — the
 * en-ZA CLDR group separator is engine-dependent and caused hydration
 * mismatches.
 *
 * Use this for anything sourced from a `*_cents` column; use `formatZAR` for
 * `quoted_fee_zar` and `speaking_fee_zar`.
 *
 * @param cents - whole cents (e.g. 8500000). Numeric strings are accepted
 *   because Postgres `BIGINT` can arrive as a string over PostgREST.
 * @returns formatted string (e.g. "R 85,000.00")
 */
export function formatZARCents(cents: number | string | null | undefined): string {
  const value = typeof cents === "string" ? Number(cents) : cents;

  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "R 0.00";
  }

  const rounded = Math.round(value as number);
  const negative = rounded < 0;
  const absolute = Math.abs(rounded);

  const rand = Math.floor(absolute / 100).toString();
  const remainder = (absolute % 100).toString().padStart(2, "0");
  const grouped = rand.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  return `R ${negative ? "-" : ""}${grouped}.${remainder}`;
}
