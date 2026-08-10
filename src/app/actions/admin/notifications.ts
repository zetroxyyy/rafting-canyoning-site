"use server";

/**
 * Admin notification server actions.
 *
 * markContactRead(id)         — sets ContactSubmission.isRead = true for one contact
 * markAllContactsRead()       — marks every unread ContactSubmission as read
 * markAllBookingNotesRead()   — no-op (read state tracked via localStorage in client)
 *
 * These are called by:
 *   - AdminNotificationBell: when clicking a contact notification row
 *   - Admin contacts page layout: auto-mark all when visiting /admin/contacts
 */

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function markContactRead(id: string): Promise<void> {
  const session = await auth();
  if (!session) return;

  await prisma.contactSubmission.update({
    where: { id },
    data: { isRead: true },
  }).catch(console.error);

  revalidatePath("/admin/contacts");
}

export async function markAllContactsRead(): Promise<void> {
  const session = await auth();
  if (!session) return;

  await prisma.contactSubmission.updateMany({
    where: { isRead: false },
    data: { isRead: true },
  }).catch(console.error);

  revalidatePath("/admin/contacts");
}
