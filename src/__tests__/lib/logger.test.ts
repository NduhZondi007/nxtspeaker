import { describe, it, expect, vi, afterEach } from "vitest";
import { createLogger } from "@/lib/logger";

afterEach(() => vi.restoreAllMocks());

function lastLine(spy: ReturnType<typeof vi.spyOn>) {
  return JSON.parse(spy.mock.calls.at(-1)![0] as string);
}

describe("createLogger", () => {
  it("writes one JSON line with level, scope and message", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    createLogger("yoco-webhook").warn("rejected", { reason: "stale" });

    expect(lastLine(spy)).toMatchObject({
      level: "warn",
      scope: "yoco-webhook",
      msg: "rejected",
      reason: "stale",
    });
  });

  it("serialises Error objects instead of logging {}", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    createLogger("payments").error("provider threw", { cause: new TypeError("boom") });

    expect(lastLine(spy).cause).toMatchObject({ name: "TypeError", message: "boom" });
  });

  it("keeps working when meta cannot be stringified", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    createLogger("x").error("odd", { circular });

    expect(lastLine(spy)).toMatchObject({ scope: "x", msg: "odd" });
  });
});
