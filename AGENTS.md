<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# Dream Adventure — AI Agent User Manual

> **Mandatory reading for all AI agents (Claude, Gemini, GPT, Copilot, etc.) before touching a single file.**
> These rules are distilled from real production bugs. Violating them breaks the live site.

---

## 0. BEFORE YOU WRITE ANYTHING

Run this checklist in order:

1. **Read the target file in full** before editing it. Never guess at existing logic.
2. **Read `docs/PRD.md`** — business rules, state machines, booking logic.
3. **Read `docs/tech-stack.md`** — architecture patterns, critical Prisma gotchas.
4. **Read `docs/design.md`** — UI design tokens and component classes.
5. **Read `prisma/schema.prisma`** if you will touch any Prisma query.
6. **Run `npx tsc --noEmit`** after every code change. Zero errors = done.

---

## 1. PROJECT IDENTITY — Never Break These

### 1.1 The Brand
- **Name:** Dream Adventure Gunma (ドリームアドベンチャー群馬)
- **Domain:** `thedreamadventure.com`
- **Primary locale:** Japanese (`ja`) at root `/`. English at `/en`.
- **Brand colors:** Teal (`teal-600` = `#0d9488`) on deep Black/Dark background.
- **Tone:** Honest, premium, safety-first. No marketing fluff. No exaggeration.

### 1.2 The Construction Blockade (DO NOT REMOVE)

The public site is protected by a **fail-safe blockade**. In `src/app/[locale]/layout.tsx`:

```tsx
{process.env.NEXT_PUBLIC_GRAND_OPENING_SOON === "false" ? (
  /* LIVE SITE */
  <NextIntlClientProvider ...>...</NextIntlClientProvider>
) : (
  /* DEFAULT — BLOCKADE shown to all visitors */
  <ConstructionBlockade />
)}
```

**Rules:**
- The condition is `=== "false"` (string, not boolean). The variable defaults to blocking.
- `ConstructionBlockade` is a `"use client"` component in `src/components/ConstructionBlockade.tsx`.
- **Never remove this guard.** Never swap the condition. The site can only go live by setting the env var in Vercel.
- The admin panel (`/admin/*`) is **not** affected by this blockade.

---

## 2. STYLING RULES — The Teal/Black Design System

### 2.1 Tailwind CSS Only

```tsx
// ❌ FORBIDDEN — inline styles for colors or spacing
<div style={{ backgroundColor: "#0d9488", padding: "16px" }}>

// ❌ FORBIDDEN — CSS modules
import styles from "./MyComponent.module.css";

// ✅ CORRECT — Tailwind utility classes
<div className="bg-teal-600 p-4">

// ✅ CORRECT — design system semantic class
<div className="card p-6">
<button className="btn btn-primary">
```

**Exception:** `style={{}}` is allowed ONLY for dynamic values that cannot be expressed as Tailwind (e.g., `style={{ width: `${pct}%` }}`).

### 2.2 Design System Classes (defined in `globals.css`)

| Class | Purpose |
|---|---|
| `.card` | All content panels — white bg, teal-tinted border, hover lift |
| `.btn .btn-primary` | Primary CTA button (teal gradient) |
| `.btn .btn-outline` | Outline button (teal border, teal text) |
| `.btn .btn-ghost` | Ghost button (no border, stone text) |
| `.badge .badge-teal` | CONFIRMED status badge |
| `.badge .badge-amber` | PENDING status badge |
| `.badge .badge-red` | CANCELLED status badge |
| `.input` | Form text input |
| `.label` | Form label |
| `.admin-table` | Admin data table |
| `.container-site` | Max-width 1280px page wrapper |
| `.section` | Section padding (5rem top/bottom) |
| `.hero-gradient` | Homepage hero: teal-950 → teal-900 → teal-700 at 160° |

### 2.3 Color Palette — The Allowed Tones

- **Brand primary:** `teal-600` (#0d9488) — links, CTAs, active nav
- **Dark backgrounds:** `stone-900`, `stone-800` — body text
- **Neutral:** Stone palette (`stone-50` through `stone-900`) — never cool grays
- **Warning:** Amber palette — pending payments, capacity alerts
- **Error:** Red palette — cancellations, errors, full slots
- **NEVER:** Generic blue, green, or raw hex in Tailwind classes

### 2.4 Icons — lucide-react Only

```tsx
// ✅ CORRECT
import { Download, Loader2, CheckCircle2 } from "lucide-react";

// ❌ WRONG — do not install other icon libraries
import { FaDownload } from "react-icons/fa";
```

---

## 3. ARCHITECTURE RULES

### 3.1 Server vs. Client Components

```
Is the component purely display (no useState, no event handlers)?
  YES → Server Component (no directive — this is the default)
  NO  → Client Component ("use client" at top of file)

Does the function mutate data / call Prisma?
  YES → Server Action ("use server" in a dedicated actions/ file)
       OR API Route Handler (src/app/api/...)
```

### 3.2 Server Component Hard Constraints

```tsx
// ❌ FATAL — crashes Vercel build (RSC serialization error)
export default async function Page() {
  return <Link onMouseEnter={(e) => { ... }}>Bookings</Link>;
}

// ✅ CORRECT — pure Tailwind hover class
export default async function Page() {
  return <Link href="/admin" className="hover:bg-teal-50">Bookings</Link>;
}
```

- **No `onClick`, `onChange`, `useState`, `useEffect`** in Server Components.
- **Server Action files (`"use server"`) must ONLY export `async` functions.** No constants, no types, no sync functions. Move shared constants to `src/lib/constants/`.

### 3.3 Prisma — Critical Query Patterns

**Always use explicit `select` when needing FK fields from nested relations:**

```ts
// ❌ WRONG — raftAllocationId is silently omitted by Prisma
participants: {
  include: { booking: { select: { reference: true } } }
}

// ✅ CORRECT — explicit select includes the FK scalar
participants: {
  select: {
    id: true,
    raftAllocationId: true,  // ← MUST be explicit
    firstName: true,
    participantType: true,
    booking: { select: { reference: true } },
  }
}
```

**`paymentStatus` is a String field, NOT an enum:**

```ts
// ❌ WRONG — { in: } does not work for String fields
where: { paymentStatus: { in: ["PAID", "PENDING"] } }

// ✅ CORRECT — use OR array for String fields
where: {
  OR: [
    { paymentStatus: "PAID - Stripe" },
    { paymentStatus: "PAID - Cash" },
  ]
}

// ✅ CORRECT — { in: } IS valid for BookingStatus (which IS an enum)
where: { status: { in: ["CONFIRMED", "PENDING"] } }
```

### 3.4 Timezone — Always JST

```ts
// ❌ WRONG — UTC, not Japan time
const today = new Date();

// ✅ CORRECT — JST (UTC+9)
const jstOffsetMs = 9 * 60 * 60 * 1_000;
const nowJst = new Date(Date.now() + jstOffsetMs);
const year = nowJst.getUTCFullYear();
const month = nowJst.getUTCMonth();
const day = nowJst.getUTCDate();
```

---

## 4. BUSINESS LOGIC RULES

### 4.1 Booking Cutoff
- Public bookings are **hard-blocked** server-side if departure is < 48 hours away.
- Admin bookings (`source=MANUAL`) bypass this cutoff.
- Constant: `BOOKING_CUTOFF_HOURS = 48` in `src/lib/services/booking.ts`.

### 4.2 Pricing (Hardcoded — No DB Lookup)
All prices are in JPY, tax-inclusive. Never read from database.

| Activity | Adult | Child |
|---|---|---|
| Rafting | ¥6,000 | ¥4,000 |
| Canyoning | ¥6,000 | ¥4,000 |
| Combo (both) | ¥10,000 | ¥6,000 |

Source: `src/lib/utils.ts` → `PRICING` constant.

### 4.3 Never Hard-Delete Operational Data
- **Guides:** Set `isActive = false`. Never `prisma.guide.delete()`.
- **Bookings:** Set `status = CANCELLED`. Never delete a booking.
- **Promo codes:** Set `isActive = false`. Never delete.

### 4.4 Always Audit Admin Mutations

```ts
// Every admin action MUST write an audit log
await logAudit({
  bookingId: booking.id,
  action: "BOOKING_STATUS_CHANGED",
  actorEmail: session.user?.email ?? "admin",
  description: `Status changed from PENDING to CONFIRMED.`,
  before: JSON.stringify({ status: "PENDING" }),
  after: JSON.stringify({ status: "CONFIRMED" }),
});
```

### 4.5 Always Revalidate Both Admin Paths After Mutations

```ts
revalidatePath("/admin/manifest");
revalidatePath("/admin");
// Both needed — missing either leaves stale data on screen
```

### 4.6 Server Action Error Pattern

```ts
// ✅ CORRECT — always return typed result, never throw
export async function doSomething(): Promise<{ success: true } | { error: string }> {
  const session = await auth();
  if (!session) return { error: "UNAUTHORIZED" };
  try {
    await prisma.booking.update(...);
    revalidatePath("/admin");
    return { success: true };
  } catch (err) {
    console.error("[doSomething]", err);
    return { error: err instanceof Error ? err.message : "SERVER_ERROR" };
  }
}
```

---

## 5. i18n RULES

### 5.1 Locale Routing
- **Japanese** = default locale, served at root `/` (no prefix).
- **English** = secondary locale, served at `/en/*`.
- `localePrefix: "as-needed"` — this means `/ja` is invalid (legacy). Redirects to `/`.
- `localeDetection: false` — the site does NOT auto-detect browser language.

### 5.2 Admin Panel is English Only
- The `/admin` route is **outside** the `[locale]` segment.
- No translation files are used in the admin panel.
- All admin UI strings are hardcoded in English.

### 5.3 Translation Files
- `messages/ja.json` — Japanese (primary)
- `messages/en.json` — English (secondary)
- New UI strings must be added to **both** files.
- Use `useTranslations()` hook in Client Components, `getTranslations()` in Server Components.

---

## 6. SEO RULES

### 6.1 Japanese SEO is Primary

Top-5 primary keyword targets (updated for Gunma/Numata pivot):

| Priority | Keyword | Intent | Target Page |
|---|---|---|---|
| 1 | 群馬 ラフティング | Commercial | `/`, `/rafting` |
| 2 | 群馬 アクティビティ | Commercial | `/` |
| 3 | 群馬 キャニオニング | Commercial | `/canyoning` |
| 4 | 群馬 川遊び | Informational/Commercial | `/`, `/rafting`, FAQ |
| 5 | 群馬 家族旅行 | Informational/Commercial | `/`, `/about` |

みなかみ/水上 keywords (水上 ラフティング 時期, 大穴 ラフティング) remain valid secondary long-tail targets — see `docs/SEO_STRATEGY.md` §2.2.
- The homepage H1 (Japanese) is: "群馬 ラフティング おすすめ | 利根川のアクティビティ体験" (from `messages/ja.json` → `hero.headline`)
- Never change H1 text without checking `docs/SEO_STRATEGY.md`.

### 6.2 Metadata Pattern
Locale-aware metadata is generated in `src/app/[locale]/layout.tsx` via `generateMetadata()`. Both `ja` and `en` have separate title templates, descriptions, and OG tags. Do not hardcode locale-specific text in page files — use the shared `generateMetadata` pattern.

### 6.3 Honesty First
The "Honesty First" brand protocol means: **no superlatives without proof, no fake testimonials, no manufactured urgency.** Copy must be honest. "World-class" and "premium" are acceptable as brand descriptors. "Best in Japan" with no citation is not.

---

## 7. OUTPUT QUALITY RULES

### 7.1 Zero Placeholders

```ts
// ❌ FORBIDDEN — stubs that compile but break production
// TODO: implement this
const result = null; // placeholder

// ✅ REQUIRED — complete working implementation
const result = await prisma.booking.findUnique({
  where: { id: bookingId },
  include: { participants: true },
});
```

### 7.2 Never Truncate Output

When writing complete files, write **all** of the file. Never use `// ...rest of file...` or `// existing code unchanged`. Truncation corrupts implementations.

### 7.3 Responsive UI Required

Every new UI component must work at mobile (375px), tablet (768px), and desktop (1280px). Use responsive Tailwind prefixes:

```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
<p className="text-sm sm:text-base">
<div className="p-4 sm:p-6 lg:p-8">
```

### 7.4 TypeScript Strictness

```ts
// ❌ FORBIDDEN
const booking: any = await prisma.booking.findUnique(...);

// ✅ CORRECT — let Prisma infer the type
const booking = await prisma.booking.findUnique({
  where: { id },
  include: { participants: true },
});
```

---

## 8. FILE ALIAS MAP

| Import Alias | Resolves to |
|---|---|
| `@/lib/*` | `src/lib/*` |
| `@/components/*` | `src/components/*` |
| `@/app/*` | `src/app/*` |
| `@/i18n/*` | `src/i18n/*` |

---

## 9. WHAT NOT TO CHANGE (SACRED ZONES)

| File | Why It's Sacred |
|---|---|
| `src/app/[locale]/layout.tsx` | Contains the blockade toggle and all metadata generation |
| `src/components/ConstructionBlockade.tsx` | The holding page — don't alter design without owner sign-off |
| `src/middleware.ts` | i18n routing — any change can break locale prefix behavior |
| `src/i18n/routing.ts` | Must mirror `middleware.ts` exactly |
| `prisma/schema.prisma` | Any change requires `prisma db push` on production |
| `src/lib/utils.ts` | Hardcoded pricing — only change with owner confirmation |

---

*This AGENTS.md is the authoritative guide for all AI sessions on this repository.*
*Last audited: July 2026*
