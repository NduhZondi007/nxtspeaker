import Link from "next/link";
import { CalendarCheck, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/session";
import { TopBar } from "@/components/layout/TopBar";
import { BookingStatusBadge, BOOKING_STATUS_LABELS } from "@/components/ui/Badge";
import { Pagination, PAGE_SIZE, pageRange, parsePage } from "@/components/bookings/Pagination";
import { formatZAR } from "@/lib/utils/currency";
import { BOOKING_LIST_COLUMNS, BOOKING_STATUSES, formatDateSAST, isBookingStatus } from "@/lib/utils/booking";
import type { Booking } from "@/lib/types/database";

interface Props {
  searchParams: Promise<{ status?: string; page?: string }>;
}

function chipClass(selected: boolean): string {
  return [
    "inline-flex px-3 py-1.5 rounded-full text-xs font-semibold transition-colors",
    selected ? "bg-primary text-white" : "bg-white border border-line text-ink hover:border-secondary",
  ].join(" ");
}

export default async function AdminBookingsPage({ searchParams }: Props) {
  // The layout checks the role too, but a page segment can render without
  // its layout re-running; every admin page gates itself.
  await requireRole("ADMIN");

  const params = await searchParams;
  const status = isBookingStatus(params.status) ? params.status : undefined;
  const page = parsePage(params.page);
  const [from, to] = pageRange(page);

  const supabase = await createClient();
  let query = supabase
    .from("bookings")
    .select(
      `${BOOKING_LIST_COLUMNS}, profiles(id, full_name), speaker_profiles(id, profiles(id, full_name))`,
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (status) query = query.eq("status", status);

  const { data: rawBookings, count, error } = await query;
  if (error) throw new Error("Could not load bookings. Please try again.");

  const bookings = (rawBookings ?? []) as unknown as Booking[];
  const total = count ?? bookings.length;
  const hrefFor = (p: number) => `/admin/bookings?${status ? `status=${status}&` : ""}page=${p}`;

  return (
    <div>
      <TopBar
        title="All Bookings"
        subtitle={`${total} booking${total !== 1 ? "s" : ""}${status ? ` · ${BOOKING_STATUS_LABELS[status]}` : ""}`}
      />

      <div className="p-4 sm:p-6 space-y-4">
        {/* Status filter tabs */}
        <nav aria-label="Filter by status" className="flex gap-2 flex-wrap">
          <Link href="/admin/bookings" aria-current={!status ? "page" : undefined} className={chipClass(!status)}>
            All
          </Link>
          {BOOKING_STATUSES.map((s) => (
            <Link
              key={s}
              href={`/admin/bookings?status=${s}`}
              aria-current={status === s ? "page" : undefined}
              className={chipClass(status === s)}
            >
              {BOOKING_STATUS_LABELS[s]}
            </Link>
          ))}
        </nav>

        <div className="bg-white border border-line rounded-[8px] overflow-hidden">
          {bookings.length === 0 ? (
            <div className="text-center py-16">
              <CalendarCheck size={32} className="text-line mx-auto mb-3" aria-hidden="true" />
              <p className="font-archivo text-muted">No bookings found</p>
            </div>
          ) : (
            <div className="divide-y divide-line">
              {bookings.map((b) => (
                <Link key={b.id} href={`/admin/bookings/${b.id}`} className="block">
                  <div className="flex items-center gap-4 px-5 py-4 hover:bg-soft transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-ink truncate">{b.event_name}</p>
                      <p className="text-xs text-muted mt-0.5">
                        <span className="text-ink font-medium">{b.profiles?.full_name ?? "Client"}</span>
                        {" → "}
                        <span className="text-ink font-medium">{b.speaker_profiles?.profiles?.full_name ?? "Speaker"}</span>
                        {" · "}{formatDateSAST(b.event_date)}
                      </p>
                      <p className="text-[10px] text-muted">Ref: {b.booking_number} · {b.event_format}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <BookingStatusBadge status={b.status} />
                        <p className="font-space-mono font-bold text-ink text-xs mt-1">{formatZAR(b.quoted_fee_zar)}</p>
                      </div>
                      <ChevronRight size={14} className="text-muted" aria-hidden="true" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <Pagination page={page} pageSize={PAGE_SIZE} total={total} hrefFor={hrefFor} />
      </div>
    </div>
  );
}
