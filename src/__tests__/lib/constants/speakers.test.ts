import { describe, it, expect } from "vitest";
import {
  EXPERTISE_OPTIONS,
  LANGUAGE_OPTIONS,
  TIER_LABELS,
  getTierLabel,
} from "@/lib/constants/speakers";

describe("speaker constants", () => {
  it("has no duplicate expertise or language options", () => {
    expect(new Set(EXPERTISE_OPTIONS).size).toBe(EXPERTISE_OPTIONS.length);
    expect(new Set(LANGUAGE_OPTIONS).size).toBe(LANGUAGE_OPTIONS.length);
  });

  it("includes every option previously offered by the profile editor, the filters and the admin modal", () => {
    for (const tag of ["Leadership", "AI", "ESG", "Healthcare", "DEI & Inclusion", "Wellness", "Entertainment"]) {
      expect(EXPERTISE_OPTIONS).toContain(tag);
    }
    for (const lang of ["English", "Afrikaans", "Zulu", "Swahili", "Venda", "Tsonga"]) {
      expect(LANGUAGE_OPTIONS).toContain(lang);
    }
  });

  it("maps levels 1-5 to tier labels", () => {
    expect(TIER_LABELS).toHaveLength(5);
    expect(getTierLabel(1)).toBe("Emerging Talent");
    expect(getTierLabel(5)).toBe("Celebrity Speaker");
  });

  it("falls back to 'Speaker' for a missing or out-of-range level", () => {
    expect(getTierLabel(null)).toBe("Speaker");
    expect(getTierLabel(undefined)).toBe("Speaker");
    expect(getTierLabel(0)).toBe("Speaker");
    expect(getTierLabel(9)).toBe("Speaker");
  });
});
