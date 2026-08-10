"use client";

/**
 * AutoMarkRead — Task 5 Upgrade 3
 *
 * A zero-UI client component that calls useAutoMarkCategoryRead() when
 * the admin navigates to a specific section. Drop it at the top of any
 * admin page's JSX to auto-clear that category's notification badge.
 *
 * Usage:
 *   import AutoMarkRead from "@/components/admin/AutoMarkRead";
 *   // inside the page's return:
 *   <AutoMarkRead category="contacts" />
 */

import { useAutoMarkCategoryRead } from "@/components/admin/AdminNotificationBell";

type Category = "bookings" | "requests" | "contacts";

export default function AutoMarkRead({ category }: { category: Category }) {
  useAutoMarkCategoryRead(category);
  return null; // renders nothing — side-effect only
}
