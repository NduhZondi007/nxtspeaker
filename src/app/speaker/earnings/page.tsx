import { redirect } from "next/navigation";
import { DollarSign } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/layout/TopBar";
import { BookingStatusBadge } from "@/components/ui/Badge";
import { formatZAR } from "@/lib/utils/currency";

export default async function SpeakerEarningsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: sp } = await supabase
    .from("speaker_profiles")
    .select("id, speaking_fee_zar")
    .eq("user_id", user.id)
    .single();

  const { data: bookings } = await supabase
    .from("bookings")
    .select("*, profiles(*)")
    .eq("speaker_id", sp?.id ?? "")
    .in("status", ["CONFIRMED", "DEPOSIT_PAID", "COMPLETED"])
    .order("event_date", { ascending: false });

  const total = bookings?.filter((b) => b.status === "COMPLETED").reduce((sum, b) => sum + Number(b.quoted_fee_zar), 0) ?? 0;
  const pending = bookings?.filter((b) => ["CONFIRMED", "DEPOSIT_PAID"].includes(b.status)).reduce((sum, b) => sum + Number(b.quoted_fee_zar), 0) ?? 0;

  return (
    <div>
      <TopBar title="Earnings" subtitle="Your fee history in South African Rand" />

      <div className="p-6 space-y-6">
        {/* Summary */}
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { label: "Total Earned", value: formatZAR(total), color: "#6B9E78" },
            { label: "Upcoming (Confirmed)", value: formatZAR(pending), color: "#C9A96E" },
            { label: "Standard Fee", value: formatZAR(sp?.speaking_fee_zar ?? 0), color: "#8C7CA8" },
          ].map((stat) => (
            <div key={stat.label} className="bg-white border border-warm-gray rounded-2xl p-5 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: `linear-gradient(90deg, ${stat.color}, transparent)` }} />
              <DollarSign size={18} style={{ color: stat.color }} className="mb-2" />
              <p className="font-cormorant text-2xl font-bold text-ink">{stat.value}</p>
              <p className="text-xs text-mid-gray mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Earnings table */}
        <div className="bg-white border border-warm-gray rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-warm-gray">
            <h2 className="font-cormorant text-lg font-semibold text-ink">Fee History</h2>
          </div>
          {!bookings || bookings.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign size={32} className="text-warm-gray mx-auto mb-3" />
              <p className="font-cormorant text-lg text-mid-gray">No earnings yet</p>
              <p className="text-sm text-mid-gray mt-1">Accept bookings to start earning</p>
            </div>
          ) : (
            <div className="divide-y divide-warm-gray">
              {bookings.map((booking) => (
                <div key={booking.id} className="flex items-center gap-4 px-5 py-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-charcoal truncate">{booking.event_name}</p>
                    <p className="text-xs text-mid-gray mt-0.5">
                      {(booking as any).profiles?.full_name ?? "Client"} ·{" "}
                      {new Date(booking.event_date).toLocaleDateString("en-ZA")}
                    </p>
                    <p className="text-xs text-mid-gray">Ref: {booking.booking_number}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-cormorant text-xl font-bold text-gold">{formatZAR(booking.quoted_fee_zar)}</p>
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
