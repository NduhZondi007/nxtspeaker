"use client";

import { useId, useState, useTransition } from "react";
import { XCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cancelBooking } from "@/app/actions/bookings";

interface CancelBookingButtonProps {
  bookingId: string;
}

/**
 * Client-side withdrawal of a PENDING or CONFIRMED request. Two steps, because
 * a cancelled booking cannot be re-opened.
 */
export function CancelBookingButton({ bookingId }: CancelBookingButtonProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const reasonId = useId();

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await cancelBooking(bookingId, reason);
        if (result.error) setError(result.error);
        else setOpen(false);
      } catch {
        setError("Something went wrong. Please try again.");
      }
    });
  }

  if (!open) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)} className="gap-1.5">
        <XCircle size={13} aria-hidden="true" /> Cancel request
      </Button>
    );
  }

  return (
    <div className="space-y-3 rounded-[8px] border border-danger/30 bg-danger/5 p-4">
      <p className="text-sm font-semibold text-ink">Cancel this booking request?</p>
      <p className="text-xs text-muted">The speaker will be notified. This cannot be undone.</p>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={reasonId} className="text-xs font-semibold text-ink uppercase tracking-wide">
          Reason (optional)
        </label>
        <textarea
          id={reasonId}
          rows={2}
          maxLength={1000}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="px-3 py-2 text-sm border border-line rounded-[8px] bg-white text-ink focus:outline-none focus:border-secondary"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="danger" size="sm" loading={pending} onClick={submit}>
          Yes, cancel request
        </Button>
        <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={() => setOpen(false)}>
          Keep booking
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
