import { redirect } from "next/navigation";
import { getMyProfile } from "@/lib/auth/session";

const HOME = {
  SPEAKER: "/speaker/dashboard",
  ADMIN: "/admin/dashboard",
  CLIENT: "/client/dashboard",
} as const;

export default async function HomePage() {
  // A failed profile read throws to the root error boundary; it used to fall
  // through to /client/dashboard, whose layout then disagreed about the role.
  const profile = await getMyProfile();
  if (!profile) redirect("/login");
  redirect(HOME[profile.role] ?? "/client/dashboard");
}
