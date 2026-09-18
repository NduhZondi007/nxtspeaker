"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Lock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { formatZARCents } from "@/lib/utils/currency";
import type { PaymentStatus } from "@/lib/types/database";

interface PaymentPanelProps {
  bookingId: string;
  grossCents: number;
  /** Status of the booking's latest payment, if any. */
  paymentStatus: PaymentStatus | null;
  /** True once the booking itself has reached PAID. */
  isPaid: boolean;
  onPay: (bookingId: string) => Promise<{ data?: { redirectUrl: string }; error?: string }>;
}

/**
 * The client's pay surface.
 *
 * Money values are Space Mono and never orange — per docs/DESIGN.md, orange
 * marks only the thing a user presses, which here is the single Pay button.
 */
export function PaymentPanel({
  bookingId,
  grossCents,
  paymentStatus,
  isPaid,
  onPay,
}: PaymentPanelProps) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handlePay() {
    setError(null);
    startTransition(async () => {
      const result = await onPay(bookingId);

      if (result.error) {
        setError(result.error);
        return;
      }

      if (result.data?.redirectUrl) {
        // A full navigation, not router.push: the destination is Yoco's
        // hosted checkout, outside this app.
        window.location.assign(result.data.redirectUrl);
      }
    });
  }

  if (isPaid) {
    return (
      <div className="bg-white border border-success/30 rounded-[12px] p-5">
        <div className="flex items-start gap-3">
          <CheckCircle2 size={20} className="text-success shrink-0 mt-0.5" />
          <div>
            <p className="text-[10px] font-space-mono font-semibold text-muted uppercase tracking-[0.14em]">
              Payment
            </p>
            <p className="font-archivo font-bold text-primary mt-1">Paid in full</p>
            <p className="font-space-mono text-2xl font-bold text-success mt-2">
              {formatZARCents(grossCents)}
            </p>
            <p className="text-xs text-muted mt-2 leading-relaxed">
              Held securely by NxtSpeaker and released to your speaker after the event.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-line rounded-[12px] p-5">
      <p className="text-[10px] font-space-mono font-semibold text-muted uppercase tracking-[0.14em]">
        Payment
      </p>
      <h2 className="font-archivo font-bold text-primary mt-1">Secure your booking</h2>

      <p className="font-space-mono text-3xl font-bold text-ink mt-3">
        {formatZARCents(grossCents)}
      </p>
      <p className="text-xs text-muted mt-1">Total due now</p>

      {paymentStatus === "FAILED" && (
        <p className="text-sm text-danger mt-4">
          Your last payment attempt did not go through. You can try again below.
        </p>
      )}

      {error && (
        <p role="alert" className="text-sm text-danger mt-4">
          {error}
        </p>
      )}

      <div className="mt-5">
        <Button variant="gold" size="lg" onClick={handlePay} loading={pending} className="w-full">
          {paymentStatus === "FAILED" ? "Try payment again" : `Pay ${formatZARCents(grossCents)}`}
        </Button>
      </div>

      <div className="flex items-center gap-1.5 mt-3 text-muted">
        <Lock size={12} />
        <p className="text-xs">You will be redirected to Yoco to complete payment.</p>
      </div>

      <div className="mt-4 pt-4 border-t border-line flex items-start gap-2">
        <ShieldCheck size={14} className="text-secondary shrink-0 mt-0.5" />
        <p className="text-xs text-muted leading-relaxed">
          NxtSpeaker holds your payment until your event has been delivered, then releases it to
          your speaker. If the booking is cancelled before the event, you are refunded in full.
        </p>
      </div>
    </div>
  );
}
