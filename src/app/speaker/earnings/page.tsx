import { redirect } from "next/navigation";
import { DollarSign } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/layout/TopBar";
import { BookingStatusBadge } from "@/components/ui/Badge";
import { formatZAR } from "@/lib/utils/currency";
import type { Booking } from "@/lib/types/database";

export default async function SpeakerEarningsPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: sp } = await supabase
    .from("speaker_profiles")
    .select("id, speaking_fee_zar")
    .eq("user_id", user.id)
    .single();

  const { data: rawBookings } = await supabase
    .from("bookings")
    .select("*, profiles(*)")
    .eq("speaker_id", sp?.id ?? "")
    .in("status", ["CONFIRMED", "DEPOSIT_PAID", "COMPLETED"])
    .order("event_date", { ascending: false });

  const bookings = (rawBookings ?? []) as Booking[];

  const total   = bookings.filter((b) => b.status === "COMPLETED").reduce((sum, b) => sum + Number(b.quoted_fee_zar), 0);
  const pending = bookings.filter((b) => ["CONFIRMED", "DEPOSIT_PAID"].includes(b.status)).reduce((sum, b) => sum + Number(b.quoted_fee_zar), 0);

  return (
    <div>
      <TopBar title="Earnings" subtitle="Your fee history in South African Rand" />

      <div className="p-4 sm:p-6 space-y-6">
        {/* Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { label: "Total Earned",         value: formatZAR(total),                       color: "#629DAB" },
            { label: "Upcoming (Confirmed)",  value: formatZAR(pending),                     color: "#FF5700" },
            { label: "Standard Fee",          value: formatZAR(sp?.speaking_fee_zar ?? 0),   color: "#031E57" },
          ].map((stat) => (
            <div key={stat.label} className="bg-white border border-line rounded-[12px] p-5 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: `linear-gradient(90deg, ${stat.color}, transparent)` }} />
              <DollarSign size={18} style={{ color: stat.color }} className="mb-2" />
              <p className="font-space-mono text-2xl font-bold text-ink">{stat.value}</p>
              <p className="text-xs text-muted mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Earnings table */}
        <div className="bg-white border border-line rounded-[12px] overflow-hidden">
          <div className="px-5 py-4 border-b border-line">
            <h2 className="font-archivo font-bold text-primary">Fee History</h2>
          </div>
          {bookings.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign size={32} className="text-line mx-auto mb-3" />
              <p className="font-archivo text-muted">No earnings yet</p>
              <p className="text-sm text-muted mt-1">Accept bookings to start earning</p>
            </div>
          ) : (
            <div className="divide-y divide-line">
              {bookings.map((booking) => (
                <div key={booking.id} className="flex items-center gap-4 px-5 py-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-ink truncate">{booking.event_name}</p>
                    <p className="text-xs text-muted mt-0.5">
                      {booking.profiles?.full_name ?? "Client"} ·{" "}
                      {new Date(booking.event_date).toLocaleDateString("en-ZA")}
                    </p>
                    <p className="text-xs text-muted">Ref: {booking.booking_number}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-space-mono text-xl font-bold text-secondary">{formatZAR(booking.quoted_fee_zar)}</p>
                    <div className="mt-1">
                      <BookingStatusBadge status={booking.status} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
