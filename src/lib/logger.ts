/**
 * The one place allowed to call console.* (ESLint `no-console` enforces it).
 *
 * Emits one JSON object per line so Vercel's log search can filter by
 * `scope` and `level`, and serialises Error objects — `JSON.stringify(err)`
 * on its own yields `{}` and loses the message.
 */

type Level = "info" | "warn" | "error";
type Meta = Record<string, unknown>;

export interface Logger {
  info(msg: string, meta?: Meta): void;
  warn(msg: string, meta?: Meta): void;
  error(msg: string, meta?: Meta): void;
}

function serialise(value: unknown): unknown {
  if (value instanceof Error) {
    return { name: value.name, message: value.message, stack: value.stack };
  }
  return value;
}

function write(level: Level, scope: string, msg: string, meta: Meta = {}): void {
  const entry: Meta = { level, scope, msg };
  for (const [key, value] of Object.entries(meta)) entry[key] = serialise(value);

  let line: string;
  try {
    line = JSON.stringify(entry);
  } catch {
    // Circular or otherwise unserialisable meta: keep the message, drop the rest.
    line = JSON.stringify({ level, scope, msg, meta: "[unserialisable]" });
  }

  // eslint-disable-next-line no-console -- this module is the sanctioned sink
  console[level](line);
}

export function createLogger(scope: string): Logger {
  return {
    info: (msg, meta) => write("info", scope, msg, meta),
    warn: (msg, meta) => write("warn", scope, msg, meta),
    error: (msg, meta) => write("error", scope, msg, meta),
  };
}
