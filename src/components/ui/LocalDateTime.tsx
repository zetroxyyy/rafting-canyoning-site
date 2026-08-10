"use client";

/**
 * LocalDateTime
 *
 * Renders an ISO date string using the browser's local timezone via
 * Intl.DateTimeFormat. Avoids the UTC raw-time display that occurs when
 * a server component calls Date.toLocaleString() (which uses the server's TZ).
 *
 * Usage:
 *   <LocalDateTime iso={booking.createdAt.toISOString()} />
 */
export default function LocalDateTime({ iso }: { iso: string }) {
  const date = new Date(iso);

  const formatted = new Intl.DateTimeFormat(undefined, {
    year:   "numeric",
    month:  "short",
    day:    "numeric",
    hour:   "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Tokyo",
  }).format(date);

  return <time dateTime={iso} title={iso}>{formatted}</time>;
}
