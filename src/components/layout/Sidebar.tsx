"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Search,
  CalendarCheck,
  MessageSquare,
  User,
  Utensils,
  DollarSign,
  LogOut,
  Mic2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { UserRole } from "@/lib/types/database";

interface NavItem {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
}

const clientNav: NavItem[] = [
  { label: "Dashboard", href: "/client/dashboard", icon: LayoutDashboard },
  { label: "Find Speakers", href: "/client/discover", icon: Search },
  { label: "My Bookings", href: "/client/bookings", icon: CalendarCheck },
];

const speakerNav: NavItem[] = [
  { label: "Dashboard", href: "/speaker/dashboard", icon: LayoutDashboard },
  { label: "My Bookings", href: "/speaker/bookings", icon: CalendarCheck },
  { label: "My Profile", href: "/speaker/profile", icon: User },
  { label: "Hospitality Rider", href: "/speaker/rider", icon: Utensils },
  { label: "Earnings", href: "/speaker/earnings", icon: DollarSign },
];

interface SidebarProps {
  role: UserRole;
  userName: string;
  avatarUrl?: string | null;
}

export function Sidebar({ role, userName, avatarUrl }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const navItems = role === "SPEAKER" ? speakerNav : clientNav;

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <aside
      className="w-64 h-screen sticky top-0 flex flex-col"
      style={{
        background: "linear-gradient(180deg, #0A0A0F 0%, #1a1208 50%, #0A0A0F 100%)",
      }}
    >
      {/* Logo */}
      <div className="px-6 py-6 border-b border-white/10">
        <Link href={role === "SPEAKER" ? "/speaker/dashboard" : "/client/dashboard"} className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gold flex items-center justify-center">
            <Mic2 size={16} className="text-ink" />
          </div>
          <span className="font-cormorant text-xl text-gold font-semibold tracking-wide">
            NxtSpeaker
          </span>
        </Link>
      </div>

      {/* Role label */}
      <div className="px-6 pt-4 pb-2">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-gold/60">
          {role === "SPEAKER" ? "Speaker Portal" : "Client Portal"}
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150",
                active
                  ? "bg-gold/15 text-gold border-l-2 border-gold pl-[10px]"
                  : "text-white/60 hover:text-white hover:bg-white/8 border-l-2 border-transparent pl-[10px]",
              ].join(" ")}
            >
              <Icon size={16} />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User + logout */}
      <div className="px-4 py-4 border-t border-white/10">
        <div className="flex items-center gap-3 mb-3">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={userName}
              className="w-8 h-8 rounded-full object-cover ring-1 ring-gold/40"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center">
              <span className="text-xs font-bold text-gold">
                {userName.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate">{userName}</p>
            <p className="text-[10px] text-white/40 capitalize">{role.toLowerCase()}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 w-full px-3 py-2 text-xs text-white/50 hover:text-danger hover:bg-danger/10 rounded-lg transition-colors"
        >
          <LogOut size={14} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
