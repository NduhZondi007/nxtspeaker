import { describe, it, expect } from "vitest";
import {
  getBookingStatusColor,
  getBookingStatusLabel,
  canChat,
} from "@/lib/utils/booking";
import type { BookingStatus } from "@/lib/types/database";

describe("getBookingStatusColor", () => {
  it("returns a hex color for every known status", () => {
    const statuses: BookingStatus[] = [
      "PENDING", "CONFIRMED", "DEPOSIT_PAID", "COMPLETED", "CANCELLED", "DECLINED",
    ];
    statuses.forEach((s) => {
      expect(getBookingStatusColor(s)).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });
  });
});

describe("getBookingStatusLabel", () => {
  it("returns human-readable labels", () => {
    expect(getBookingStatusLabel("DEPOSIT_PAID")).toBe("Deposit Paid");
    expect(getBookingStatusLabel("PENDING")).toBe("Pending");
    expect(getBookingStatusLabel("COMPLETED")).toBe("Completed");
  });
});

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
