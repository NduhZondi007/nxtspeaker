/**
 * Escapes a user-supplied value for interpolation into a PostgREST filter
 * string (the argument to supabase-js `.or()`, which is passed through
 * verbatim).
 *
 * Unescaped, a search term containing `,` or `)` closes the current
 * condition and injects new ones — e.g. searching for
 * `x,role.eq.ADMIN` rewrites the query's logic. Double-quoting the value
 * makes PostgREST treat every reserved character inside it as a literal.
 */
export function escapePostgrestFilterValue(value: string): string {
  const escaped = value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return `"${escaped}"`;
}

/**
 * Escapes LIKE/ILIKE wildcards so a search term is matched literally, then
 * wraps it in the `%…%` "contains" pattern.
 */
export function containsPattern(value: string): string {
  return `%${value.replace(/([\\%_])/g, "\\$1")}%`;
}
