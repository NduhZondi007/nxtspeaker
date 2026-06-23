"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Search,
  CalendarCheck,
  User,
  Utensils,
  DollarSign,
  LogOut,
  X,
  Users2,
  ShieldCheck,
  ArrowLeft,
} from "lucide-react";
import { logoutUser } from "@/app/actions/auth";
import { useSidebar } from "@/components/layout/SidebarContext";
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

const adminNav: NavItem[] = [
  { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { label: "Users", href: "/admin/users", icon: Users2 },
  { label: "Bookings", href: "/admin/bookings", icon: CalendarCheck },
  { label: "Speakers", href: "/admin/speakers", icon: Search },
];

const portalLabels: Record<UserRole, string> = {
  CLIENT: "Client Portal",
  SPEAKER: "Speaker Portal",
  ADMIN: "Admin Portal",
};

interface SidebarProps {
  role: UserRole;
  userName: string;
  avatarUrl?: string | null;
  isAdmin?: boolean;
}

export function Sidebar({ role, userName, avatarUrl, isAdmin }: SidebarProps) {
  const pathname = usePathname();
  const { isOpen, close } = useSidebar();

  const navItems =
    role === "ADMIN" ? adminNav : role === "SPEAKER" ? speakerNav : clientNav;

  const logoHref =
    role === "ADMIN"
      ? "/admin/dashboard"
      : role === "SPEAKER"
      ? "/speaker/dashboard"
      : "/client/dashboard";

  async function handleLogout() {
    await logoutUser();
  }

  function handleNavClick() {
    close();
  }

  const sidebarContent = (
    <aside
      className={[
        "fixed inset-y-0 left-0 z-40 w-64 flex flex-col transition-transform duration-300",
        "md:sticky md:top-0 md:h-screen md:translate-x-0 md:z-auto",
        isOpen ? "translate-x-0" : "-translate-x-full",
      ].join(" ")}
      style={{ background: "#031E57" }}
    >
      {/* Logo */}
      <div className="px-6 py-6 border-b border-white/10 flex items-center justify-between">
        <Link href={logoHref} onClick={handleNavClick}>
          <Image
            src="/logoHoriz_white.png"
            alt="NXT Speaker"
            width={140}
            height={32}
            className="object-contain"
            priority
          />
        </Link>
        <button
          onClick={close}
          className="md:hidden text-white/50 hover:text-white transition-colors p-1"
          aria-label="Close menu"
        >
          <X size={18} />
        </button>
      </div>

      {/* Role label */}
      <div className="px-6 pt-4 pb-2 flex items-center gap-2">
        {role === "ADMIN" && <ShieldCheck size={10} className="text-secondary/70" />}
        <span className="text-[10px] font-semibold uppercase tracking-widest text-secondary/70 font-space-mono">
          {portalLabels[role]}
        </span>
      </div>

      {/* Back to Admin Portal */}
      {isAdmin && role !== "ADMIN" && (
        <div className="px-3 pb-1">
          <Link
            href="/admin/dashboard"
            onClick={handleNavClick}
            className="flex items-center gap-2 px-3 py-2 text-xs text-secondary/80 hover:text-secondary bg-secondary/10 border border-secondary/20 rounded-[4px] transition-colors"
          >
            <ArrowLeft size={12} />
            <span className="font-medium italic">Back to Admin Portal</span>
          </Link>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={handleNavClick}
              className={[
                "flex items-center gap-3 px-3 py-2.5 rounded-[4px] text-sm transition-all duration-150",
                active
                  ? "bg-white/10 text-white border-l-2 border-accent pl-[10px]"
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
            <Image
              src={avatarUrl}
              alt={userName}
              width={32}
              height={32}
              className="rounded-full object-cover ring-1 ring-secondary/40"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center">
              <span className="text-xs font-bold text-secondary">
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
          className="flex items-center gap-2 w-full px-3 py-2 text-xs text-white/50 hover:text-danger hover:bg-danger/10 rounded-[4px] transition-colors"
        >
          <LogOut size={14} />
          Sign Out
        </button>
      </div>
    </aside>
  );

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={close}
          aria-hidden="true"
        />
      )}
      {sidebarContent}
    </>
  );
}
