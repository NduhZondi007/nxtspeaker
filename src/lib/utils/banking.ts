/**
 * Masks a bank account number to its last four digits.
 *
 * Used everywhere an account number is displayed except the speaker's own
 * banking form and the admin payout modal, where the full number is revealed
 * behind an explicit action. A full account number should never sit on screen
 * in a list, an export preview, or a screenshot someone takes of a dashboard.
 *
 * @example maskAccountNumber("1234567890") // "•••• 7890"
 */
export function maskAccountNumber(accountNumber: string | null | undefined): string {
  if (!accountNumber) return "••••";

  const digits = accountNumber.replace(/\D/g, "");
  if (digits.length === 0) return "••••";

  // Too short to mask meaningfully — hide it entirely rather than revealing
  // most of it.
  if (digits.length <= 4) return "••••";

  return `•••• ${digits.slice(-4)}`;
}
