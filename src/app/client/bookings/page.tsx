import { redirect } from "next/navigation";
import Link from "next/link";
import { CalendarCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth/session";
import { TopBar } from "@/components/layout/TopBar";
import { BookingStatusBadge } from "@/components/ui/Badge";
import { buttonClasses } from "@/components/ui/Button";
import { Pagination, PAGE_SIZE, pageRange, parsePage } from "@/components/bookings/Pagination";
import { formatZAR } from "@/lib/utils/currency";
import { BOOKING_LIST_COLUMNS, formatDateSAST } from "@/lib/utils/booking";
import type { Booking } from "@/lib/types/database";

interface Props {
  searchParams: Promise<{ page?: string }>;
}

export default async function ClientBookingsPage({ searchParams }: Props) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const page = parsePage((await searchParams).page);
  const [from, to] = pageRange(page);

  const supabase = await createClient();
  const { data: bks, count, error } = await supabase
    .from("bookings")
    .select(`${BOOKING_LIST_COLUMNS}, speaker_profiles(id, profiles(id, full_name, avatar_url))`, {
      count: "exact",
    })
    .eq("client_id", user.id)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) throw new Error("Could not load your bookings. Please try again.");

  const bookings = (bks ?? []) as unknown as Booking[];
  const total = count ?? bookings.length;

  return (
    <div>
      <TopBar title="My Bookings" subtitle="Track all your speaker booking requests">
        <Link href="/client/discover" className={buttonClasses({ variant: "gold", size: "sm" })}>
          + Book a Speaker
        </Link>
      </TopBar>

      <div className="p-4 sm:p-6">
        {total === 0 ? (
          <div className="text-center py-20">
            <CalendarCheck size={40} className="text-line mx-auto mb-4" aria-hidden="true" />
            <h3 className="font-archivo font-black text-muted uppercase tracking-tight">No bookings yet</h3>
            <p className="text-sm text-muted mt-2">Start by finding a speaker for your next event</p>
            <Link href="/client/discover" className={buttonClasses({ variant: "gold", className: "mt-6" })}>
              Find Speakers
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {bookings.map((booking) => {
              const speaker = booking.speaker_profiles;
              return (
                <Link key={booking.id} href={`/client/bookings/${booking.id}`} className="block">
                  <div className="bg-white border border-line rounded-[8px] p-5 hover:border-secondary/40 transition-all hover:-translate-y-0.5">
                    <div className="flex items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="font-archivo font-bold text-primary truncate">{booking.event_name}</h3>
                          <BookingStatusBadge status={booking.status} />
                        </div>
                        <p className="text-sm text-ink">
                          {speaker?.profiles?.full_name ?? "Speaker"} · {booking.exact_location}
                        </p>
                        <p className="text-xs text-muted mt-1">
                          {formatDateSAST(booking.event_date)} · {booking.event_format} · {booking.duration_minutes}min
                        </p>
                        <p className="text-xs text-muted mt-0.5">Ref: {booking.booking_number}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-space-mono font-bold text-ink">{formatZAR(booking.quoted_fee_zar)}</p>
                        <p className="text-xs text-muted">quoted fee</p>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
            <Pagination page={page} pageSize={PAGE_SIZE} total={total} hrefFor={(p) => `/client/bookings?page=${p}`} />
          </div>
        )}
      </div>
    </div>
  );
}
