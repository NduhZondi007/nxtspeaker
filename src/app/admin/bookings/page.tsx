import { redirect } from "next/navigation";
import Link from "next/link";
import { CalendarCheck, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/layout/TopBar";
import { BookingStatusBadge } from "@/components/ui/Badge";
import { formatZAR } from "@/lib/utils/currency";
import type { Booking, BookingStatus } from "@/lib/types/database";

interface Props {
  searchParams: Promise<{ status?: string }>;
}

const ALL_STATUSES: BookingStatus[] = ["PENDING", "CONFIRMED", "DEPOSIT_PAID", "COMPLETED", "CANCELLED", "DECLINED"];

export default async function AdminBookingsPage({ searchParams }: Props) {
  const { status } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let query = supabase
    .from("bookings")
    .select("*, profiles(*), speaker_profiles(*, profiles(*))")
    .order("created_at", { ascending: false });

  if (status && ALL_STATUSES.includes(status as BookingStatus)) {
    query = query.eq("status", status as BookingStatus);
  }

  const { data: rawBookings } = await query;
  const bookings = (rawBookings ?? []) as Booking[];

  return (
    <div>
      <TopBar
        title="All Bookings"
        subtitle={`${bookings.length} booking${bookings.length !== 1 ? "s" : ""}${status ? ` · ${status}` : ""}`}
      />

      <div className="p-4 sm:p-6 space-y-4">
        {/* Status filter tabs */}
        <div className="flex gap-2 flex-wrap">
          <Link href="/admin/bookings">
            <span className={`inline-flex px-3 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${!status ? "bg-ink text-gold" : "bg-white border border-warm-gray text-charcoal hover:border-gold"}`}>
              All
            </span>
          </Link>
          {ALL_STATUSES.map((s) => (
            <Link key={s} href={`/admin/bookings?status=${s}`}>
              <span className={`inline-flex px-3 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${status === s ? "bg-ink text-gold" : "bg-white border border-warm-gray text-charcoal hover:border-gold"}`}>
                {s.charAt(0) + s.slice(1).toLowerCase().replace("_", " ")}
              </span>
            </Link>
          ))}
        </div>

        <div className="bg-white border border-warm-gray rounded-2xl overflow-hidden">
          {bookings.length === 0 ? (
            <div className="text-center py-16">
              <CalendarCheck size={32} className="text-warm-gray mx-auto mb-3" />
              <p className="font-cormorant text-lg text-mid-gray">No bookings found</p>
            </div>
          ) : (
            <div className="divide-y divide-warm-gray">
              {bookings.map((b: Booking) => (
                <Link key={b.id} href={`/admin/bookings/${b.id}`}>
                  <div className="flex items-center gap-4 px-5 py-4 hover:bg-cream/60 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-charcoal truncate">{b.event_name}</p>
                      <p className="text-xs text-mid-gray mt-0.5">
                        <span className="text-charcoal font-medium">{b.profiles?.full_name ?? "Client"}</span>
                        {" → "}
                        <span className="text-charcoal font-medium">{b.speaker_profiles?.profiles?.full_name ?? "Speaker"}</span>
                        {" · "}{new Date(b.event_date).toLocaleDateString("en-ZA")}
                      </p>
                      <p className="text-[10px] text-mid-gray">Ref: {b.booking_number} · {b.event_format}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <BookingStatusBadge status={b.status} />
                        <p className="text-xs font-semibold text-gold mt-1">{formatZAR(b.quoted_fee_zar)}</p>
                      </div>
                      <ChevronRight size={14} className="text-mid-gray" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
