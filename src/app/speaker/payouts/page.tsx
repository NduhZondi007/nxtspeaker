import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AlertTriangle, Banknote } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getMySpeakerProfileId, getSessionUser } from "@/lib/auth/session";
import { TopBar } from "@/components/layout/TopBar";
import { LoadError } from "@/components/payments/LoadError";
import { PayoutDetailsForm } from "@/components/payments/PayoutDetailsForm";
import { saveSpeakerPayoutDetails } from "@/app/actions/payments";
import { formatZARCents } from "@/lib/utils/currency";
import { createLogger } from "@/lib/logger";
import type { BankAccountType, SpeakerPayoutDetailsFormData } from "@/lib/types/database";

const log = createLogger("speaker-payouts-page");

interface ExistingDetails {
  account_holder: string;
  bank_name: string;
  account_number: string;
  branch_code: string;
  account_type: BankAccountType;
  tax_number: string | null;
  is_vat_registered: boolean;
  verified_at: string | null;
}

export const metadata: Metadata = {
  title: "Payout Details",
  description: "Manage the bank account NxtSpeaker pays your speaking fees into.",
};

export default async function SpeakerPayoutsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  // RLS-scoped user client: a speaker reads only their own rows.
  const [speakerId, supabase] = await Promise.all([getMySpeakerProfileId(), createClient()]);

  // Guarded rather than falling back to "", which Postgres rejects for a uuid
  // column (22P02) instead of matching no rows — the same trap fixed across
  // five pages previously.
  const [detailsResult, payoutsResult] = speakerId
    ? await Promise.all([
        supabase
          .from("speaker_payout_details")
          .select(
            "account_holder, bank_name, account_number, branch_code, account_type, tax_number, is_vat_registered, verified_at"
          )
          .eq("speaker_id", speakerId)
          .maybeSingle(),
        supabase
          .from("payouts")
          .select("amount_cents")
          .eq("speaker_id", speakerId)
          .in("status", ["PENDING", "DUE", "ON_HOLD"]),
      ])
    : [
        { data: null, error: null },
        { data: [], error: null },
      ];

  if (detailsResult.error) log.error("payout details query failed", { cause: detailsResult.error });
  if (payoutsResult.error) log.error("payouts query failed", { cause: payoutsResult.error });

  const details = (detailsResult.data ?? null) as ExistingDetails | null;
  const owed = ((payoutsResult.data ?? []) as { amount_cents: number | string }[]).reduce(
    (sum, p) => sum + Number(p.amount_cents),
    0
  );

  const needsDetails = !detailsResult.error && !details && owed > 0;

  async function handleSave(data: SpeakerPayoutDetailsFormData) {
    "use server";
    const result = await saveSpeakerPayoutDetails(data);
    return "error" in result ? { error: result.error } : { data: result.data };
  }

  return (
    <div>
      <TopBar title="Payout Details" subtitle="Where NxtSpeaker sends your fees" />

      <div className="p-4 sm:p-6 space-y-6 max-w-2xl">
        {needsDetails && (
          <div className="bg-white border border-danger/30 rounded-[12px] p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle size={18} className="text-danger shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <p className="font-archivo font-bold text-primary">Add your bank details</p>
                <p className="text-sm text-ink mt-1 leading-relaxed">
                  You have{" "}
                  <span className="font-space-mono font-bold">{formatZARCents(owed)}</span> waiting
                  to be paid out, but no account to pay it into.
                </p>
              </div>
            </div>
          </div>
        )}

        {detailsResult.error ? (
          <LoadError title="Your bank details could not be loaded" />
        ) : (
          <PayoutDetailsForm existing={details} onSave={handleSave} />
        )}

        <div className="bg-white border border-line rounded-[12px] p-5">
          <div className="flex items-center gap-2 mb-3">
            <Banknote size={16} className="text-secondary" aria-hidden="true" />
            <h2 className="font-archivo font-bold text-primary">How you get paid</h2>
          </div>
          <ul className="text-sm text-ink space-y-2 leading-relaxed">
            <li>
              The client pays the full fee to NxtSpeaker when they confirm the booking. It is held
              until your event has been delivered.
            </li>
            <li>
              NxtSpeaker retains a <span className="font-space-mono font-bold">15%</span> platform
              commission. You receive the remaining{" "}
              <span className="font-space-mono font-bold">85%</span>.
            </li>
            <li>
              Once the booking is marked completed, your payout is released after a 7-day window
              and paid by EFT into the account above.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
