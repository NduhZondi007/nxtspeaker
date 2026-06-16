import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/layout/TopBar";
import { AdminSpeakersClient } from "./AdminSpeakersClient";
import type { SpeakerProfile } from "@/lib/types/database";

export default async function AdminSpeakersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: rawSpeakers } = await supabase
    .from("speaker_profiles")
    .select("*, profiles(*)")
    .order("created_at", { ascending: false });

  const speakers = (rawSpeakers ?? []) as SpeakerProfile[];

  return (
    <div>
      <TopBar
        title="Speakers"
        subtitle={`${speakers.length} speaker${speakers.length !== 1 ? "s" : ""} · all statuses`}
      />
      <AdminSpeakersClient speakers={speakers} />
    </div>
  );
}
