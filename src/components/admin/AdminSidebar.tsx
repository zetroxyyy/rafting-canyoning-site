"use client";

/**
 * AdminSidebar
 *
 * Responsive sidebar with mobile hamburger drawer.
 * - Desktop (lg+): always visible, fixed-width 220px column.
 * - Mobile (<lg): hidden off-screen, slides in as an overlay drawer
 *   when toggled by the hamburger button in the top bar.
 *
 * Receives comboBadgeCount from layout.tsx (server component) to display
 * an urgent live badge on the Combo Queue nav item without breaking the
 * client-component boundary.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
  CalendarDays,
  BookOpen,
  Tag,
  MessageSquare,
  LayoutDashboard,
  InboxIcon,
  Combine,
  Star,
  Settings,
  X,
  Menu,
} from "lucide-react";
import { cn } from "@/lib/cn";
import BrandLogo from "@/components/ui/BrandLogo";

interface Props {
  comboBadgeCount?: number;
}

export default function AdminSidebar({ comboBadgeCount = 0 }: Props) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Prevent body scroll when drawer is open on mobile
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const NAV = [
    { href: "/admin",              label: "Dashboard",    icon: LayoutDashboard, exact: true },
    { href: "/admin/bookings",     label: "Bookings",     icon: BookOpen },
    { href: "/admin/combos",       label: "Combo Queue",  icon: Combine, badge: comboBadgeCount },
    { href: "/admin/requests",     label: "Requests",     icon: InboxIcon },
    { href: "/admin/availability", label: "Availability", icon: CalendarDays },
    { href: "/admin/promotions",   label: "Promotions",   icon: Tag },
    { href: "/admin/contacts",     label: "Contacts",     icon: MessageSquare },
    { href: "/admin/reviews",      label: "Reviews",      icon: Star },
    { href: "/admin/settings",     label: "Settings",     icon: Settings },
  ];

  const navContent = (
    <>
      {/* ── Brand ─────────────────────────────────────────────────────── */}
      <div
        className="h-16 flex items-center justify-between px-4 flex-shrink-0 overflow-hidden"
        style={{ borderBottom: "1px solid rgba(13,148,136,0.08)" }}
      >
        <BrandLogo size="md" showName={false} alt="Dream Adventure Admin" />
        {/* Close button — mobile only */}
        <button
          onClick={() => setMobileOpen(false)}
          className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
          aria-label="Close menu"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* ── Nav ────────────────────────────────────────────────────────── */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {NAV.map(({ href, label, icon: Icon, exact, badge }) => {
          const isActive = exact ? pathname === href : pathname.startsWith(href);
          const hasBadge = typeof badge === "number" && badge > 0;

          return (
            <Link
              key={href}
              href={href}
              id={`admin-nav-${label.toLowerCase().replace(/\s+/g, "-")}`}
              className={cn(
                "group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium",
                "transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50 focus-visible:ring-offset-1",
                isActive
                  ? "bg-teal-50 text-teal-700 font-semibold border-l-4 border-teal-600 rounded-l-none pl-[8px]"
                  : "text-stone-500 hover:text-stone-900 hover:bg-stone-50/80"
              )}
            >
              <Icon
                className={cn(
                  "w-4 h-4 flex-shrink-0 transition-colors duration-200",
                  isActive ? "text-teal-600" : "text-stone-400 group-hover:text-stone-600"
                )}
              />
              <span className="truncate flex-1">{label}</span>

              {/* Live badge for unscheduled Combo Queue items */}
              {hasBadge && (
                <span
                  className="ml-auto inline-flex items-center justify-center min-w-[20px] h-5 rounded-full text-[10px] font-bold text-white px-1.5 leading-none animate-pulse"
                  style={{
                    background: badge > 0
                      ? "linear-gradient(135deg, #ef4444 0%, #f97316 100%)"
                      : "#0d9488",
                    animationDuration: "2s",
                  }}
                  aria-label={`${badge} unscheduled combo${badge !== 1 ? "s" : ""}`}
                >
                  {badge > 99 ? "99+" : badge}
                </span>
              )}

              {/* Active indicator dot (only when no badge) */}
              {isActive && !hasBadge && (
                <span
                  className="ml-auto w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ background: "#0d9488" }}
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* ── Footer strip ──────────────────────────────────────────────── */}
      <div
        className="px-4 py-3 flex items-center justify-between"
        style={{ borderTop: "1px solid rgba(0,0,0,0.05)" }}
      >
        <span className="text-xs text-stone-300">Dream Adventure</span>
        <span className="text-[10px] font-bold text-stone-200 uppercase tracking-wider">Admin</span>
      </div>
    </>
  );

  return (
    <>
      {/* ── Mobile hamburger button (in the top-bar flow) ──────────────────
          Rendered at the start of the header row on small screens only.     */}
      <button
        id="admin-mobile-menu-toggle"
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-0 left-0 z-30 h-16 w-14 flex items-center justify-center text-stone-500 hover:text-teal-700 transition-colors print:hidden"
        aria-label="Open navigation menu"
        aria-expanded={mobileOpen}
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* ── Desktop sidebar — always visible on lg+ ─────────────────────── */}
      <aside
        className="hidden lg:flex w-[220px] flex-col flex-shrink-0 min-h-screen print:hidden"
        style={{
          background:  "#ffffff",
          borderRight: "1px solid rgba(13,148,136,0.10)",
        }}
      >
        {navContent}
      </aside>

      {/* ── Mobile overlay backdrop ─────────────────────────────────────── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(2px)" }}
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Mobile drawer ───────────────────────────────────────────────── */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-[260px] flex flex-col lg:hidden print:hidden",
          "transition-transform duration-300 ease-in-out",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
        style={{
          background:  "#ffffff",
          borderRight: "1px solid rgba(13,148,136,0.10)",
          boxShadow:   mobileOpen ? "4px 0 24px rgba(0,0,0,0.12)" : "none",
        }}
        aria-label="Navigation drawer"
      >
        {navContent}
      </aside>
    </>
  );
}
