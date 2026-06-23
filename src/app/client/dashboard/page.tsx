import { redirect } from "next/navigation";
import Link from "next/link";
import { Search, CalendarCheck, TrendingUp, DollarSign } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/layout/TopBar";
import { BookingStatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatZAR } from "@/lib/utils/currency";
import type { Booking, SpeakerProfile } from "@/lib/types/database";

export default async function ClientDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: bks }, { data: sps }] = await Promise.all([
    supabase.from("profiles").select("id, full_name").eq("id", user.id).single(),
    supabase.from("bookings").select("*, speaker_profiles(*, profiles(*))").eq("client_id", user.id).order("created_at", { ascending: false }).limit(5),
    supabase.from("speaker_profiles").select("*, profiles(*)").eq("status", "ACTIVE").eq("available", true).order("avg_rating", { ascending: false }).limit(4),
  ]);

  const bookings = (bks ?? []) as Booking[];
  const speakers = (sps ?? []) as SpeakerProfile[];

  const activeBookings    = bookings.filter((b) => ["PENDING", "CONFIRMED", "DEPOSIT_PAID"].includes(b.status)).length;
  const completedBookings = bookings.filter((b) => b.status === "COMPLETED").length;
  const totalSpent        = bookings.filter((b) => b.status === "COMPLETED").reduce((sum: number, b: Booking) => sum + Number(b.quoted_fee_zar), 0);

  const stats = [
    { label: "Active Bookings",    value: String(activeBookings),    icon: CalendarCheck, color: "#FF5700" },
    { label: "Events Completed",   value: String(completedBookings), icon: TrendingUp,    color: "#629DAB" },
    { label: "Total Spent",        value: formatZAR(totalSpent),     icon: DollarSign,    color: "#031E57" },
    { label: "Speakers Explored",  value: String(speakers.length),   icon: Search,        color: "#629DAB" },
  ];

  return (
    <div>
      <TopBar
        title={`Good morning, ${profile?.full_name?.split(" ")[0] ?? "there"}`}
        subtitle="Here's what's happening with your bookings"
      />

      <div className="p-4 sm:p-6 space-y-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="bg-white border border-line rounded-[12px] p-5 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: `linear-gradient(90deg, ${stat.color}, transparent)` }} />
                <Icon size={20} style={{ color: stat.color }} className="mb-3" />
                <p className="font-space-mono text-2xl font-bold text-ink">{stat.value}</p>
                <p className="text-xs text-muted mt-0.5">{stat.label}</p>
              </div>
            );
          })}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white border border-line rounded-[12px] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-line">
              <h2 className="font-archivo font-bold text-primary">Recent Bookings</h2>
              <Link href="/client/bookings">
                <Button variant="ghost" size="sm">View all</Button>
              </Link>
            </div>
            {bookings.length === 0 ? (
              <div className="text-center py-12">
                <CalendarCheck size={32} className="text-line mx-auto mb-3" />
                <p className="font-archivo text-muted">No bookings yet</p>
                <p className="text-sm text-muted mt-1">Find a speaker to get started</p>
                <Link href="/client/discover">
                  <Button variant="gold" size="sm" className="mt-4">Find Speakers</Button>
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-line">
                {bookings.map((booking: Booking) => (
                  <Link key={booking.id} href={`/client/bookings/${booking.id}`}>
                    <div className="flex items-center gap-4 px-5 py-3.5 hover:bg-soft transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-ink truncate">{booking.event_name}</p>
                        <p className="text-xs text-muted mt-0.5">
                          {booking.speaker_profiles?.profiles?.full_name ?? "Speaker"} ·{" "}
                          {new Date(booking.event_date).toLocaleDateString("en-ZA")}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <BookingStatusBadge status={booking.status} />
                        <p className="text-xs font-space-mono font-bold text-secondary mt-1">{formatZAR(booking.quoted_fee_zar)}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="bg-white border border-line rounded-[12px] p-5">
              <h2 className="font-archivo font-bold text-primary mb-4">Quick Actions</h2>
              <div className="space-y-2">
                <Link href="/client/discover" className="block">
                  <Button variant="gold" className="w-full justify-start gap-3">
                    <Search size={16} /> Find Speakers
                  </Button>
                </Link>
                <Link href="/client/bookings" className="block">
                  <Button variant="outline" className="w-full justify-start gap-3">
                    <CalendarCheck size={16} /> View Bookings
                  </Button>
                </Link>
              </div>
            </div>

            {speakers.length > 0 && (
              <div className="bg-white border border-line rounded-[12px] overflow-hidden">
                <div className="px-5 py-4 border-b border-line">
                  <h2 className="font-archivo font-bold text-primary">Top Speakers</h2>
                </div>
                <div className="divide-y divide-line">
                  {speakers.slice(0, 3).map((sp: SpeakerProfile) => (
                    <Link key={sp.id} href="/client/discover">
                      <div className="flex items-center gap-3 px-4 py-3 hover:bg-soft transition-colors">
                        <div className="w-9 h-9 rounded-[6px] bg-secondary/20 flex items-center justify-center text-sm font-bold text-secondary shrink-0">
                          {sp.profiles?.full_name?.charAt(0) ?? "S"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-ink truncate">{sp.profiles?.full_name}</p>
                          <p className="text-xs text-muted truncate">{sp.title}</p>
                        </div>
                        <p className="text-xs font-space-mono font-bold text-secondary shrink-0">{formatZAR(sp.speaking_fee_zar)}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
