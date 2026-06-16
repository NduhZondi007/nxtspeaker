import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MessageSquare, XCircle, CheckCircle, Trophy } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/layout/TopBar";
import { BookingStatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { HospitalityRiderView } from "@/components/bookings/HospitalityRiderView";
import { adminUpdateBookingStatus, adminSendMessage } from "@/app/actions/admin";
import { formatZAR } from "@/lib/utils/currency";
import type { Booking, Message, Profile } from "@/lib/types/database";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AdminBookingDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [
    { data: booking },
    { data: profile },
  ] = await Promise.all([
    supabase
      .from("bookings")
      .select("*, profiles(*), speaker_profiles(*, profiles(*))")
      .eq("id", id)
      .single(),
    supabase.from("profiles").select("*").eq("id", user.id).single(),
  ]);

  if (!booking) notFound();

  const [{ data: messages }, { data: rider }] = await Promise.all([
    supabase
      .from("messages")
      .select("*, profiles(*)")
      .eq("booking_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("hospitality_riders")
      .select("*")
      .eq("speaker_id", (booking as Booking).speaker_profiles?.id ?? "")
      .single(),
  ]);

  const b = booking as Booking;
  const clientName = b.profiles?.full_name ?? "Client";
  const speakerName = b.speaker_profiles?.profiles?.full_name ?? "Speaker";

  const cancellable = !["CANCELLED", "DECLINED"].includes(b.status);
  const confirmable = b.status === "PENDING";
  const completable = ["CONFIRMED", "DEPOSIT_PAID"].includes(b.status);

  async function handleSendMessage(bookingId: string, content: string) {
    "use server";
    await adminSendMessage(bookingId, content);
  }

  return (
    <div>
      <TopBar title={b.event_name} subtitle={`Ref: ${b.booking_number}`}>
        <Link href="/admin/bookings">
          <button className="flex items-center gap-1.5 text-sm text-mid-gray hover:text-charcoal transition-colors">
            <ArrowLeft size={14} /> Bookings
          </button>
        </Link>
      </TopBar>

      <div className="p-4 sm:p-6 grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {/* Admin action bar */}
          <div className="bg-white border border-gold/30 rounded-2xl p-4">
            <p className="text-xs font-semibold text-mid-gray uppercase tracking-wide mb-3">Admin Actions</p>
            <div className="flex flex-wrap gap-2">
              {confirmable && (
                <form action={async () => { "use server"; await adminUpdateBookingStatus(id, "CONFIRMED"); }}>
                  <Button type="submit" variant="gold" size="sm" className="gap-1.5">
                    <CheckCircle size={13} /> Confirm
                  </Button>
                </form>
              )}
              {completable && (
                <form action={async () => { "use server"; await adminUpdateBookingStatus(id, "COMPLETED"); }}>
                  <Button type="submit" variant="primary" size="sm" className="gap-1.5">
                    <Trophy size={13} /> Mark Completed
                  </Button>
                </form>
              )}
              {cancellable && (
                <form action={async () => { "use server"; await adminUpdateBookingStatus(id, "CANCELLED", "Cancelled by administrator"); }}>
                  <Button type="submit" variant="danger" size="sm" className="gap-1.5">
                    <XCircle size={13} /> Cancel Booking
                  </Button>
                </form>
              )}
            </div>
          </div>

          {/* Booking details */}
          <div className="bg-white border border-warm-gray rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-cormorant text-xl font-semibold text-ink">Booking Details</h2>
              <BookingStatusBadge status={b.status} />
            </div>
            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              {[
                { label: "Client", value: clientName },
                { label: "Speaker", value: speakerName },
                { label: "Event Date", value: new Date(b.event_date).toLocaleDateString("en-ZA", { year: "numeric", month: "long", day: "numeric" }) },
                { label: "Location", value: b.exact_location },
                { label: "Format", value: b.event_format },
                { label: "Duration", value: `${b.duration_minutes} minutes` },
                { label: "Organiser", value: b.event_organiser },
                { label: "Company", value: b.associated_company },
                { label: "Audience", value: b.audience_demographics },
                { label: "Booking Ref", value: b.booking_number },
              ].map((row) => (
                <div key={row.label}>
                  <p className="text-[10px] font-semibold text-mid-gray uppercase tracking-wide">{row.label}</p>
                  <p className="text-charcoal mt-0.5">{row.value}</p>
                </div>
              ))}
              <div>
                <p className="text-[10px] font-semibold text-mid-gray uppercase tracking-wide">Quoted Fee</p>
                <p className="font-cormorant text-xl font-bold text-gold mt-0.5">{formatZAR(b.quoted_fee_zar)}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-mid-gray uppercase tracking-wide">Rider Agreed</p>
                <p className="text-charcoal mt-0.5">{b.hospitality_rider_agreed ? "✓ Yes" : "No"}</p>
              </div>
            </div>
            {b.client_notes && (
              <div className="mt-4 pt-4 border-t border-warm-gray">
                <p className="text-[10px] font-semibold text-mid-gray uppercase tracking-wide mb-1">Client Notes</p>
                <p className="text-sm text-charcoal">{b.client_notes}</p>
              </div>
            )}
            {b.cancelled_reason && (
              <div className="mt-4 pt-4 border-t border-warm-gray">
                <p className="text-[10px] font-semibold text-mid-gray uppercase tracking-wide mb-1">Cancellation Reason</p>
                <p className="text-sm text-charcoal">{b.cancelled_reason}</p>
              </div>
            )}
          </div>

          {rider && (
            <div className="bg-white border border-warm-gray rounded-2xl p-5">
              <h2 className="font-cormorant text-xl font-semibold text-ink mb-4">Hospitality Rider</h2>
              <HospitalityRiderView rider={rider} speakerName={speakerName} />
            </div>
          )}
        </div>

        {/* Chat panel */}
        <div className="bg-white border border-warm-gray rounded-2xl overflow-hidden flex flex-col" style={{ minHeight: "300px" }}>
          <div className="flex items-center gap-2 px-4 py-3 border-b border-warm-gray">
            <MessageSquare size={16} className="text-gold" />
            <div className="flex-1 min-w-0">
              <h2 className="font-cormorant text-lg font-semibold text-ink truncate">Chat</h2>
              <p className="text-[10px] text-mid-gray">{clientName} ↔ {speakerName}</p>
            </div>
          </div>
          {profile && (
            <ChatPanel
              booking={b}
              initialMessages={(messages ?? []) as Message[]}
              currentUser={profile as Profile}
              onSend={handleSendMessage}
            />
          )}
        </div>
      </div>
    </div>
  );
}
