import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/Sidebar";
import { SidebarProvider } from "@/components/layout/SidebarContext";

export const metadata: Metadata = {
  title: "Speaker Portal",
  description: "Manage your bookings, profile, hospitality rider, and earnings on NxtSpeaker.",
};

export default async function SpeakerLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");
  if (profile.role !== "SPEAKER" && profile.role !== "ADMIN") redirect("/client/dashboard");

  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-cream">
        <Sidebar role="SPEAKER" userName={profile.full_name} avatarUrl={profile.avatar_url} isAdmin={profile.role === "ADMIN"} />
        <main className="flex-1 min-w-0 overflow-auto">{children}</main>
      </div>
    </SidebarProvider>
  );
}
