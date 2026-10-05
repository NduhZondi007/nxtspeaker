import { redirect } from "next/navigation";
import Link from "next/link";
import { CalendarCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser, getMySpeakerProfileId } from "@/lib/auth/session";
import { TopBar } from "@/components/layout/TopBar";
import { BookingStatusBadge } from "@/components/ui/Badge";
import { Pagination, PAGE_SIZE, pageRange, parsePage } from "@/components/bookings/Pagination";
import { formatZAR } from "@/lib/utils/currency";
import { BOOKING_LIST_COLUMNS, formatDateSAST } from "@/lib/utils/booking";
import type { Booking } from "@/lib/types/database";

interface Props {
  searchParams: Promise<{ page?: string }>;
}

export default async function SpeakerBookingsPage({ searchParams }: Props) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const page = parsePage((await searchParams).page);
  const [from, to] = pageRange(page);

  // Skip the query entirely when there is no speaker profile yet. The old
  // `sp?.id ?? ""` fallback sent an empty string to a uuid column, which
  // Postgres rejects outright (22P02).
  const speakerProfileId = await getMySpeakerProfileId();

  let bookings: Booking[] = [];
  let total = 0;
  if (speakerProfileId) {
    const supabase = await createClient();
    const { data, count, error } = await supabase
      .from("bookings")
      .select(`${BOOKING_LIST_COLUMNS}, profiles(id, full_name, company)`, { count: "exact" })
      .eq("speaker_id", speakerProfileId)
      .order("event_date", { ascending: true })
      .range(from, to);

    if (error) throw new Error("Could not load your bookings. Please try again.");
    bookings = (data ?? []) as unknown as Booking[];
    total = count ?? bookings.length;
  }

  return (
    <div>
      <TopBar title="My Bookings" subtitle="All incoming booking requests" />

      <div className="p-4 sm:p-6">
        {total === 0 ? (
          <div className="text-center py-20">
            <CalendarCheck size={40} className="text-line mx-auto mb-4" aria-hidden="true" />
            <h3 className="font-archivo font-black text-muted uppercase tracking-tight">No bookings yet</h3>
            <p className="text-sm text-muted mt-2">Complete your profile to attract event organisers</p>
          </div>
        ) : (
          <div className="space-y-3">
            {bookings.map((booking) => (
              <Link key={booking.id} href={`/speaker/bookings/${booking.id}`} className="block">
                <div className="bg-white border border-line rounded-[8px] p-5 hover:border-secondary/40 transition-all hover:-translate-y-0.5">
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-archivo font-bold text-primary truncate">{booking.event_name}</h3>
                        <BookingStatusBadge status={booking.status} />
                      </div>
                      <p className="text-sm text-ink">
                        {booking.profiles?.full_name ?? "Client"}
                        {booking.profiles?.company ? ` — ${booking.profiles.company}` : ""}
                      </p>
                      <p className="text-xs text-muted mt-1">
                        {formatDateSAST(booking.event_date)} · {booking.event_format} · {booking.exact_location}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-space-mono font-bold text-ink">{formatZAR(booking.quoted_fee_zar)}</p>
                      <p className="text-xs text-muted">Ref: {booking.booking_number}</p>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
            <Pagination page={page} pageSize={PAGE_SIZE} total={total} hrefFor={(p) => `/speaker/bookings?page=${p}`} />
          </div>
        )}
      </div>
    </div>
  );
}
