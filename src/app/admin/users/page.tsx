import { redirect } from "next/navigation";
import Link from "next/link";
import { Users2, ShieldCheck, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/layout/TopBar";
import { promoteToAdmin, revokeAdmin } from "@/app/actions/admin";
import type { Profile } from "@/lib/types/database";

const roleBadge: Record<string, string> = {
  CLIENT: "bg-[#8C7CA8]/15 text-[#8C7CA8] border border-[#8C7CA8]/30",
  SPEAKER: "bg-gold/15 text-gold border border-gold/30",
  ADMIN: "bg-danger/15 text-danger border border-danger/30",
};

export default async function AdminUsersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: rawUsers } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  const users = (rawUsers ?? []) as Profile[];

  return (
    <div>
      <TopBar
        title="Users"
        subtitle={`${users.length} total user${users.length !== 1 ? "s" : ""}`}
      />

      <div className="p-4 sm:p-6">
        <div className="bg-white border border-warm-gray rounded-2xl overflow-hidden">
          {users.length === 0 ? (
            <div className="text-center py-16">
              <Users2 size={32} className="text-warm-gray mx-auto mb-3" />
              <p className="font-cormorant text-lg text-mid-gray">No users yet</p>
            </div>
          ) : (
            <div className="divide-y divide-warm-gray">
              {users.map((u: Profile) => (
                <div key={u.id} className="flex items-center gap-3 px-5 py-4">
                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-full bg-gold/20 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-gold">
                      {u.full_name.charAt(0).toUpperCase()}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-charcoal">{u.full_name}</p>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${roleBadge[u.role] ?? ""}`}>
                        {u.role === "ADMIN" && <ShieldCheck size={9} className="mr-1" />}
                        {u.role}
                      </span>
                      {u.base_role && (
                        <span className="text-[10px] text-mid-gray">(was {u.base_role})</span>
                      )}
                    </div>
                    <p className="text-xs text-mid-gray truncate">{u.email}</p>
                    <p className="text-[10px] text-mid-gray mt-0.5">
                      Joined {new Date(u.created_at).toLocaleDateString("en-ZA")}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                    {u.id !== user.id && (
                      <>
                        {u.role !== "ADMIN" ? (
                          <form action={async () => { "use server"; await promoteToAdmin(u.id); }}>
                            <button
                              type="submit"
                              className="text-xs px-3 py-1.5 border border-gold/40 text-gold rounded-lg hover:bg-gold/10 transition-colors"
                            >
                              Make Admin
                            </button>
                          </form>
                        ) : (
                          <form action={async () => { "use server"; await revokeAdmin(u.id); }}>
                            <button
                              type="submit"
                              className="text-xs px-3 py-1.5 border border-danger/30 text-danger rounded-lg hover:bg-danger/10 transition-colors"
                            >
                              Revoke Admin
                            </button>
                          </form>
                        )}
                      </>
                    )}
                    <Link href={`/admin/users/${u.id}`}>
                      <button className="text-xs px-3 py-1.5 border border-warm-gray text-charcoal rounded-lg hover:border-gold transition-colors flex items-center gap-1">
                        View <ChevronRight size={12} />
                      </button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
