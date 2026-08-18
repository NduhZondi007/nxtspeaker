"use client";

import { useRealtimeBookingStatus } from "@/lib/hooks/useRealtimeBookingStatus";

interface BookingStatusWatcherProps {
  clientId: string;
}

/**
 * Renders nothing — mounted once per client-area layout to keep the
 * organiser's realtime booking-status subscription alive across every page
 * under /client/*, regardless of which one they're currently viewing.
 */
export function BookingStatusWatcher({ clientId }: BookingStatusWatcherProps) {
  useRealtimeBookingStatus(clientId);
  return null;
}
