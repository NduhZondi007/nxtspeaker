import { redirect } from "next/navigation";
import Link from "next/link";
import { CalendarCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/layout/TopBar";
import { BookingStatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatZAR } from "@/lib/utils/currency";
import type { Booking } from "@/lib/types/database";

export default async function ClientBookingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: bks } = await supabase
    .from("bookings")
    .select("*, speaker_profiles(*, profiles(*))")
    .eq("client_id", user.id)
    .order("created_at", { ascending: false });

  const bookings = (bks ?? []) as Booking[];

  return (
    <div>
      <TopBar title="My Bookings" subtitle="Track all your speaker booking requests">
        <Link href="/client/discover">
          <Button variant="gold" size="sm">+ Book a Speaker</Button>
        </Link>
      </TopBar>

      <div className="p-6">
        {bookings.length === 0 ? (
          <div className="text-center py-20">
            <CalendarCheck size={40} className="text-warm-gray mx-auto mb-4" />
            <h3 className="font-cormorant text-2xl text-mid-gray font-semibold">No bookings yet</h3>
            <p className="text-sm text-mid-gray mt-2">Start by finding a speaker for your next event</p>
            <Link href="/client/discover">
              <Button variant="gold" className="mt-6">Find Speakers</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {bookings.map((booking: Booking) => {
              const speaker = booking.speaker_profiles;
              return (
                <Link key={booking.id} href={`/client/bookings/${booking.id}`}>
                  <div className="bg-white border border-warm-gray rounded-2xl p-5 hover:border-gold/40 transition-all hover:-translate-y-0.5 cursor-pointer">
                    <div className="flex items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="font-cormorant text-lg font-semibold text-ink truncate">{booking.event_name}</h3>
                          <BookingStatusBadge status={booking.status} />
                        </div>
                        <p className="text-sm text-charcoal">
                          {speaker?.profiles?.full_name ?? "Speaker"} · {booking.exact_location}
                        </p>
                        <p className="text-xs text-mid-gray mt-1">
                          {new Date(booking.event_date).toLocaleDateString("en-ZA", { year: "numeric", month: "long", day: "numeric" })} · {booking.event_format} · {booking.duration_minutes}min
                        </p>
                        <p className="text-xs text-mid-gray mt-0.5">Ref: {booking.booking_number}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-cormorant text-xl font-bold text-gold">{formatZAR(booking.quoted_fee_zar)}</p>
                        <p className="text-xs text-mid-gray">quoted fee</p>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
