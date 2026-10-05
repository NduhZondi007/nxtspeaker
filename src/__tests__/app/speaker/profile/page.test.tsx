import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ToastProvider } from "@/components/ui/Toast";

const { queries, rows } = vi.hoisted(() => ({
  queries: [] as { table: string; columns: string }[],
  rows: {
    profiles: { data: { id: "u1", full_name: "Ann", avatar_url: null }, error: null } as { data: unknown; error: unknown },
    speaker_profiles: { data: null, error: null } as { data: unknown; error: unknown },
  },
}));

vi.mock("@/components/layout/AuthProvider", () => ({ useAuth: () => ({ user: { id: "u1" } }) }));
vi.mock("@/components/layout/SidebarContext", () => ({ useSidebar: () => ({ open: vi.fn() }) }));
vi.mock("@/app/actions/speakers", () => ({
  updateSpeakerProfile: vi.fn(),
  saveAvatarUrl: vi.fn(),
  saveSpeakerPhotoUrl: vi.fn(),
  removeSpeakerPhoto: vi.fn(),
}));
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    from: (table: "profiles" | "speaker_profiles") => ({
      select: (columns: string) => {
        queries.push({ table, columns });
        const b = {
          eq: () => b,
          single: async () => rows[table],
          maybeSingle: async () => rows[table],
        };
        return b;
      },
    }),
  }),
}));

import SpeakerProfilePage from "@/app/speaker/profile/page";

const photo = "https://abc.supabase.co/storage/v1/object/public/speaker-photos/u1/a.png";

beforeEach(() => {
  queries.length = 0;
  rows.speaker_profiles = {
    data: {
      id: "sp1",
      title: "Keynote",
      bio: "",
      expertise: ["Leadership"],
      languages: ["English"],
      location: "",
      speaking_fee_zar: 0,
      level: 1,
      available: true,
      virtual_available: true,
      hybrid_available: false,
      tags: [],
      photo_urls: [photo],
      status: "ACTIVE",
      profile_video_url: null,
    },
    error: null,
  };
});

function renderPage() {
  return render(
    <ToastProvider>
      <SpeakerProfilePage />
    </ToastProvider>
  );
}

describe("speaker/profile page", () => {
  it("reads the profiles row once, not again through a speaker_profiles join", async () => {
    renderPage();
    await screen.findByText("Basic Information");

    expect(queries.filter((q) => q.table === "profiles")).toHaveLength(1);
    const sp = queries.find((q) => q.table === "speaker_profiles")!;
    expect(sp.columns).not.toMatch(/profiles\(/);
    expect(sp.columns).not.toContain("*");
  });

  it("marks expertise and language chips with aria-pressed", async () => {
    renderPage();
    expect(await screen.findByRole("button", { name: "Leadership" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Strategy" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "English" })).toHaveAttribute("aria-pressed", "true");
  });

  it("labels the photo remove button with a large enough target", async () => {
    renderPage();
    const remove = await screen.findByRole("button", { name: /remove portfolio photo 1/i });
    expect(remove.className).toMatch(/\b(w-6|w-7|w-8)\b/);
  });

  it("does not show the raw database error when the read fails", async () => {
    rows.speaker_profiles = { data: null, error: { message: 'relation "speaker_profiles" secret detail' } };
    renderPage();
    expect(await screen.findByText(/profile unavailable/i)).toBeInTheDocument();
    expect(screen.queryByText(/secret detail/)).not.toBeInTheDocument();
  });
});
