import { describe, it, expect } from "vitest";
import { canChat } from "@/lib/utils/booking";

describe("canChat", () => {
  it("allows chat for CONFIRMED bookings", () => {
    expect(canChat("CONFIRMED")).toBe(true);
  });

  it("allows chat for DEPOSIT_PAID bookings", () => {
    expect(canChat("DEPOSIT_PAID")).toBe(true);
  });

  it("allows chat for COMPLETED bookings", () => {
    expect(canChat("COMPLETED")).toBe(true);
  });

  it("blocks chat for PENDING bookings", () => {
    expect(canChat("PENDING")).toBe(false);
  });

  it("blocks chat for DECLINED bookings", () => {
    expect(canChat("DECLINED")).toBe(false);
  });

  it("blocks chat for CANCELLED bookings", () => {
    expect(canChat("CANCELLED")).toBe(false);
  });
});
