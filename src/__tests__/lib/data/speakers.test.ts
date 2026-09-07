import { describe, it, expect, vi } from "vitest";
import { getSpeakers, filterBySearch, DEFAULT_SPEAKER_FILTERS } from "@/lib/data/speakers";
import type { SpeakerProfile } from "@/lib/types/database";
import type { FilterState } from "@/components/speakers/SpeakerFilters";

function makeSpeaker(overrides: Partial<SpeakerProfile> = {}): SpeakerProfile {
  return {
    id: "sp-1",
    user_id: "user-1",
    title: "Keynote Speaker",
    bio: "Talks about leadership.",
    expertise: ["Leadership"],
    languages: ["English"],
    location: "Cape Town",
    speaking_fee_zar: 10000,
    fee_currency: "ZAR",
    level: 1,
    available: true,
    virtual_available: true,
    hybrid_available: false,
    tags: [],
    total_events: 5,
    avg_rating: 4.5,
    profile_video_url: null,
    // Defaults describe a LISTABLE speaker: getSpeakers now hides anything short
    // of a 100%-complete profile, so the baseline fixture has to satisfy that.
    photo_urls: ["https://cdn.example/portfolio-1.png"],
    status: "ACTIVE",
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
    profiles: {
      id: "user-1",
      role: "SPEAKER",
      base_role: "SPEAKER",
      full_name: "Jane Doe",
      email: "jane@example.com",
      phone: null,
      company: null,
      avatar_url: "https://cdn.example/avatar.png",
      created_at: "2026-01-01",
      updated_at: "2026-01-01",
    },
    ...overrides,
  };
}

/** Minimal chainable mock of the Supabase query builder used by getSpeakers. */
function makeQueryMock(result: { data: unknown; error: { message: string } | null }) {
  const query: Record<string, ReturnType<typeof vi.fn>> = {};
  const chainable = ["select", "eq", "gte", "lte", "overlaps", "order"];
  for (const method of chainable) {
    query[method] = vi.fn(() => query);
  }
  // Query builders are "thenable" — awaiting them resolves the result.
  (query as unknown as { then: PromiseLike<unknown>["then"] }).then = (resolve) =>
    Promise.resolve(result).then(resolve);

  const from = vi.fn(() => query);
  const supabase = { from } as unknown as Parameters<typeof getSpeakers>[0];
  return { supabase, from, query };
}

describe("filterBySearch", () => {
  const speakers = [
    makeSpeaker({ id: "1", title: "AI Futurist" }),
    makeSpeaker({ id: "2", title: "Change Expert", profiles: { ...makeSpeaker().profiles!, full_name: "Sam Ndlovu" } }),
  ];

  it("matches on title case-insensitively", () => {
    expect(filterBySearch(speakers, "futurist").map((s) => s.id)).toEqual(["1"]);
  });

  it("matches on speaker name", () => {
    expect(filterBySearch(speakers, "ndlovu").map((s) => s.id)).toEqual(["2"]);
  });

  it("returns no results when nothing matches", () => {
    expect(filterBySearch(speakers, "nonexistent")).toEqual([]);
  });
});

describe("getSpeakers", () => {
  it("queries the ACTIVE speaker_profiles table and returns rows on success", async () => {
    const speaker = makeSpeaker();
    const { supabase, from, query } = makeQueryMock({ data: [speaker], error: null });

    const result = await getSpeakers(supabase, DEFAULT_SPEAKER_FILTERS);

    expect(from).toHaveBeenCalledWith("speaker_profiles");
    expect(query.eq).toHaveBeenCalledWith("status", "ACTIVE");
    expect(query.order).toHaveBeenCalledWith("avg_rating", { ascending: false });
    expect(result).toEqual({ data: [speaker], error: null });
  });

  it("applies fee, availability, format and expertise filters", async () => {
    const { supabase, query } = makeQueryMock({ data: [], error: null });
    const filters: FilterState = {
      ...DEFAULT_SPEAKER_FILTERS,
      available: true,
      minFee: 5000,
      maxFee: 50000,
      expertise: ["AI"],
      format: "virtual",
      sort: "fee_asc",
    };

    await getSpeakers(supabase, filters);

    expect(query.eq).toHaveBeenCalledWith("available", true);
    expect(query.gte).toHaveBeenCalledWith("speaking_fee_zar", 5000);
    expect(query.lte).toHaveBeenCalledWith("speaking_fee_zar", 50000);
    expect(query.overlaps).toHaveBeenCalledWith("expertise", ["AI"]);
    expect(query.eq).toHaveBeenCalledWith("virtual_available", true);
    expect(query.order).toHaveBeenCalledWith("speaking_fee_zar", { ascending: true });
  });

  it("applies the client-side search filter to the returned rows", async () => {
    const speakers = [makeSpeaker({ id: "1", title: "AI Futurist" }), makeSpeaker({ id: "2", title: "Sales Coach" })];
    const { supabase } = makeQueryMock({ data: speakers, error: null });

    const result = await getSpeakers(supabase, { ...DEFAULT_SPEAKER_FILTERS, search: "futurist" });

    expect(result.data.map((s) => s.id)).toEqual(["1"]);
  });

  it("returns an empty array plus the error message instead of throwing on query failure", async () => {
    const { supabase } = makeQueryMock({ data: null, error: { message: "permission denied" } });

    const result = await getSpeakers(supabase, DEFAULT_SPEAKER_FILTERS);

    expect(result).toEqual({ data: [], error: "permission denied" });
  });
});

describe("getSpeakers / profile-completeness gate", () => {
  it("hides an active speaker whose profile is not 100% complete", async () => {
    const incomplete = [
      makeSpeaker({ id: "no-bio", bio: null }),
      makeSpeaker({ id: "no-expertise", expertise: [] }),
      makeSpeaker({ id: "no-location", location: null }),
      makeSpeaker({ id: "no-fee", speaking_fee_zar: 0 }),
      makeSpeaker({ id: "no-portfolio-photos", photo_urls: [] }),
      makeSpeaker({
        id: "no-avatar",
        profiles: { ...makeSpeaker().profiles!, avatar_url: null },
      }),
    ];
    const { supabase } = makeQueryMock({ data: incomplete, error: null });

    const { data, error } = await getSpeakers(supabase, DEFAULT_SPEAKER_FILTERS);

    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("shows a speaker once every field, including both images, is filled in", async () => {
    const { supabase } = makeQueryMock({ data: [makeSpeaker({ id: "complete" })], error: null });

    const { data } = await getSpeakers(supabase, DEFAULT_SPEAKER_FILTERS);

    expect(data.map((s) => s.id)).toEqual(["complete"]);
  });

  it("returns only the complete speakers from a mixed result set", async () => {
    const { supabase } = makeQueryMock({
      data: [
        makeSpeaker({ id: "complete-1" }),
        makeSpeaker({ id: "incomplete", photo_urls: [] }),
        makeSpeaker({ id: "complete-2" }),
      ],
      error: null,
    });

    const { data } = await getSpeakers(supabase, DEFAULT_SPEAKER_FILTERS);

    expect(data.map((s) => s.id)).toEqual(["complete-1", "complete-2"]);
  });

  it("does not let an incomplete profile slip through via the search filter", async () => {
    const { supabase } = makeQueryMock({
      data: [makeSpeaker({ id: "hidden", photo_urls: [] })],
      error: null,
    });

    const { data } = await getSpeakers(supabase, { ...DEFAULT_SPEAKER_FILTERS, search: "Jane" });

    expect(data).toEqual([]);
  });
});
