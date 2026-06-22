import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MessageSquare } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/layout/TopBar";
import { BookingStatusBadge } from "@/components/ui/Badge";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { HospitalityRiderView } from "@/components/bookings/HospitalityRiderView";
import { formatZAR } from "@/lib/utils/currency";
import { sendMessage } from "@/app/actions/messages";
import type { Booking, Message, Profile } from "@/lib/types/database";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("bookings")
    .select("event_name, booking_number")
    .eq("id", id)
    .single();
  const title = data?.event_name ?? "Booking Detail";
  return {
    title,
    description: `Booking details for ${title}${data?.booking_number ? ` (${data.booking_number})` : ""} on NxtSpeaker.`,
  };
}

export default async function ClientBookingDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data: booking }, { data: profile }, { data: messages }] = await Promise.all([
    supabase
      .from("bookings")
      .select("*, speaker_profiles(*, profiles(*)), profiles(*)")
      .eq("id", id)
      .eq("client_id", user.id)
      .single(),
    supabase.from("profiles").select("id, full_name, avatar_url, role").eq("id", user.id).single(),
    supabase
      .from("messages")
      .select("*, profiles(id, full_name, avatar_url, role)")
      .eq("booking_id", id)
      .order("created_at", { ascending: true }),
  ]);

  if (!booking) notFound();

  const { data: rider } = await supabase
    .from("hospitality_riders")
    .select("*")
    .eq("speaker_id", (booking as Booking).speaker_profiles?.id ?? "")
    .single();

  const speaker = (booking as Booking).speaker_profiles;
  const speakerName = speaker?.profiles?.full_name ?? "Speaker";

  async function handleSendMessage(bookingId: string, content: string) {
    "use server";
    await sendMessage(bookingId, content);
  }

  return (
    <div>
      <TopBar
        title={booking.event_name}
        subtitle={`Booking ref: ${booking.booking_number}`}
      >
        <Link href="/client/bookings">
          <button className="flex items-center gap-1.5 text-sm text-mid-gray hover:text-charcoal transition-colors">
            <ArrowLeft size={14} /> Back
          </button>
        </Link>
      </TopBar>

      <div className="p-4 sm:p-6 grid lg:grid-cols-3 gap-6">
        {/* Main info */}
        <div className="lg:col-span-2 space-y-4">
          {/* Status card */}
          <div className="bg-white border border-warm-gray rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-cormorant text-xl font-semibold text-ink">Booking Details</h2>
              <BookingStatusBadge status={booking.status} />
            </div>
            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              {[
                { label: "Speaker", value: speakerName },
                { label: "Event Date", value: new Date(booking.event_date).toLocaleDateString("en-ZA", { year: "numeric", month: "long", day: "numeric" }) },
                { label: "Location", value: booking.exact_location },
                { label: "Format", value: booking.event_format },
                { label: "Duration", value: `${booking.duration_minutes} minutes` },
                { label: "Organiser", value: booking.event_organiser },
                { label: "Company", value: booking.associated_company },
                { label: "Audience", value: booking.audience_demographics },
              ].map((row) => (
                <div key={row.label}>
                  <p className="text-[10px] font-semibold text-mid-gray uppercase tracking-wide">{row.label}</p>
                  <p className="text-charcoal mt-0.5">{row.value}</p>
                </div>
              ))}
              <div>
                <p className="text-[10px] font-semibold text-mid-gray uppercase tracking-wide">Quoted Fee</p>
                <p className="font-cormorant text-xl font-bold text-gold mt-0.5">{formatZAR(booking.quoted_fee_zar)}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-mid-gray uppercase tracking-wide">Rider Agreed</p>
                <p className="text-charcoal mt-0.5">{booking.hospitality_rider_agreed ? "✓ Yes" : "No"}</p>
              </div>
            </div>
            {booking.client_notes && (
              <div className="mt-4 pt-4 border-t border-warm-gray">
                <p className="text-[10px] font-semibold text-mid-gray uppercase tracking-wide mb-1">Notes</p>
                <p className="text-sm text-charcoal">{booking.client_notes}</p>
              </div>
            )}
          </div>

          {/* Hospitality rider */}
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
            <h2 className="font-cormorant text-lg font-semibold text-ink">Chat with {speakerName}</h2>
          </div>
          {profile && (
            <ChatPanel
              booking={booking as Booking}
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
