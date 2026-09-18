"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/Toast";
import type { BookingStatus } from "@/lib/types/database";

const STATUS_TOAST: Partial<Record<BookingStatus, { title: string; message?: string }>> = {
  // Under escrow, acceptance is the moment payment is due — the toast says so
  // rather than implying the booking is already settled.
  CONFIRMED: { title: "Booking accepted!", message: "The speaker confirmed — payment is now due." },
  DECLINED: { title: "Booking declined", message: "The speaker was unable to accept this request." },
  PAID: { title: "Payment received", message: "Your booking is confirmed and paid in full." },
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
