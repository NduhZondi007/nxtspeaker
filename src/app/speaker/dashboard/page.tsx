import { redirect } from "next/navigation";
import Link from "next/link";
import { CalendarCheck, Clock, CheckCircle, DollarSign, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/layout/TopBar";
import { BookingStatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatZAR } from "@/lib/utils/currency";
import { updateBookingStatus } from "@/app/actions/bookings";
import type { Booking } from "@/lib/types/database";

export default async function SpeakerDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: speakerProfile }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, avatar_url").eq("id", user.id).single(),
    supabase.from("speaker_profiles").select("id, bio, expertise, location, speaking_fee_zar, languages").eq("user_id", user.id).single(),
  ]);

  const { data: bks } = await supabase
    .from("bookings")
    .select("id, event_name, event_date, event_format, exact_location, status, quoted_fee_zar, profiles(full_name)")
    .eq("speaker_id", speakerProfile?.id ?? "")
    .order("created_at", { ascending: false });

  const bookings = (bks ?? []) as unknown as Booking[];

  const pending = bookings.filter((b) => b.status === "PENDING");
  const confirmed = bookings.filter((b) => ["CONFIRMED", "DEPOSIT_PAID"].includes(b.status));
  const completed = bookings.filter((b) => b.status === "COMPLETED");
  const totalEarnings = completed.reduce((sum: number, b: Booking) => sum + Number(b.quoted_fee_zar), 0);

  const fields = [
    speakerProfile?.bio,
    speakerProfile?.expertise?.length,
    speakerProfile?.location,
    speakerProfile?.speaking_fee_zar,
    profile?.avatar_url,
    speakerProfile?.languages?.length,
  ];
  const completeness = Math.round((fields.filter(Boolean).length / fields.length) * 100);

  const stats = [
    { label: "Total Bookings", value: String(bookings.length), icon: CalendarCheck, color: "#C9A96E" },
    { label: "Pending Requests", value: String(pending.length), icon: Clock, color: "#A88C7C" },
    { label: "Confirmed Events", value: String(confirmed.length), icon: CheckCircle, color: "#6B9E78" },
    { label: "Total Earnings", value: formatZAR(totalEarnings), icon: DollarSign, color: "#8C7CA8" },
  ];

  async function accept(bookingId: string) {
    "use server";
    await updateBookingStatus(bookingId, "CONFIRMED");
  }

  async function decline(bookingId: string) {
    "use server";
    await updateBookingStatus(bookingId, "DECLINED");
  }

  return (
    <div>
      <TopBar
        title={`Welcome, ${profile?.full_name?.split(" ")[0] ?? "Speaker"}`}
        subtitle="Manage your bookings and profile"
      />

      <div className="p-4 sm:p-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="bg-white border border-warm-gray rounded-2xl p-5 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: `linear-gradient(90deg, ${stat.color}, transparent)` }} />
                <Icon size={20} style={{ color: stat.color }} className="mb-3" />
                <p className="font-cormorant text-2xl font-bold text-ink">{stat.value}</p>
                <p className="text-xs text-mid-gray mt-0.5">{stat.label}</p>
              </div>
            );
          })}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white border border-warm-gray rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-warm-gray">
              <h2 className="font-cormorant text-lg font-semibold text-ink">
                Incoming Requests
                {pending.length > 0 && (
                  <span className="ml-2 px-2 py-0.5 text-xs bg-gold/20 text-gold rounded-full">{pending.length}</span>
                )}
              </h2>
              <Link href="/speaker/bookings">
                <Button variant="ghost" size="sm">View all</Button>
              </Link>
            </div>

            {pending.length === 0 ? (
              <div className="text-center py-10">
                <Clock size={28} className="text-warm-gray mx-auto mb-3" />
                <p className="font-cormorant text-lg text-mid-gray">No pending requests</p>
              </div>
            ) : (
              <div className="divide-y divide-warm-gray">
                {pending.map((booking: Booking) => (
                  <div key={booking.id} className="px-5 py-4">
                    <div className="flex items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-charcoal">{booking.event_name}</p>
                        <p className="text-xs text-mid-gray mt-0.5">
                          {booking.profiles?.full_name ?? "Client"} ·{" "}
                          {new Date(booking.event_date).toLocaleDateString("en-ZA")}
                        </p>
                        <p className="text-xs text-mid-gray">{booking.exact_location} · {booking.event_format}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-cormorant text-lg font-bold text-gold">{formatZAR(booking.quoted_fee_zar)}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-3">
                      <form action={accept.bind(null, booking.id)}>
                        <Button type="submit" variant="gold" size="sm">Accept</Button>
                      </form>
                      <form action={decline.bind(null, booking.id)}>
                        <Button type="submit" variant="outline" size="sm">Decline</Button>
                      </form>
                      <Link href={`/speaker/bookings/${booking.id}`}>
                        <Button variant="ghost" size="sm">View <ChevronRight size={12} /></Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="bg-white border border-warm-gray rounded-2xl p-5">
              <h2 className="font-cormorant text-lg font-semibold text-ink mb-3">Profile Completeness</h2>
              <div className="flex items-center gap-2 mb-2">
                <div className="flex-1 h-2 bg-warm-gray rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${completeness}%`, background: "linear-gradient(90deg, #C9A96E, #8B6A35)" }} />
                </div>
                <span className="text-sm font-bold text-gold">{completeness}%</span>
              </div>
              {completeness < 100 && (
                <Link href="/speaker/profile">
                  <Button variant="outline" size="sm" className="w-full mt-2">Complete Profile</Button>
                </Link>
              )}
            </div>

            <div className="bg-white border border-warm-gray rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-warm-gray">
                <h2 className="font-cormorant text-lg font-semibold text-ink">Upcoming Events</h2>
              </div>
              {confirmed.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-sm text-mid-gray">No upcoming events</p>
                </div>
              ) : (
                <div className="divide-y divide-warm-gray">
                  {confirmed.slice(0, 3).map((b: Booking) => (
                    <Link key={b.id} href={`/speaker/bookings/${b.id}`}>
                      <div className="flex items-center gap-3 px-4 py-3 hover:bg-cream/60 transition-colors">
                        <div className="w-9 h-9 rounded-lg bg-gold/10 flex flex-col items-center justify-center shrink-0">
                          <span className="text-[10px] font-bold text-gold">
                            {new Date(b.event_date).toLocaleDateString("en-ZA", { month: "short" }).toUpperCase()}
                          </span>
                          <span className="text-sm font-bold text-ink leading-none">
                            {new Date(b.event_date).getDate()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-charcoal truncate">{b.event_name}</p>
                          <p className="text-xs text-mid-gray truncate">{b.exact_location}</p>
                        </div>
                        <BookingStatusBadge status={b.status} />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
