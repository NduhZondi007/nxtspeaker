/**
 * The admin money tiles, computed by the `admin_money_totals()` RPC over the
 * whole ledger rather than in JS over a truncated list of rows.
 *
 * Every figure is bigint cents. PostgREST serialises bigint as a string once
 * it exceeds JS's safe range, and may do so for smaller values too, so each
 * field is coerced and validated here.
 */

export interface AdminMoneyTotals {
  /** Gross captured from clients. */
  collected: number;
  /** Platform commission on captured payments. */
  commission: number;
  /** Payouts not yet PAID or CANCELLED — what the platform still owes speakers. */
  owed: number;
  refunded: number;
  payouts_open: number;
  payouts_paid: number;
}

const FIELDS: (keyof AdminMoneyTotals)[] = [
  "collected",
  "commission",
  "owed",
  "refunded",
  "payouts_open",
  "payouts_paid",
];

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

/**
 * Returns null on anything malformed. A missing figure is rendered as an
 * error, never as R 0 — a zero on a money tile reads as a fact.
 */
export function parseAdminMoneyTotals(data: unknown): AdminMoneyTotals | null {
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== "object") return null;

  const record = row as Record<string, unknown>;
  const totals = {} as AdminMoneyTotals;

  for (const field of FIELDS) {
    const value = toFiniteNumber(record[field]);
    if (value === null) return null;
    totals[field] = value;
  }

  return totals;
}
