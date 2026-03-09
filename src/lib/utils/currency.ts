/**
 * Formats a number as South African Rand
 * @param amount - numeric value (e.g. 85000)
 * @returns formatted string (e.g. "R 85,000")
 */
export function formatZAR(amount: number): string {
  return `R ${amount.toLocaleString("en-ZA", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}
