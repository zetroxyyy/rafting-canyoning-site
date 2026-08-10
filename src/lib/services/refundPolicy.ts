/**
 * Refund policy service.
 * Centralized refund calculation — do NOT couple this to booking.ts.
 *
 * Policy (all activities and add-ons):
 *   7+ days before trip    = 100% refund
 *   2–6 days before trip   = 50% refund
 *   < 48 hours before trip = 0% refund
 *   Same day / no-show     = 0% refund
 */

export interface RefundResult {
  /** Refund amount in JPY */
  refundJpy: number;
  /** Percentage that will be returned (0, 50, or 100) */
  refundPercent: number;
  /** Human-readable policy note */
  policyNoteEn: string;
  policyNoteJa: string;
  /** Days before the trip the cancellation was requested */
  daysBeforeTrip: number;
}

/**
 * Calculate the suggested refund for a booking.
 *
 * @param tripDate - The trip date (from slot.date)
 * @param totalJpy - The amount originally paid
 * @param now     - Override for "now" (used in tests; defaults to current time)
 */
export function calculateRefund(
  tripDate: Date,
  totalJpy: number,
  now: Date = new Date()
): RefundResult {
  // Normalize to midnight UTC for clean day arithmetic
  const tripMidnight = new Date(
    Date.UTC(tripDate.getUTCFullYear(), tripDate.getUTCMonth(), tripDate.getUTCDate())
  );
  const nowMidnight = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );

  const msPerDay = 24 * 60 * 60 * 1000;
  const daysBeforeTrip = Math.floor(
    (tripMidnight.getTime() - nowMidnight.getTime()) / msPerDay
  );

  // Also check hours for the <48h boundary
  const hoursBeforeTrip = (tripMidnight.getTime() - now.getTime()) / (60 * 60 * 1000);

  let refundPercent: number;
  let policyNoteEn: string;
  let policyNoteJa: string;

  if (hoursBeforeTrip < 0) {
    // Past trip date — no refund
    refundPercent = 0;
    policyNoteEn = "Trip date has passed — no refund applicable.";
    policyNoteJa = "ご旅行日が過ぎているため、返金はできません。";
  } else if (hoursBeforeTrip < 48) {
    // Less than 48 hours
    refundPercent = 0;
    policyNoteEn = "Less than 48 hours before trip — no refund (0%).";
    policyNoteJa = "旅行の48時間前を切っているため、返金はできません（0%）。";
  } else if (daysBeforeTrip <= 6) {
    // 2–6 days: 50%
    refundPercent = 50;
    policyNoteEn = `${daysBeforeTrip} days before trip — 50% refund applies.`;
    policyNoteJa = `旅行${daysBeforeTrip}日前のキャンセル — 50%返金が適用されます。`;
  } else {
    // 7+ days: 100%
    refundPercent = 100;
    policyNoteEn = `${daysBeforeTrip} days before trip — full 100% refund applies.`;
    policyNoteJa = `旅行${daysBeforeTrip}日前のキャンセル — 全額100%返金が適用されます。`;
  }

  const refundJpy = Math.floor((totalJpy * refundPercent) / 100);

  return {
    refundJpy,
    refundPercent,
    policyNoteEn,
    policyNoteJa,
    daysBeforeTrip: Math.max(0, daysBeforeTrip),
  };
}

/**
 * Returns the cancellation policy as a static human-readable string.
 * Used in PDFs, the manage portal, and emails.
 */
export function getCancellationPolicyText(locale: "en" | "ja"): string {
  if (locale === "ja") {
    return [
      "キャンセルポリシー",
      "• 旅行7日以上前：全額返金（100%）",
      "• 旅行2〜6日前：50%返金",
      "• 旅行48時間前以内：返金なし（0%）",
      "• 当日・無断キャンセル：返金なし（0%）",
      "悪天候によるキャンセルは別途対応いたします。",
    ].join("\n");
  }
  return [
    "Cancellation Policy",
    "• 7+ days before trip: Full refund (100%)",
    "• 2–6 days before trip: 50% refund",
    "• Less than 48 hours before trip: No refund (0%)",
    "• Same day / no-show: No refund (0%)",
    "Weather cancellations are handled separately by our team.",
  ].join("\n");
}
