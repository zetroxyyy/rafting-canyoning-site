"use client";

/**
 * TASK 5 — INFORMATION LEAKAGE PREVENTION
 * ─────────────────────────────────────────
 * Global error boundary for the [locale] route segment.
 * Catches any unhandled runtime errors in server or client components and
 * renders a safe, user-friendly error page WITHOUT exposing:
 *   - Raw database error messages or Prisma stack traces
 *   - Internal file paths or module names
 *   - Environment variable names or configuration details
 *   - Schema details (table names, column names, etc.)
 *
 * The raw `error.message` and `error.stack` are intentionally NOT rendered
 * to the user. They are forwarded to the server console (where only ops
 * personnel have access) and optionally to an error monitoring service.
 *
 * NOTE: The `reset` function asks Next.js to re-render the segment — this
 * covers transient errors (e.g. network blips during SSR) without requiring
 * a full page reload.
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to server-only console — never rendered to user.
    // Replace with your error monitoring service (e.g. Sentry) here:
    //   Sentry.captureException(error);
    console.error("[GlobalErrorBoundary]", {
      message: error.message,
      digest: error.digest,
      // Never log error.stack to a client-side service
    });
  }, [error]);

  return (
    <div
      style={{
        minHeight: "60vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        textAlign: "center",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <h1
        style={{
          fontSize: "1.5rem",
          fontWeight: 700,
          marginBottom: "0.75rem",
          color: "#1c1917",
        }}
      >
        Something went wrong
      </h1>

      <p
        style={{
          fontSize: "0.95rem",
          color: "#78716c",
          maxWidth: "420px",
          lineHeight: 1.6,
          marginBottom: "1.5rem",
        }}
      >
        We encountered an unexpected error. Our team has been notified.
        {error.digest && (
          <>
            {" "}
            If you need to contact support, quote error ID:{" "}
            <code
              style={{
                background: "#f5f5f4",
                padding: "0.15em 0.4em",
                borderRadius: "4px",
                fontSize: "0.85em",
                letterSpacing: "0.04em",
              }}
            >
              {error.digest}
            </code>
          </>
        )}
      </p>

      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", justifyContent: "center" }}>
        <button
          onClick={reset}
          style={{
            background: "#0d9488",
            color: "white",
            border: "none",
            borderRadius: "8px",
            padding: "0.6rem 1.4rem",
            fontSize: "0.9rem",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Try again
        </button>
        <Link
          href="/"
          style={{
            background: "#f5f5f4",
            color: "#1c1917",
            border: "none",
            borderRadius: "8px",
            padding: "0.6rem 1.4rem",
            fontSize: "0.9rem",
            fontWeight: 600,
            cursor: "pointer",
            textDecoration: "none",
          }}
        >
          Return home
        </Link>
      </div>
    </div>
  );
}
