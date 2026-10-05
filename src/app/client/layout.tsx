import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getMyProfile } from "@/lib/auth/session";
import { Sidebar } from "@/components/layout/Sidebar";
import { SidebarProvider } from "@/components/layout/SidebarContext";
import { BookingStatusWatcher } from "@/components/bookings/BookingStatusWatcher";

export const metadata: Metadata = {
  title: "Client Portal",
  description: "Discover and book world-class speakers for your events on NxtSpeaker.",
};

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  // getMyProfile THROWS on a failed read, which lands on client/error.tsx.
  // Redirecting to /login on any falsy result used to bounce a signed-in user
  // between /login and middleware forever when the profile query failed.
  const profile = await getMyProfile();

  if (!profile) redirect("/login");
  if (profile.role !== "CLIENT" && profile.role !== "ADMIN") redirect("/speaker/dashboard");

  return (
    <SidebarProvider>
      {profile.role === "CLIENT" && <BookingStatusWatcher clientId={profile.id} />}
      <div className="flex min-h-screen bg-white">
        <Sidebar role="CLIENT" userName={profile.full_name} avatarUrl={profile.avatar_url} isAdmin={profile.role === "ADMIN"} />
        <main id="main-content" className="flex-1 min-w-0 overflow-auto">{children}</main>
      </div>
    </SidebarProvider>
  );
}
