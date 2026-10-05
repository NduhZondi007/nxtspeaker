import type { Metadata } from "next";
import { cache } from "react";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getMyProfile, getSessionUser } from "@/lib/auth/session";
import { createLogger } from "@/lib/logger";
import { TopBar } from "@/components/layout/TopBar";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { sendMessage } from "@/app/actions/messages";
import type { BookingStatus, Message, Profile } from "@/lib/types/database";

const log = createLogger("client-chat-page");

interface Props {
  params: Promise<{ bookingId: string }>;
}

interface ChatBooking {
  id: string;
  event_name: string;
  status: BookingStatus;
  speaker_profiles: { profiles: { full_name: string } | null } | null;
}

/** Shared by generateMetadata and the page. */
const getChatBooking = cache(async (bookingId: string): Promise<ChatBooking | null> => {
  if (!z.string().uuid().safeParse(bookingId).success) return null;
  const user = await getSessionUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bookings")
    .select("id, event_name, status, speaker_profiles(profiles(full_name))")
    .eq("id", bookingId)
    .eq("client_id", user.id)
    .maybeSingle();

  if (error) {
    log.error("Could not load booking", { bookingId, cause: error });
    throw new Error("Could not load this conversation. Please try again.");
  }
  return (data as unknown as ChatBooking) ?? null;
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { bookingId } = await params;
  const booking = await getChatBooking(bookingId);
  const eventName = booking?.event_name ?? "Booking";
  return {
    title: `Chat — ${eventName}`,
    description: `Message thread for ${eventName} on NxtSpeaker.`,
  };
}

export default async function ClientChatPage({ params }: Props) {
  const { bookingId } = await params;

  const profile = await getMyProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();
  const [booking, messagesRes] = await Promise.all([
    getChatBooking(bookingId),
    supabase
      .from("messages")
      .select("id, booking_id, sender_id, content, read_at, created_at, profiles(id, full_name, avatar_url, role)")
      .eq("booking_id", bookingId)
      .order("created_at", { ascending: true }),
  ]);

  if (!booking) notFound();
  if (messagesRes.error) log.error("Could not load messages", { bookingId, cause: messagesRes.error });

  const speakerName = booking.speaker_profiles?.profiles?.full_name ?? "Speaker";

  return (
    <div className="flex flex-col h-[100dvh]">
      <TopBar title={`Chat — ${speakerName}`} subtitle={booking.event_name}>
        <Link
          href={`/client/bookings/${bookingId}`}
          className="flex items-center gap-1.5 text-sm text-muted hover:text-primary transition-colors"
        >
          <ArrowLeft size={14} aria-hidden="true" /> Back to booking
        </Link>
      </TopBar>
      <div className="flex-1 overflow-hidden">
        <ChatPanel
          bookingId={booking.id}
          status={booking.status}
          initialMessages={(messagesRes.data ?? []) as unknown as Message[]}
          currentUser={profile as unknown as Profile}
          onSend={sendMessage}
        />
      </div>
    </div>
  );
}
