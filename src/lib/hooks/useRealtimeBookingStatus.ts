"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/Toast";
import type { BookingStatus } from "@/lib/types/database";

const STATUS_TOAST: Partial<Record<BookingStatus, { title: string; message?: string }>> = {
  CONFIRMED: { title: "Booking accepted!", message: "The speaker confirmed your request." },
  DECLINED: { title: "Booking declined", message: "The speaker was unable to accept this request." },
  DEPOSIT_PAID: { title: "Deposit received", message: "Your booking has moved to deposit paid." },
  COMPLETED: { title: "Booking completed", message: "This event has been marked as completed." },
  CANCELLED: { title: "Booking cancelled" },
};

/**
 * Subscribes the currently-signed-in client to realtime updates on their own
 * bookings, so they learn when a speaker accepts/declines (or any other
 * status change) without having to manually reload the page. Mirrors the
 * pattern used by useRealtimeMessages for chat.
 */
export function useRealtimeBookingStatus(clientId: string): void {
  const router = useRouter();
  const { info } = useToast();

  useEffect(() => {
    if (!clientId) return;

    const supabase = createClient();

    const channel = supabase
      .channel(`bookings:${clientId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "bookings",
          filter: `client_id=eq.${clientId}`,
        },
        (payload) => {
          const nextStatus = (payload.new as { status: BookingStatus }).status;
          const prevStatus = (payload.old as { status: BookingStatus }).status;
          if (nextStatus === prevStatus) return;

          const copy = STATUS_TOAST[nextStatus];
          info(copy?.title ?? "Booking updated", copy?.message);

          router.refresh();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, [clientId, router, info]);
}
