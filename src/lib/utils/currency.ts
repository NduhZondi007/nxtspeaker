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
