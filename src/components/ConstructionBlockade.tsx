"use client";

import React from "react";
import Image from "next/image";

/**
 * ConstructionBlockade
 *
 * A hardcoded, full-screen "Under Construction" overlay.
 * Rendered unconditionally from the root layout — no admin toggle,
 * no feature flag, no way for a visitor to bypass it.
 *
 * Design: deep-teal → black radial gradient, glassmorphism card,
 * animated wave bar, bilingual (EN / JA) copy.
 */
export default function ConstructionBlockade() {
  return (
    <div
      aria-modal="true"
      role="alertdialog"
      aria-label="Site under construction"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background:
          "radial-gradient(ellipse at 60% 30%, #0d4f4f 0%, #062a2a 45%, #000000 100%)",
        fontFamily:
          "'Poppins', 'Noto Sans JP', system-ui, -apple-system, sans-serif",
        overflow: "hidden",
      }}
    >
      {/* ── Subtle ambient orbs ──────────────────────────────────── */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          width: 600,
          height: 600,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(20,184,166,0.12) 0%, transparent 70%)",
          top: "-15%",
          left: "-10%",
          pointerEvents: "none",
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          width: 500,
          height: 500,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(6,182,212,0.10) 0%, transparent 70%)",
          bottom: "-10%",
          right: "-8%",
          pointerEvents: "none",
        }}
      />

      {/* ── Glassmorphism card ───────────────────────────────────── */}
      <div
        style={{
          position: "relative",
          maxWidth: 520,
          width: "90%",
          padding: "52px 44px",
          borderRadius: 24,
          background: "rgba(255, 255, 255, 0.04)",
          backdropFilter: "blur(18px)",
          WebkitBackdropFilter: "blur(18px)",
          border: "1px solid rgba(255, 255, 255, 0.09)",
          boxShadow:
            "0 32px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(20,184,166,0.08) inset",
          textAlign: "center",
        }}
      >
        {/* Logo */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 28,
          }}
        >
          <Image
            src="/logo.png"
            alt="Dream Adventure Gunma logo"
            width={120}
            height={120}
            priority
            style={{ objectFit: "contain" }}
          />
        </div>

        {/* Brand name */}
        <p
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: "rgba(94,234,212,0.85)",
            marginBottom: 10,
          }}
        >
          Dream Adventure Gunma
        </p>

        {/* Main headline */}
        <h1
          style={{
            fontSize: "clamp(1.5rem, 5vw, 2.15rem)",
            fontWeight: 700,
            color: "#ffffff",
            lineHeight: 1.2,
            marginBottom: 8,
            letterSpacing: "-0.01em",
          }}
        >
          Site Under Construction
        </h1>

        {/* Japanese sub-headline */}
        <p
          lang="ja"
          style={{
            fontSize: "clamp(0.9rem, 2.5vw, 1.05rem)",
            fontWeight: 400,
            color: "rgba(255,255,255,0.55)",
            marginBottom: 36,
            letterSpacing: "0.04em",
          }}
        >
          現在、サイトの公開準備中です
        </p>

        {/* Animated wave divider */}
        <div
          aria-hidden="true"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            marginBottom: 36,
          }}
        >
          {[0, 1, 2, 3, 4].map((i) => (
            <span
              key={i}
              style={{
                display: "inline-block",
                width: 4,
                height: 4,
                borderRadius: "50%",
                background:
                  i === 2
                    ? "#2dd4bf"
                    : i === 1 || i === 3
                    ? "rgba(45,212,191,0.6)"
                    : "rgba(45,212,191,0.3)",
                animation: `constructionPulse 1.4s ease-in-out ${i * 0.15}s infinite`,
              }}
            />
          ))}
        </div>

        {/* Body copy */}
        <p
          style={{
            fontSize: "0.9rem",
            color: "rgba(255,255,255,0.45)",
            lineHeight: 1.75,
            marginBottom: 4,
          }}
        >
          We&apos;re putting the finishing touches on something exciting.
        </p>
        <p
          lang="ja"
          style={{
            fontSize: "0.875rem",
            color: "rgba(255,255,255,0.35)",
            lineHeight: 1.75,
          }}
        >
          もうすぐオープン予定です。お楽しみに！
        </p>

        {/* Contact hint */}
        <div
          style={{
            marginTop: 36,
            paddingTop: 24,
            borderTop: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <p
            style={{
              fontSize: "0.78rem",
              color: "rgba(255,255,255,0.28)",
              letterSpacing: "0.04em",
            }}
          >
            © {new Date().getFullYear()} Dream Adventure Gunma
          </p>
        </div>
      </div>

      {/* ── Keyframe injection ──────────────────────────────────── */}
      <style>{`
        @keyframes constructionPulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.5); opacity: 0.6; }
        }
      `}</style>
    </div>
  );
}
