import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/Sidebar";
import { SidebarProvider } from "@/components/layout/SidebarContext";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
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

  if (profile.role !== "ADMIN") {
    redirect(profile.role === "SPEAKER" ? "/speaker/dashboard" : "/client/dashboard");
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-cream">
        <Sidebar role="ADMIN" userName={profile.full_name} avatarUrl={profile.avatar_url} />
        <main className="flex-1 min-w-0 overflow-auto">{children}</main>
      </div>
    </SidebarProvider>
  );
}
