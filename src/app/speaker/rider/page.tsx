import { TopBar } from "@/components/layout/TopBar";
import { getMySpeakerProfileId } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { createLogger } from "@/lib/logger";
import { RiderForm } from "./RiderForm";
import { RIDER_COLUMNS, toRiderPreferences, type RiderPreferences } from "./defaults";

const log = createLogger("speaker/rider");

/**
 * Server Component. The rider used to be loaded in the browser and the page
 * showed its skeleton forever whenever the row was missing or the read
 * failed. Now: a failed read throws to speaker/error.tsx, a missing row opens
 * the form with defaults (updateRider upserts it on save).
 */
export default async function SpeakerRiderPage() {
  const speakerId = await getMySpeakerProfileId();

  if (!speakerId) {
    return (
      <div>
        <TopBar title="Hospitality Rider" />
        <div className="p-4 sm:p-6 max-w-2xl">
          <div role="status" className="bg-soft border border-line rounded-[12px] p-5">
            <p className="text-sm font-semibold text-primary">No speaker profile on this account</p>
            <p className="text-xs text-ink mt-1">
              The hospitality rider belongs to a speaker profile. If you are a speaker and see this, contact
              support so your profile can be restored.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("hospitality_riders")
    .select(RIDER_COLUMNS)
    .eq("speaker_id", speakerId)
    .maybeSingle();

  if (error) {
    log.error("rider read failed", { cause: error });
    throw new Error("Could not load your hospitality rider. Please try again.");
  }

  return (
    <RiderForm
      initialRider={toRiderPreferences(data as Partial<RiderPreferences> | null)}
      isNew={!data}
    />
  );
}
