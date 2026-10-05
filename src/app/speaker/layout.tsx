import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getMyProfile } from "@/lib/auth/session";
import { Sidebar } from "@/components/layout/Sidebar";
import { SidebarProvider } from "@/components/layout/SidebarContext";

export const metadata: Metadata = {
  title: "Speaker Portal",
  description: "Manage your bookings, profile, hospitality rider, and earnings on NxtSpeaker.",
};

export default async function SpeakerLayout({ children }: { children: React.ReactNode }) {
  // Throws on a failed read (→ speaker/error.tsx) rather than redirecting to
  // /login, which middleware bounced straight back: the redirect loop.
  const profile = await getMyProfile();

  if (!profile) redirect("/login");
  if (profile.role !== "SPEAKER" && profile.role !== "ADMIN") redirect("/client/dashboard");

  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-white">
        <Sidebar role="SPEAKER" userName={profile.full_name} avatarUrl={profile.avatar_url} isAdmin={profile.role === "ADMIN"} />
        <main id="main-content" className="flex-1 min-w-0 overflow-auto">{children}</main>
      </div>
    </SidebarProvider>
  );
}
