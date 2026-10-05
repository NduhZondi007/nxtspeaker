// @vitest-environment node

import { describe, it, expect, afterEach } from "vitest";
import { getYocoKeyMode } from "@/lib/payments/config";

const original = process.env.YOCO_SECRET_KEY;

afterEach(() => {
  if (original === undefined) delete process.env.YOCO_SECRET_KEY;
  else process.env.YOCO_SECRET_KEY = original;
});

describe("getYocoKeyMode", () => {
  it("reports live for an sk_live_ key", () => {
    process.env.YOCO_SECRET_KEY = "sk_live_123";
    expect(getYocoKeyMode()).toBe("live");
  });

  it("reports test for an sk_test_ key", () => {
    process.env.YOCO_SECRET_KEY = "sk_test_123";
    expect(getYocoKeyMode()).toBe("test");
  });

  it("returns null rather than throwing when no key is set", () => {
    delete process.env.YOCO_SECRET_KEY;
    expect(getYocoKeyMode()).toBeNull();
  });
});
