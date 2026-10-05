import { createLogger } from "@/lib/logger";

const log = createLogger("db");

interface PgLikeError {
  code?: string;
  message?: string;
}

/**
 * Turns a Supabase/Postgres error into text that is safe to show a user.
 *
 * Raw `error.message` names constraints, triggers, policies and tables —
 * useful to an attacker mapping the schema, useless to a client. The full
 * error is logged server-side; the user gets a stable, plain sentence.
 */
export function toUserError(error: unknown, fallback: string): string {
  const pg = (error ?? {}) as PgLikeError;
  log.error(fallback, { code: pg.code, cause: error });

  switch (pg.code) {
    case "23505":
      return "That already exists.";
    case "42501":
      return "You don't have permission to do that.";
    case "23514":
    case "P0001":
      return "That change isn't allowed.";
    case "23503":
      return "That record no longer exists.";
    default:
      return fallback;
  }
}
