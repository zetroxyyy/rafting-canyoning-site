"use server";

/**
 * getCheckoutUrl — stub kept for backward compatibility.
 * Stripe is no longer used. All payments are manual.
 * This action now always returns NOT_FOUND so any lingering
 * "Continue Payment" UI gracefully shows an expired state.
 */

export type CheckoutUrlResult =
  | { success: true; url: string }
  | { success: false; reason: "NOT_FOUND" | "EXPIRED" | "NO_SESSION" | "ERROR" };

export async function getCheckoutUrl(
  _reference: string,
  _email: string
): Promise<CheckoutUrlResult> {
  // Stripe is not integrated — no checkout sessions exist.
  return { success: false, reason: "NO_SESSION" };
}
