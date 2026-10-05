import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/session";
import { Sidebar } from "@/components/layout/Sidebar";
import { SidebarProvider } from "@/components/layout/SidebarContext";

export const metadata: Metadata = {
  title: "Admin Portal",
  description: "Platform administration — manage users, bookings, and speakers on NxtSpeaker.",
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // requireRole redirects signed-out users and non-admins, and throws on a
  // failed profile read so it reaches admin/error.tsx instead of looping.
  const profile = await requireRole("ADMIN");

  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-white">
        <Sidebar role="ADMIN" userName={profile.full_name} avatarUrl={profile.avatar_url} />
        <main id="main-content" className="flex-1 min-w-0 overflow-auto">{children}</main>
      </div>
    </SidebarProvider>
  );
}
