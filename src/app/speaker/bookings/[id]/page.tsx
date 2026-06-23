import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MessageSquare, CheckCircle, XCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/layout/TopBar";
import { BookingStatusBadge } from "@/components/ui/Badge";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { HospitalityRiderView } from "@/components/bookings/HospitalityRiderView";
import { Button } from "@/components/ui/Button";
import { formatZAR } from "@/lib/utils/currency";
import { updateBookingStatus } from "@/app/actions/bookings";
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
    description: `Booking request for ${title}${data?.booking_number ? ` (${data.booking_number})` : ""} on NxtSpeaker.`,
  };
}

export default async function SpeakerBookingDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: sp } = await supabase
    .from("speaker_profiles")
    .select("id")
    .eq("user_id", user.id)
    .single();

  const [{ data: booking }, { data: profile }, { data: messages }, { data: rider }] = await Promise.all([
    supabase
      .from("bookings")
      .select("*, profiles(*)")
      .eq("id", id)
      .eq("speaker_id", sp?.id ?? "")
      .single(),
    supabase.from("profiles").select("id, full_name, avatar_url, role").eq("id", user.id).single(),
    supabase
      .from("messages")
      .select("*, profiles(id, full_name, avatar_url, role)")
      .eq("booking_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("hospitality_riders")
      .select("*")
      .eq("speaker_id", sp?.id ?? "")
      .single(),
  ]);

  if (!booking) notFound();

  const clientProfile = (booking as Booking).profiles;

  async function accept() {
    "use server";
    await updateBookingStatus(id, "CONFIRMED");
  }

  async function decline() {
    "use server";
    await updateBookingStatus(id, "DECLINED");
  }

  async function handleSendMessage(bookingId: string, content: string) {
    "use server";
    await sendMessage(bookingId, content);
  }

  return (
    <div>
      <TopBar title={booking.event_name} subtitle={`Ref: ${booking.booking_number}`}>
        <Link href="/speaker/bookings">
          <button className="flex items-center gap-1.5 text-sm text-muted hover:text-primary transition-colors">
            <ArrowLeft size={14} /> Back
          </button>
        </Link>
      </TopBar>

      <div className="p-4 sm:p-6 grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {/* Booking card */}
          <div className="bg-white border border-line rounded-[12px] p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-archivo font-bold text-primary">Booking Details</h2>
              <BookingStatusBadge status={booking.status} />
            </div>

            {booking.status === "PENDING" && (
              <div className="flex gap-3 mb-5 p-4 bg-accent/5 border border-accent/20 rounded-[8px]">
                <form action={accept}>
                  <Button type="submit" variant="gold" className="gap-2">
                    <CheckCircle size={14} /> Accept Booking
                  </Button>
                </form>
                <form action={decline}>
                  <Button type="submit" variant="outline" className="gap-2 text-danger border-danger/40 hover:bg-danger/10">
                    <XCircle size={14} /> Decline
                  </Button>
                </form>
              </div>
            )}

            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              {[
                { label: "Client",    value: clientProfile?.full_name ?? "Client" },
                { label: "Company",   value: clientProfile?.company ?? booking.associated_company },
                { label: "Event Date", value: new Date(booking.event_date).toLocaleDateString("en-ZA", { year: "numeric", month: "long", day: "numeric" }) },
                { label: "Location",  value: booking.exact_location },
                { label: "Format",    value: booking.event_format },
                { label: "Duration",  value: `${booking.duration_minutes} minutes` },
                { label: "Organiser", value: booking.event_organiser },
                { label: "Audience",  value: booking.audience_demographics },
              ].map((row) => (
                <div key={row.label}>
                  <p className="text-[10px] font-space-mono font-semibold text-muted uppercase tracking-wide">{row.label}</p>
                  <p className="text-ink mt-0.5">{row.value}</p>
                </div>
              ))}
              <div>
                <p className="text-[10px] font-space-mono font-semibold text-muted uppercase tracking-wide">Quoted Fee</p>
                <p className="font-space-mono text-xl font-bold text-secondary mt-0.5">{formatZAR(booking.quoted_fee_zar)}</p>
              </div>
            </div>
            {booking.client_notes && (
              <div className="mt-4 pt-4 border-t border-line">
                <p className="text-[10px] font-space-mono font-semibold text-muted uppercase tracking-wide mb-1">Client Notes</p>
                <p className="text-sm text-ink">{booking.client_notes}</p>
              </div>
            )}
          </div>

          {rider && (
            <div className="bg-white border border-line rounded-[12px] p-5">
              <h2 className="font-archivo font-bold text-primary mb-4">Your Hospitality Rider</h2>
              <HospitalityRiderView rider={rider} />
              {booking.hospitality_rider_agreed && (
                <p className="text-xs text-success mt-4">
                  ✓ Client agreed to your rider on {booking.hospitality_agreed_at ? new Date(booking.hospitality_agreed_at).toLocaleDateString("en-ZA") : "submission"}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Chat */}
        <div className="bg-white border border-line rounded-[12px] overflow-hidden flex flex-col" style={{ minHeight: "300px" }}>
          <div className="flex items-center gap-2 px-4 py-3 border-b border-line">
            <MessageSquare size={16} className="text-secondary" />
            <h2 className="font-archivo font-bold text-primary">
              Chat with {clientProfile?.full_name ?? "Client"}
            </h2>
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
