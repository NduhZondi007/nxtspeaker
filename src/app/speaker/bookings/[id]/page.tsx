import type { Metadata } from "next";
import { cache } from "react";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MessageSquare, CheckCircle, XCircle, Trophy } from "lucide-react";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getMyProfile, getMySpeakerProfileId } from "@/lib/auth/session";
import { createLogger } from "@/lib/logger";
import { TopBar } from "@/components/layout/TopBar";
import { BookingStatusBadge } from "@/components/ui/Badge";
import { ActionButton } from "@/components/ui/ActionButton";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { HospitalityRiderView } from "@/components/bookings/HospitalityRiderView";
import { formatZAR } from "@/lib/utils/currency";
import { BOOKING_DETAIL_COLUMNS, canMarkDelivered, formatDateSAST } from "@/lib/utils/booking";
import { updateBookingStatus } from "@/app/actions/bookings";
import { sendMessage } from "@/app/actions/messages";
import type { Booking, Message, Profile } from "@/lib/types/database";

const log = createLogger("speaker-booking-page");

interface Props {
  params: Promise<{ id: string }>;
}

/**
 * One query per request, shared by generateMetadata and the page. Scoped to
 * the signed-in speaker's own bookings.
 */
const getSpeakerBooking = cache(async (id: string): Promise<Booking | null> => {
  if (!z.string().uuid().safeParse(id).success) return null;
  // No speaker profile means no booking of theirs can exist, and sending ""
  // to the uuid `speaker_id` column is a 22P02 error rather than no match.
  const speakerProfileId = await getMySpeakerProfileId();
  if (!speakerProfileId) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bookings")
    .select(`${BOOKING_DETAIL_COLUMNS}, profiles(id, full_name, avatar_url, company)`)
    .eq("id", id)
    .eq("speaker_id", speakerProfileId)
    .maybeSingle();

  if (error) {
    log.error("Could not load booking", { id, cause: error });
    throw new Error("Could not load this booking. Please try again.");
  }
  return (data as unknown as Booking) ?? null;
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const booking = await getSpeakerBooking(id);
  const title = booking?.event_name ?? "Booking Detail";
  return {
    title,
    description: `Booking request for ${title}${booking?.booking_number ? ` (${booking.booking_number})` : ""} on NxtSpeaker.`,
  };
}

export default async function SpeakerBookingDetailPage({ params }: Props) {
  const { id } = await params;

  const profile = await getMyProfile();
  if (!profile) redirect("/login");

  const booking = await getSpeakerBooking(id);
  if (!booking) notFound();

  const supabase = await createClient();
  const [messagesRes, riderRes] = await Promise.all([
    supabase
      .from("messages")
      .select("id, booking_id, sender_id, content, read_at, created_at, profiles(id, full_name, avatar_url, role)")
      .eq("booking_id", booking.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("hospitality_riders")
      .select("*")
      .eq("speaker_id", booking.speaker_id)
      .maybeSingle(),
  ]);

  if (messagesRes.error) log.error("Could not load messages", { id, cause: messagesRes.error });
  if (riderRes.error) log.error("Could not load rider", { id, cause: riderRes.error });

  const messages = (messagesRes.data ?? []) as unknown as Message[];
  const rider = riderRes.data;
  const clientProfile = booking.profiles;
  const deliverable = canMarkDelivered(booking.status, booking.event_date);

  return (
    <div>
      <TopBar title={booking.event_name} subtitle={`Ref: ${booking.booking_number}`}>
        <Link
          href="/speaker/bookings"
          className="flex items-center gap-1.5 text-sm text-muted hover:text-primary transition-colors"
        >
          <ArrowLeft size={14} aria-hidden="true" /> Back
        </Link>
      </TopBar>

      <div className="p-4 sm:p-6 grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {/* Booking card */}
          <div className="bg-white border border-line rounded-[8px] p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-archivo font-bold text-primary">Booking Details</h2>
              <BookingStatusBadge status={booking.status} />
            </div>

            {booking.status === "PENDING" && (
              <div className="flex flex-wrap gap-3 mb-5 p-4 bg-soft border border-line rounded-[8px]">
                <ActionButton
                  action={updateBookingStatus.bind(null, booking.id, "CONFIRMED")}
                  variant="gold"
                  size="md"
                >
                  <CheckCircle size={14} aria-hidden="true" /> Accept Booking
                </ActionButton>
                <ActionButton
                  action={updateBookingStatus.bind(null, booking.id, "DECLINED")}
                  variant="outline"
                  size="md"
                  confirm={{ message: "Decline this request?", confirmLabel: "Yes, decline" }}
                >
                  <XCircle size={14} aria-hidden="true" /> Decline
                </ActionButton>
              </div>
            )}

            {deliverable && (
              <div className="mb-5 p-4 bg-soft border border-line rounded-[8px] space-y-2">
                <p className="text-sm text-ink">
                  Did this event go ahead? Marking it delivered starts the 7-day hold before your payout is released.
                </p>
                <ActionButton
                  action={updateBookingStatus.bind(null, booking.id, "COMPLETED")}
                  variant="gold"
                  size="md"
                  confirm={{
                    message: "Confirm the event was delivered?",
                    confirmLabel: "Yes, mark delivered",
                  }}
                >
                  <Trophy size={14} aria-hidden="true" /> Mark event delivered
                </ActionButton>
              </div>
            )}

            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              {[
                { label: "Client",    value: clientProfile?.full_name ?? "Client" },
                { label: "Company",   value: clientProfile?.company ?? booking.associated_company },
                { label: "Event Date", value: formatDateSAST(booking.event_date) },
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
                <p className="font-space-mono text-xl font-bold text-ink mt-0.5">{formatZAR(booking.quoted_fee_zar)}</p>
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
            <div className="bg-white border border-line rounded-[8px] p-5">
              <h2 className="font-archivo font-bold text-primary mb-4">Your Hospitality Rider</h2>
              <HospitalityRiderView rider={rider} />
              {booking.hospitality_rider_agreed && (
                <p className="text-xs text-success mt-4">
                  ✓ Client agreed to your rider on{" "}
                  {booking.hospitality_agreed_at ? formatDateSAST(booking.hospitality_agreed_at) : "submission"}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Chat */}
        <div className="bg-white border border-line rounded-[8px] overflow-hidden flex flex-col min-h-[300px]">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-line">
            <MessageSquare size={16} className="text-secondary" aria-hidden="true" />
            <h2 className="font-archivo font-bold text-primary">
              Chat with {clientProfile?.full_name ?? "Client"}
            </h2>
          </div>
          <ChatPanel
            bookingId={booking.id}
            status={booking.status}
            initialMessages={messages}
            currentUser={profile as unknown as Profile}
            onSend={sendMessage}
          />
        </div>
      </div>
    </div>
  );
}
