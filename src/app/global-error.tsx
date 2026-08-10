"use client";

/**
 * TASK 5 — ROOT-LEVEL GLOBAL ERROR BOUNDARY
 * ───────────────────────────────────────────
 * global-error.tsx replaces the root layout on catastrophic errors that
 * escape all nested error.tsx boundaries (e.g. errors in the root layout
 * itself). It must include <html> and <body> because the root layout is
 * unavailable at this point.
 *
 * Security policy: same as locale/error.tsx — never render raw error
 * messages, stack traces, or any internal system details to the browser.
 */

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Server-side logging only — replace with Sentry or similar in production
    console.error("[GlobalError]", {
      message: error.message,
      digest: error.digest,
    });
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
          textAlign: "center",
          fontFamily: "system-ui, -apple-system, sans-serif",
          background: "#fafaf9",
          color: "#1c1917",
        }}
      >
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.75rem" }}>
          Something went wrong
        </h1>
        <p style={{ fontSize: "0.95rem", color: "#78716c", maxWidth: "400px", lineHeight: 1.6, marginBottom: "1.5rem" }}>
          An unexpected error occurred. Please try again.
          {error.digest && (
            <>
              {" "}Error ID:{" "}
              <code style={{ background: "#f5f5f4", padding: "0.15em 0.4em", borderRadius: "4px", fontSize: "0.85em" }}>
                {error.digest}
              </code>
            </>
          )}
        </p>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button
            onClick={reset}
            style={{ background: "#0d9488", color: "white", border: "none", borderRadius: "8px", padding: "0.6rem 1.4rem", fontSize: "0.9rem", fontWeight: 600, cursor: "pointer" }}
          >
            Try again
          </button>
          <Link
            href="/"
            style={{ background: "#f5f5f4", color: "#1c1917", borderRadius: "8px", padding: "0.6rem 1.4rem", fontSize: "0.9rem", fontWeight: 600, textDecoration: "none" }}
          >
            Return home
          </Link>
        </div>
      </body>
    </html>
  );
}
