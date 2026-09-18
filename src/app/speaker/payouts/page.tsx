import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AlertTriangle, Banknote } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/layout/TopBar";
import { PayoutDetailsForm } from "@/components/payments/PayoutDetailsForm";
import { saveSpeakerPayoutDetails } from "@/app/actions/payments";
import { formatZARCents } from "@/lib/utils/currency";
import type { Payout, SpeakerPayoutDetails, SpeakerPayoutDetailsFormData } from "@/lib/types/database";

export const metadata: Metadata = {
  title: "Payout Details",
  description: "Manage the bank account NxtSpeaker pays your speaking fees into.",
};

export default async function SpeakerPayoutsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: speakerProfile } = await supabase
    .from("speaker_profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  // Guarded rather than falling back to "", which Postgres rejects for a uuid
  // column (22P02) instead of matching no rows — the same trap fixed across
  // five pages previously.
  const [{ data: details }, { data: rawPayouts }] = speakerProfile
    ? await Promise.all([
        supabase
          .from("speaker_payout_details")
          .select("*")
          .eq("speaker_id", speakerProfile.id)
          .maybeSingle(),
        supabase
          .from("payouts")
          .select("*, bookings(event_name, booking_number, event_date)")
          .eq("speaker_id", speakerProfile.id)
          .order("created_at", { ascending: false }),
      ])
    : [{ data: null }, { data: [] }];

  const payouts = (rawPayouts ?? []) as Payout[];
  const owed = payouts
    .filter((p) => p.status === "PENDING" || p.status === "DUE")
    .reduce((sum, p) => sum + Number(p.amount_cents), 0);

  const needsDetails = !details && owed > 0;

  async function handleSave(data: SpeakerPayoutDetailsFormData) {
    "use server";
    const result = await saveSpeakerPayoutDetails(data);
    return result.error ? { error: result.error } : { data: result.data };
  }

  return (
    <div>
      <TopBar title="Payout Details" subtitle="Where NxtSpeaker sends your fees" />

      <div className="p-4 sm:p-6 space-y-6 max-w-2xl">
        {needsDetails && (
          <div className="bg-white border border-danger/30 rounded-[12px] p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle size={18} className="text-danger shrink-0 mt-0.5" />
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

        <PayoutDetailsForm
          existing={(details as SpeakerPayoutDetails | null) ?? null}
          onSave={handleSave}
        />

        <div className="bg-white border border-line rounded-[12px] p-5">
          <div className="flex items-center gap-2 mb-3">
            <Banknote size={16} className="text-secondary" />
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
