/**
 * Maintenance & Opening Mode Helpers
 *
 * getMaintenanceMode  — reads the admin-toggleable maintenance flag from DB.
 * getGrandOpeningMode — returns true while the company is in pre-launch mode.
 *                       Controlled by the GRAND_OPENING_SOON env var (default: true).
 *                       Set GRAND_OPENING_SOON=false in Vercel to flip to open.
 */
import { prisma } from "@/lib/prisma";

export async function getMaintenanceMode(): Promise<boolean> {
  try {
    const row = await prisma.systemSetting.findUnique({
      where: { key: "maintenanceMode" },
      select: { value: true },
    });
    return row?.value === "true";
  } catch {
    // If the table doesn't exist yet (pre-migration) fail open — don't block the site
    return false;
  }
}

/**
 * Grand Opening Mode
 *
 * Returns true (block bookings, show "Opening Soon") until the env var is
 * explicitly set to "false". This gives the owner a single Vercel env-var toggle
 * to flip the site from "coming soon" to "open for bookings".
 */
export function getGrandOpeningMode(): boolean {
  // Default to true (pre-launch). Set GRAND_OPENING_SOON=false to open.
  return process.env.GRAND_OPENING_SOON !== "false";
}
