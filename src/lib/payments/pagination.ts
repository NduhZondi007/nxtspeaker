/** Offset pagination for the admin ledgers (`?page=`). */

export const PAGE_SIZE = 50;
const MAX_PAGE = 10_000;

export function parsePage(raw: string | string[] | undefined): number {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value || !/^\d+$/.test(value)) return 1;
  const page = Number(value);
  if (page < 1) return 1;
  return Math.min(page, MAX_PAGE);
}

/**
 * Inclusive `.range(from, to)` bounds for a page, one row longer than the
 * page itself: if that extra row comes back, a next page exists. This avoids
 * a `count: "exact"` scan on every render.
 */
export function pageRange(page: number, size: number = PAGE_SIZE): { from: number; to: number } {
  const from = (page - 1) * size;
  return { from, to: from + size };
}
