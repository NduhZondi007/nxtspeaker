import Link from "next/link";
import { Users2, ShieldCheck, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/session";
import { TopBar } from "@/components/layout/TopBar";
import { buttonClasses } from "@/components/ui/Button";
import { ActionButton } from "@/components/ui/ActionButton";
import { Pagination, PAGE_SIZE, pageRange, parsePage } from "@/components/bookings/Pagination";
import { promoteToAdmin, revokeAdmin } from "@/app/actions/admin";
import { formatDateSAST } from "@/lib/utils/booking";
import type { Profile } from "@/lib/types/database";

interface Props {
  searchParams: Promise<{ page?: string }>;
}

const roleBadge: Record<string, string> = {
  CLIENT: "bg-secondary/10 text-secondary border border-secondary/30",
  // Not orange: a role label is not an action. See docs/DESIGN.md.
  SPEAKER: "bg-support text-primary border border-support",
  ADMIN: "bg-primary/10 text-primary border border-primary/30",
};

export default async function AdminUsersPage({ searchParams }: Props) {
  const admin = await requireRole("ADMIN");

  const page = parsePage((await searchParams).page);
  const [from, to] = pageRange(page);

  const supabase = await createClient();
  const { data: rawUsers, count, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, base_role, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) throw new Error("Could not load users. Please try again.");

  const users = (rawUsers ?? []) as Profile[];
  const total = count ?? users.length;

  return (
    <div>
      <TopBar title="Users" subtitle={`${total} total user${total !== 1 ? "s" : ""}`} />

      <div className="p-4 sm:p-6 space-y-4">
        <div className="bg-white border border-line rounded-[8px] overflow-hidden">
          {users.length === 0 ? (
            <div className="text-center py-16">
              <Users2 size={32} className="text-line mx-auto mb-3" aria-hidden="true" />
              <p className="font-archivo text-muted">No users yet</p>
            </div>
          ) : (
            <div className="divide-y divide-line">
              {users.map((u) => (
                <div key={u.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
                  <div className="w-9 h-9 rounded-full bg-secondary/20 flex items-center justify-center shrink-0" aria-hidden="true">
                    <span className="text-sm font-bold text-secondary">
                      {u.full_name.charAt(0).toUpperCase()}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-ink">{u.full_name}</p>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold font-space-mono uppercase ${roleBadge[u.role] ?? ""}`}>
                        {u.role === "ADMIN" && <ShieldCheck size={9} className="mr-1" aria-hidden="true" />}
                        {u.role}
                      </span>
                      {u.base_role && (
                        <span className="text-[10px] text-muted">(was {u.base_role})</span>
                      )}
                    </div>
                    <p className="text-xs text-muted truncate">{u.email}</p>
                    <p className="text-[10px] text-muted mt-0.5">Joined {formatDateSAST(u.created_at)}</p>
                  </div>

                  <div className="flex items-start gap-2 shrink-0 flex-wrap justify-end">
                    {u.id !== admin.id &&
                      (u.role !== "ADMIN" ? (
                        <ActionButton
                          action={promoteToAdmin.bind(null, u.id)}
                          variant="outline"
                          confirm={{ message: `Make ${u.full_name} an admin?`, confirmLabel: "Yes, make admin" }}
                        >
                          Make Admin
                        </ActionButton>
                      ) : (
                        <ActionButton
                          action={revokeAdmin.bind(null, u.id)}
                          variant="outline"
                          className="text-danger border-danger/40"
                          confirm={{ message: `Revoke ${u.full_name}'s admin access?`, confirmLabel: "Yes, revoke" }}
                        >
                          Revoke Admin
                        </ActionButton>
                      ))}
                    <Link
                      href={`/admin/users/${u.id}`}
                      className={buttonClasses({ variant: "ghost", size: "sm" })}
                      aria-label={`View ${u.full_name}`}
                    >
                      View <ChevronRight size={12} aria-hidden="true" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <Pagination page={page} pageSize={PAGE_SIZE} total={total} hrefFor={(p) => `/admin/users?page=${p}`} />
      </div>
    </div>
  );
}
