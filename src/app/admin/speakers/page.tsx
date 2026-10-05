import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/session";
import { createLogger } from "@/lib/logger";
import { TopBar } from "@/components/layout/TopBar";
import { Pagination, PAGE_SIZE, pageRange, parsePage } from "@/components/bookings/Pagination";
import { AdminSpeakersClient } from "./AdminSpeakersClient";
import type { SpeakerProfile } from "@/lib/types/database";

const log = createLogger("admin-speakers-page");

interface Props {
  searchParams: Promise<{ page?: string }>;
}

const SPEAKER_CARD_COLUMNS =
  "id, user_id, title, speaking_fee_zar, expertise, location, level, status, avg_rating, total_events, created_at, " +
  "profiles(id, full_name, avatar_url)";

export default async function AdminSpeakersPage({ searchParams }: Props) {
  await requireRole("ADMIN");

  const page = parsePage((await searchParams).page);
  const [from, to] = pageRange(page);

  const supabase = await createClient();
  const countByStatus = (status: string) =>
    supabase.from("speaker_profiles").select("id", { count: "exact", head: true }).eq("status", status);

  const [listRes, activeRes, inactiveRes, reviewRes] = await Promise.all([
    supabase
      .from("speaker_profiles")
      .select(SPEAKER_CARD_COLUMNS, { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to),
    countByStatus("ACTIVE"),
    countByStatus("INACTIVE"),
    countByStatus("PENDING_REVIEW"),
  ]);

  if (listRes.error) throw new Error("Could not load speakers. Please try again.");
  for (const res of [activeRes, inactiveRes, reviewRes]) {
    if (res.error) log.error("Speaker count failed", { cause: res.error });
  }

  const speakers = (listRes.data ?? []) as unknown as SpeakerProfile[];
  const total = listRes.count ?? speakers.length;

  return (
    <div>
      <TopBar title="Speakers" subtitle={`${total} speaker${total !== 1 ? "s" : ""} · all statuses`} />
      <AdminSpeakersClient
        speakers={speakers}
        counts={{
          active: activeRes.count ?? 0,
          inactive: inactiveRes.count ?? 0,
          pendingReview: reviewRes.count ?? 0,
        }}
      />
      <div className="px-4 sm:px-6 pb-6">
        <Pagination page={page} pageSize={PAGE_SIZE} total={total} hrefFor={(p) => `/admin/speakers?page=${p}`} />
      </div>
    </div>
  );
}
