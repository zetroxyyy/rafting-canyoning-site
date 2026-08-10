"use client";

/**
 * BrandLogo
 *
 * Reusable logo component used in:
 *   - public Header
 *   - public Footer
 *   - admin Sidebar
 *
 * Renders /img/logo.png via next/image.
 * Falls back to the "DA" teal block if the image is missing or errors.
 *
 * Props:
 *   size       – Tailwind height token: "sm" (h-8), "md" (h-10), "lg" (h-12)
 *                Defaults to "md". Controls image height; width is always auto.
 *   height     – Legacy pixel prop kept for backwards compat. Ignored when `size`
 *                is supplied. If only `height` is passed, it is mapped to the
 *                nearest size bucket so existing call-sites keep working.
 *   className  – extra wrapper classes
 *   showName   – show "Dream Adventure" wordmark (default true)
 *   nameClass  – extra classes on the wordmark span
 *   alt        – img alt text
 */

import { useState } from "react";
import Image from "next/image";

// ── Size presets ────────────────────────────────────────────────────────────────
// Each preset pairs a Tailwind class (applied to the Image wrapper) with the
// pixel dimensions needed by next/image (which still requires width+height attrs
// for the static optimiser — we override the rendered size with CSS).

type LogoSize = "sm" | "md" | "lg" | "xl";

const SIZE_MAP: Record<LogoSize, { cls: string; px: number }> = {
  sm: { cls: "h-8  w-auto", px: 32 },  // 32 px — admin sidebar, footer
  md: { cls: "h-10 w-auto", px: 40 },  // 40 px — default / public header mobile
  lg: { cls: "h-12 w-auto", px: 48 },  // 48 px — public header desktop
  xl: { cls: "h-14 w-auto", px: 56 },  // 56 px — hero / large display
};

/** Map a legacy pixel height to the closest size bucket */
function heightToSize(px: number): LogoSize {
  if (px <= 30) return "sm";
  if (px <= 42) return "md";
  if (px <= 52) return "lg";
  return "xl";
}

interface BrandLogoProps {
  size?: LogoSize;
  /** @deprecated Use `size` instead. Kept for backwards compat. */
  height?: number;
  className?: string;
  showName?: boolean;
  nameClass?: string;
  alt?: string;
}

export default function BrandLogo({
  size,
  height,
  className = "",
  showName = true,
  nameClass = "",
  alt = "Dream Adventure",
}: BrandLogoProps) {
  const [imgError, setImgError] = useState(false);

  // Resolve which size preset to use
  const resolvedSize: LogoSize =
    size ?? (height !== undefined ? heightToSize(height) : "md");
  const { cls, px } = SIZE_MAP[resolvedSize];

  return (
    <div className={`flex items-center gap-2.5 flex-shrink-0 ${className}`}>
      {!imgError ? (
        <Image
          src="/logo.png"
          alt={alt}
          // Generous intrinsic dimensions so next/image never upscales.
          // The actual rendered size is controlled by the Tailwind h-* class below.
          width={px * 5}
          height={px}
          // object-contain keeps the logo inside its box without cropping.
          // flex-shrink-0 prevents the image from being squeezed by siblings.
          className={`${cls} object-contain flex-shrink-0`}
          style={{ width: "auto" }}       // override next/image default width so AR is preserved
          onError={() => setImgError(true)}
          priority
          unoptimized
        />
      ) : (
        /* Fallback: teal DA block, exactly the same visible height as the image */
        <div
          className={`${cls} aspect-square rounded-lg flex items-center justify-center
                      text-white font-bold flex-shrink-0 bg-teal-600`}
          aria-hidden="true"
        >
          DA
        </div>
      )}

      {showName && (
        <span className={`font-bold tracking-tight text-stone-900 leading-tight ${nameClass}`}>
          Dream Adventure
        </span>
      )}
    </div>
  );
}
