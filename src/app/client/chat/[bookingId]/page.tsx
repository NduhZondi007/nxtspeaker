import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/layout/TopBar";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { sendMessage } from "@/app/actions/messages";
import type { Booking, Message, Profile } from "@/lib/types/database";

interface Props {
  params: Promise<{ bookingId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { bookingId } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("bookings")
    .select("event_name, speaker_profiles(profiles(full_name))")
    .eq("id", bookingId)
    .single();
  const eventName = data?.event_name ?? "Booking";
  return {
    title: `Chat — ${eventName}`,
    description: `Message thread for ${eventName} on NxtSpeaker.`,
  };
}

export default async function ClientChatPage({ params }: Props) {
  const { bookingId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data: booking }, { data: profile }, { data: messages }] = await Promise.all([
    supabase
      .from("bookings")
      .select("*, speaker_profiles(*, profiles(*))")
      .eq("id", bookingId)
      .eq("client_id", user.id)
      .single(),
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase
      .from("messages")
      .select("*, profiles(*)")
      .eq("booking_id", bookingId)
      .order("created_at", { ascending: true }),
  ]);

  if (!booking) notFound();

  const speaker = (booking as Booking).speaker_profiles;
  const speakerName = speaker?.profiles?.full_name ?? "Speaker";

  async function handleSendMessage(id: string, content: string) {
    "use server";
    await sendMessage(id, content);
  }

  return (
    <div className="flex flex-col h-[100dvh]">
      <TopBar title={`Chat — ${speakerName}`} subtitle={booking.event_name}>
        <Link href={`/client/bookings/${bookingId}`}>
          <button className="flex items-center gap-1.5 text-sm text-mid-gray hover:text-charcoal transition-colors">
            <ArrowLeft size={14} /> Back to booking
          </button>
        </Link>
      </TopBar>
      <div className="flex-1 overflow-hidden">
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
  );
}
