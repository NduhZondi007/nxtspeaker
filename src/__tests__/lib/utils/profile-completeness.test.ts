import { describe, it, expect } from "vitest";
import {
  PROFILE_COMPLETENESS_FIELDS,
  getProfileCompleteness,
  isSpeakerListable,
} from "@/lib/utils/profile-completeness";
import type { Profile, SpeakerProfile } from "@/lib/types/database";

const completeProfile = { avatar_url: "https://cdn.example/a.png" } as Partial<Profile>;

const completeSpeaker = {
  status: "ACTIVE",
  bio: "Twenty years on stage.",
  expertise: ["Leadership"],
  languages: ["English"],
  location: "Johannesburg",
  speaking_fee_zar: 85000,
  photo_urls: ["https://cdn.example/p1.png"],
} as Partial<SpeakerProfile>;

describe("getProfileCompleteness", () => {
  it("reports 100% only when every field is filled in", () => {
    const result = getProfileCompleteness(completeSpeaker, completeProfile);
    expect(result.percent).toBe(100);
    expect(result.isComplete).toBe(true);
    expect(result.missing).toEqual([]);
  });

  it("counts a profile photo and a portfolio photo as required", () => {
    expect(
      getProfileCompleteness({ ...completeSpeaker }, { avatar_url: null }).isComplete
    ).toBe(false);
    expect(
      getProfileCompleteness({ ...completeSpeaker, photo_urls: [] }, completeProfile).isComplete
    ).toBe(false);
  });

  it("names what is still missing so the speaker can act on it", () => {
    const result = getProfileCompleteness(
      { ...completeSpeaker, bio: "", photo_urls: [] },
      { avatar_url: null }
    );
    expect(result.missing.map((f) => f.key).sort()).toEqual([
      "avatar_url",
      "bio",
      "photo_urls",
    ]);
    expect(result.isComplete).toBe(false);
  });

  it("treats a whitespace-only string as missing", () => {
    expect(getProfileCompleteness({ ...completeSpeaker, bio: "   " }, completeProfile).isComplete)
      .toBe(false);
    expect(getProfileCompleteness({ ...completeSpeaker, location: " " }, completeProfile).isComplete)
      .toBe(false);
  });

  it("treats an unset fee of 0 as missing, since that is the column default", () => {
    expect(
      getProfileCompleteness({ ...completeSpeaker, speaking_fee_zar: 0 }, completeProfile).isComplete
    ).toBe(false);
  });

  it("accepts a numeric fee that arrives as a string from Postgres", () => {
    expect(
      getProfileCompleteness(
        { ...completeSpeaker, speaking_fee_zar: "85000" as unknown as number },
        completeProfile
      ).isComplete
    ).toBe(true);
  });

  it("reads the avatar off the embedded profiles join when no profile is passed", () => {
    const joined = { ...completeSpeaker, profiles: completeProfile as Profile };
    expect(getProfileCompleteness(joined).isComplete).toBe(true);
  });

  it("returns 0% and every field missing for an empty profile", () => {
    const result = getProfileCompleteness(null, null);
    expect(result.percent).toBe(0);
    expect(result.isComplete).toBe(false);
    expect(result.missing).toHaveLength(PROFILE_COMPLETENESS_FIELDS.length);
  });

  it("scales the percentage with the number of completed fields", () => {
    // Every field missing except the two array fields, which default non-empty.
    const result = getProfileCompleteness(
      { expertise: ["Leadership"], languages: ["English"] } as Partial<SpeakerProfile>,
      null
    );
    const total = PROFILE_COMPLETENESS_FIELDS.length;
    expect(result.percent).toBe(Math.round((2 / total) * 100));
  });
});

describe("isSpeakerListable", () => {
  it("lists an active, fully complete speaker", () => {
    expect(isSpeakerListable(completeSpeaker, completeProfile)).toBe(true);
  });

  it("hides a complete speaker who is not ACTIVE", () => {
    for (const status of ["INACTIVE", "PENDING_REVIEW"] as const) {
      expect(isSpeakerListable({ ...completeSpeaker, status }, completeProfile)).toBe(false);
    }
  });

  it("hides an active speaker with an incomplete profile", () => {
    expect(isSpeakerListable({ ...completeSpeaker, bio: null }, completeProfile)).toBe(false);
    expect(isSpeakerListable({ ...completeSpeaker, photo_urls: [] }, completeProfile)).toBe(false);
    expect(isSpeakerListable(completeSpeaker, { avatar_url: null })).toBe(false);
  });

  it("hides a null speaker rather than throwing", () => {
    expect(isSpeakerListable(null)).toBe(false);
  });
});
