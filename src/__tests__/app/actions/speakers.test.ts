import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  supabaseState,
  resetSupabaseState,
  makeFakeClient,
  type QueryState,
} from "../../helpers/supabase-mock";

const { storage, speakerProfileId } = vi.hoisted(() => ({
  storage: { removed: [] as string[][], removeError: null as unknown },
  speakerProfileId: { value: "sp-1" as string | null, error: null as Error | null },
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/logger", () => ({
  createLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    ...makeFakeClient(),
    storage: {
      from: () => ({
        remove: async (paths: string[]) => {
          storage.removed.push(paths);
          return { data: null, error: storage.removeError };
        },
      }),
    },
  }),
}));
vi.mock("@/lib/auth/session", () => ({
  getMySpeakerProfileId: async () => {
    if (speakerProfileId.error) throw speakerProfileId.error;
    return speakerProfileId.value;
  },
}));

import {
  updateRider,
  updateSpeakerProfile,
  saveSpeakerPhotoUrl,
  removeSpeakerPhoto,
} from "@/app/actions/speakers";

const USER = "user-1";
const photo = (name: string) =>
  `https://abc.supabase.co/storage/v1/object/public/speaker-photos/${USER}/${name}.png`;

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://abc.supabase.co");
  resetSupabaseState();
  storage.removed = [];
  storage.removeError = null;
  speakerProfileId.value = "sp-1";
  speakerProfileId.error = null;
});

describe("updateRider", () => {
  it("rejects an unauthenticated caller", async () => {
    expect(await updateRider({ water_still: true })).toEqual({ error: "Not authenticated" });
  });

  it("returns an error when the caller has no speaker profile", async () => {
    supabaseState.user = { id: USER };
    speakerProfileId.value = null;
    expect(await updateRider({ water_still: true })).toEqual({ error: "Speaker profile not found" });
  });

  it("upserts on speaker_id so a missing rider row is created, scoped to the caller's own profile", async () => {
    supabaseState.user = { id: USER };
    supabaseState.responders.hospitality_riders = () => ({ data: null, error: null });

    const result = await updateRider({
      water_still: false,
      speaker_id: "someone-elses-profile",
    } as never);

    expect(result).toEqual({ success: true });
    expect(supabaseState.writes).toEqual([
      expect.objectContaining({
        table: "hospitality_riders",
        op: "upsert",
        payload: { water_still: false, speaker_id: "sp-1" },
      }),
    ]);
  });

  it("does not echo the raw database error", async () => {
    supabaseState.user = { id: USER };
    supabaseState.responders.hospitality_riders = () => ({
      data: null,
      error: { code: "XX000", message: 'constraint "hospitality_riders_pkey" internal detail' },
    });

    const result = await updateRider({ water_still: true });

    expect(result.error).toBeTruthy();
    expect(result.error).not.toMatch(/hospitality_riders_pkey/);
  });
});

describe("updateSpeakerProfile", () => {
  it("does not echo the raw database error", async () => {
    supabaseState.user = { id: USER };
    supabaseState.responders.speaker_profiles = () => ({
      data: null,
      error: { code: "XX000", message: "speaker_profiles_level_check" },
    });

    const result = await updateSpeakerProfile({ title: "Keynote" });

    expect(result.error).toBeTruthy();
    expect(result.error).not.toMatch(/level_check/);
  });
});

/** speaker_profiles responder: reads return the current list, CAS updates succeed while the list is unchanged. */
function photoTable(initial: string[] | null, opts: { readError?: unknown; conflictTimes?: number } = {}) {
  let current = initial;
  let conflicts = opts.conflictTimes ?? 0;
  return (state: QueryState) => {
    if (state.op === "select") {
      if (opts.readError) return { data: null, error: opts.readError };
      return { data: { photo_urls: current }, error: null };
    }
    if (state.op === "update") {
      if (conflicts > 0) {
        conflicts--;
        return { data: [], error: null };
      }
      current = state.payload!.photo_urls as string[];
      return { data: [{ id: "sp-1" }], error: null };
    }
    throw new Error(`unexpected op ${state.op}`);
  };
}

describe("saveSpeakerPhotoUrl", () => {
  beforeEach(() => {
    supabaseState.user = { id: USER };
  });

  it("returns an error instead of treating a failed read as 'no profile'", async () => {
    supabaseState.responders.speaker_profiles = photoTable(null, {
      readError: { code: "57014", message: "statement timeout" },
    });

    const result = await saveSpeakerPhotoUrl(photo("a"));

    expect(result.error).toBe("Could not save the photo. Please try again.");
    expect(supabaseState.writes).toEqual([]);
  });

  it("refuses a sixth photo", async () => {
    supabaseState.responders.speaker_profiles = photoTable(["1", "2", "3", "4", "5"].map(photo));
    expect(await saveSpeakerPhotoUrl(photo("6"))).toEqual({ error: "Maximum 5 photos allowed" });
  });

  it("guards the write with the list it read, so a concurrent change is not overwritten", async () => {
    supabaseState.responders.speaker_profiles = photoTable([photo("1")]);

    const result = await saveSpeakerPhotoUrl(photo("2"));

    expect(result).toEqual({ url: photo("2") });
    const write = supabaseState.writes[0];
    expect(write.payload).toEqual({ photo_urls: [photo("1"), photo("2")] });
    expect(write.filters).toEqual(expect.objectContaining({ user_id: USER, photo_urls: `{"${photo("1")}"}` }));
  });

  it("retries after losing a race, re-checking the limit against the fresh list", async () => {
    supabaseState.responders.speaker_profiles = photoTable([photo("1")], { conflictTimes: 1 });

    const result = await saveSpeakerPhotoUrl(photo("2"));

    expect(result).toEqual({ url: photo("2") });
    expect(supabaseState.writes.filter((w) => w.op === "update")).toHaveLength(2);
  });

  it("gives up with an error if the list keeps changing underneath it", async () => {
    supabaseState.responders.speaker_profiles = photoTable([photo("1")], { conflictTimes: 10 });

    const result = await saveSpeakerPhotoUrl(photo("2"));

    expect(result.error).toMatch(/try again/i);
  });

  it("matches a NULL photo list with IS NULL", async () => {
    supabaseState.responders.speaker_profiles = photoTable(null);

    await saveSpeakerPhotoUrl(photo("1"));

    expect(supabaseState.writes[0].filters).toEqual(expect.objectContaining({ "photo_urls:is": null }));
  });
});

describe("removeSpeakerPhoto", () => {
  beforeEach(() => {
    supabaseState.user = { id: USER };
  });

  it("returns an error on a failed read and deletes nothing", async () => {
    supabaseState.responders.speaker_profiles = photoTable(null, { readError: { code: "57014" } });

    const result = await removeSpeakerPhoto(photo("1"));

    expect(result.error).toBeTruthy();
    expect(storage.removed).toEqual([]);
  });

  it("removes the row entry and then the storage object", async () => {
    supabaseState.responders.speaker_profiles = photoTable([photo("1"), photo("2")]);

    const result = await removeSpeakerPhoto(photo("1"));

    expect(result).toEqual({ success: true });
    expect(supabaseState.writes[0].payload).toEqual({ photo_urls: [photo("2")] });
    expect(storage.removed).toEqual([[`${USER}/1.png`]]);
  });

  it("still succeeds (the photo is gone from the profile) when only the storage delete fails", async () => {
    supabaseState.responders.speaker_profiles = photoTable([photo("1")]);
    storage.removeError = { message: "boom" };

    expect(await removeSpeakerPhoto(photo("1"))).toEqual({ success: true });
  });
});
