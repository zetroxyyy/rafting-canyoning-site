# Dream Adventure — AI Agent Instructions (`claude.md`)

> These rules are **mandatory** for all AI agents (Claude, Gemini, GPT, etc.) working on this repository. No exceptions. Read all rules before writing a single line of code.

---

## RULE 0 — Read Before You Write

Before modifying **any** file, you must:

1. **Read the file in full** using your file-reading tools.
2. **Read `docs/PRD.md`** for business logic context.
3. **Read `docs/tech-stack.md`** for architecture patterns.
4. **Read `docs/design.md`** for UI/styling standards.
5. **Read `prisma/schema.prisma`** if touching any Prisma query.

Skipping this step is the primary cause of regressions. The codebase is non-trivial and has many subtle invariants.

---

## RULE 1 — Never Use Placeholder Code

**Zero tolerance for placeholders.**

```ts
// ❌ FORBIDDEN — never write this
// ... existing code ...
// TODO: implement this
// Add your logic here
const result = null; // placeholder

// ✅ REQUIRED — write the complete, working implementation
const result = await prisma.booking.findUnique({
  where: { id: bookingId },
  include: { participants: true },
});
```

If you do not know how to implement something, say so explicitly rather than inserting a stub. A stub that compiles is worse than an error — it silently breaks production.

---

## RULE 2 — Tailwind CSS is the Only Styling Method

**Never write custom CSS** unless adding to `globals.css` as a reusable utility class.

```tsx
// ❌ FORBIDDEN
<div style={{ backgroundColor: "#0d9488", padding: "16px" }}>

// ❌ FORBIDDEN — new CSS file
import styles from "./MyComponent.module.css";

// ✅ CORRECT — Tailwind utility classes
<div className="bg-teal-600 p-4">

// ✅ CORRECT — existing design system class
<div className="card p-6">
<button className="btn btn-primary">
```

**Exception:** `style={{}}` is allowed **only** for:
- Dynamic values that cannot be expressed as Tailwind classes (e.g., `style={{ width: \`${pct}%\` }}`)
- Brand-specific inline colours that are part of the ManifestBuilder palette object

---

## RULE 3 — Strictly Type All Prisma Queries

**Never use `any` for Prisma results.** Use the generated types or explicit interface definitions.

```ts
// ❌ FORBIDDEN
const booking: any = await prisma.booking.findUnique(...);

// ✅ CORRECT — Prisma infers the type
const booking = await prisma.booking.findUnique({
  where: { id },
  include: { participants: true },
});

// ✅ CORRECT — explicit interface if serializing for client
interface BookingRow {
  id:        string;
  reference: string;
  status:    BookingStatus;
}
```

---

## RULE 4 — Server Component Constraints

**Server Components cannot use JavaScript event handlers.**

```tsx
// ❌ FATAL — crashes Vercel build with RSC serialization error
export default async function Page() {
  return (
    <Link
      href="/admin/bookings"
      onMouseEnter={(e) => { e.currentTarget.style.background = "teal"; }}
    >
      Bookings
    </Link>
  );
}

// ✅ CORRECT — pure Tailwind hover class
export default async function Page() {
  return (
    <Link href="/admin/bookings" className="hover:bg-teal-50">
      Bookings
    </Link>
  );
}
```

If you need `onClick`, `useState`, `useEffect`, or any event handler, the file **must** have `"use client"` at the top.

---

## RULE 5 — Server Action File Constraints

Files with `"use server"` **must only export `async` functions**. No constants, no types, no regular functions.

```ts
// ❌ FATAL — breaks Turbopack/Next.js build
"use server";
export const MAX_HUMANS = 7;        // forbidden
export type RaftName = "Raft A";    // forbidden
export function helper() {}         // forbidden — not async

// ✅ CORRECT — constants go in a separate lib file
// src/lib/constants/manifest.ts  ← no "use server" directive
export const MAX_HUMANS_PER_RAFT = 7;
export function isCanyoning(type: string) { ... }

// src/app/actions/admin/manifest.ts
"use server";
import { MAX_HUMANS_PER_RAFT } from "@/lib/constants/manifest";
export async function assignToRaft(...) { ... }
```

---

## RULE 6 — PaymentStatus is a String Field

`Booking.paymentStatus` and `BookingPayment.status` are **String** fields, **not** enum fields. The `PaymentStatus` enum in `schema.prisma` is documentation-only and is never used as a field type.

```ts
// ❌ WRONG — treats paymentStatus as an enum
where: { paymentStatus: { in: ["CONFIRMED", "PAID"] } }

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

---

## RULE 7 — Always Include `raftAllocationId` with Explicit `select`

When querying `BookingParticipant` records through a nested `include` on a parent model, Prisma **silently omits the `raftAllocationId` FK scalar**. Always use an explicit `select` block.

```ts
// ❌ WRONG — raftAllocationId is null for all records, breaking manifest
bookings: {
  include: {
    participants: {
      include: { booking: { select: { reference: true } } }
    }
  }
}

// ✅ CORRECT
bookings: {
  include: {
    participants: {
      select: {
        id:               true,
        raftAllocationId: true,   // ← must be explicit
        hasDog:           true,
        firstName:        true,
        lastName:         true,
        participantType:  true,
        age:              true,
        medicalNotes:     true,
        sortOrder:        true,
        booking: { select: { reference: true } },
      }
    }
  }
}
```

---

## RULE 8 — JST Timezone for All Operational Date Logic

**Never use raw `new Date()` UTC** for dashboard KPIs, CSV exports, or any "today" calculation. Japan operates in JST (UTC+9).

```ts
// ❌ WRONG — calculates "today" in server's UTC timezone
const today = new Date();
const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());

// ✅ CORRECT
const jstOffsetMs = 9 * 60 * 60 * 1_000;
const nowJst      = new Date(Date.now() + jstOffsetMs);
const year        = nowJst.getUTCFullYear();
const month       = nowJst.getUTCMonth();
const day         = nowJst.getUTCDate();

// UTC bounds for a JST calendar day (subtract 9h offset for UTC storage):
const startUTC = new Date(Date.UTC(year, month, day, 0, 0, 0, 0) - jstOffsetMs);
const endUTC   = new Date(Date.UTC(year, month, day + 1, 0, 0, 0, 0) - jstOffsetMs);
```

---

## RULE 9 — All UI Changes Must Be Responsive

Every new UI component must work at mobile (375px), tablet (768px), and desktop (1280px).

```tsx
// ✅ Use responsive Tailwind prefixes
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
<p className="text-sm sm:text-base">
<div className="p-4 sm:p-6 lg:p-8">
```

Always test at 375px viewport before marking a UI task complete.

---

## RULE 10 — Manifest Engine Activity-Type Polymorphism

**Canyoning and Rafting behave differently.** Always use `isCanyoning(activityType)` from `src/lib/constants/manifest.ts` — never hard-code activity type strings.

```ts
// ❌ WRONG — hard-coded string comparison
if (activityType === "CANYONING") { skipDogCheck(); }

// ✅ CORRECT — uses the shared utility
import { isCanyoning } from "@/lib/constants/manifest";
if (isCanyoning(activityType)) { skipDogCheck(); }
```

Canyoning-specific rules:
- **No dog counter** in the UI raft card header
- **No dog capacity check** in `assignToRaft` server action
- **"Group N" labels** instead of "Raft A/B/C/D"
- **"Send to group:" label** in the staging pool selector

---

## RULE 11 — Never Hard-Delete Data

The system uses **soft-delete patterns** for operational data integrity:

- **Guides:** Use `isActive = false` (`toggleGuide` action). Never `prisma.guide.delete()`.
- **Bookings:** Use `status = CANCELLED`. Never delete a booking.
- **Promo codes:** Use `isActive = false`. Never delete.
- **Raft Allocations:** Use `clearRaftManifest` (sets `raftAllocationId = null` on participants). Never delete allocation rows.

---

## RULE 12 — Always Wrap Server Action Mutations in `try/catch`

Every exported async server action must catch errors and return a typed result object — never `throw`.

```ts
// ❌ WRONG — uncaught throw crashes the Client Component
export async function doSomething() {
  await prisma.booking.update(...);  // throws on error
}

// ✅ CORRECT — always return { success } | { error }
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

## RULE 13 — Revalidate Both Admin Routes After Mutations

When a server action mutates booking or manifest data, revalidate **both** admin routes so all panels update:

```ts
// ✅ Always revalidate both
revalidatePath("/admin/manifest");
revalidatePath("/admin");

// ❌ INCOMPLETE — slot selector progress badges stay stale
revalidatePath("/admin");
```

---

## RULE 14 — Use the Established Icon Library

**Only use `lucide-react`** for icons. Do not install additional icon libraries.

```tsx
// ✅ CORRECT
import { Download, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";

// ❌ WRONG
import { FaDownload } from "react-icons/fa";
```

Common icons used in the design system:

| Purpose | Icon |
|---|---|
| Loading spinner | `<Loader2 className="animate-spin" />` |
| Success / all assigned | `<CheckCircle2 />` |
| Warning / toast error | `<AlertTriangle />` |
| Download | `<Download />` |
| Navigation arrow | `<ArrowUpRight />` |
| Assign to raft | `<ChevronRight />` |
| Return to pool | `<ChevronLeft />` |
| Clear/delete | `<Trash2 />` |
| Print | `<Printer />` |
| Guide/shield | `<Shield />` |
| Participants | `<Users />` |
| Dog | `<Dog />` |

---

## RULE 15 — CSV Exports Must Be RFC-4180 Compliant

Any CSV export must:
1. Prepend a UTF-8 BOM (`\uFEFF`) for Excel compatibility
2. Escape values containing commas, quotes, or newlines: wrap in `"..."` and double internal quotes
3. Use `\r\n` line endings (not `\n`)

Reference implementation: `src/app/api/admin/export/manifest/route.ts` — the `esc()` and `row()` helper functions.

---

## RULE 16 — Audit Everything

Every admin mutation must write an `AuditLog` entry via `logAudit()` from `src/lib/services/audit.ts`. This is non-negotiable for operational accountability.

```ts
await logAudit({
  bookingId:   booking.id,   // optional — omit for non-booking actions
  action:      "BOOKING_STATUS_CHANGED",
  actorEmail:  session.user?.email ?? "admin",
  description: `Status changed from PENDING to CONFIRMED.`,
  before:      JSON.stringify({ status: "PENDING" }),
  after:       JSON.stringify({ status: "CONFIRMED" }),
});
```

Use the correct `AuditAction` enum value. Do not invent new string action names.

---

## RULE 17 — Design Tokens, Not Raw Hex

In Tailwind classes, always use the **design system utility class** — never raw hex colours.

```tsx
// ❌ WRONG
<div className="[background:#0d9488]">

// ✅ CORRECT
<div className="bg-teal-600">
```

The only valid exceptions are:
1. The ManifestBuilder raft palette (4 colours are defined in a JS object and applied via `style={}`)
2. `globals.css` itself, where tokens are defined with their hex values

---

## RULE 18 — Check Next.js Docs Before Using New APIs

This project uses **Next.js 16 App Router** — a version with breaking changes from all training data. Before using any Next.js API (routing, metadata, cookies, headers, cache, etc.):

```bash
# Check the local docs first
cat node_modules/next/dist/docs/[relevant-file]
```

Do not assume Next.js 13/14/15 patterns work here. Key differences that have caused bugs:
- `"use server"` files cannot export anything other than async functions
- Server Components cannot receive event handler props
- `revalidatePath` must be called from Server Actions or Route Handlers (not Client Components)

---

## RULE 19 — Never Truncate Output

When asked to write complete files, write **all** of the file. Do not use `// ...rest of file...` or `// existing code unchanged`. Truncation corrupts implementations and breaks builds.

---

## RULE 20 — Confirm TSC Before Declaring Done

After any code change, run:

```bash
npx tsc --noEmit
```

Zero TypeScript errors is the definition of "done". Do not leave the user to discover type errors.
