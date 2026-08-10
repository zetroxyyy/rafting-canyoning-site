# Dream Adventure — Design System

> **Source of truth:** `src/app/globals.css` and `@theme` block
> **CSS engine:** Tailwind CSS v4 (`@import "tailwindcss"` + `@theme {}` for custom tokens)
> **Icon library:** lucide-react v1.8.0
> **Fonts:** Inter (Latin), Noto Sans JP (Japanese)

---

## 1. Color Palette

### 1.1 Teal — Brand Primary

The entire brand identity is built around **Teal**. It is used for primary actions, active states, borders, and success indicators.

| Token | Hex | Tailwind Class | Usage |
|---|---|---|---|
| `teal-50` | `#f0fdfa` | `bg-teal-50` | Surface tint, card hover bg, form input focus surface |
| `teal-100` | `#ccfbf1` | `bg-teal-100` | Badge background (CONFIRMED status) |
| `teal-200` | `#99f6e4` | `border-teal-200` | Light borders, spinner track |
| `teal-300` | `#5eead4` | `text-teal-300` | Decorative, subtle |
| `teal-400` | `#2dd4bf` | `text-teal-400` | Scrollbar thumb hover |
| `teal-500` | `#14b8a6` | `text-teal-500` | Focus ring colour, step-done indicator |
| `teal-600` | `#0d9488` | `text-teal-600` | **Brand primary** — links, active nav, icon colour |
| `teal-700` | `#0f766e` | `text-teal-700` | Button text (outline), hover darken |
| `teal-800` | `#115e59` | `text-teal-800` | Badge text (CONFIRMED), heading tint |
| `teal-900` | `#134e4a` | `text-teal-900` | Hero gradient stop |
| `teal-950` | `#042f2e` | `text-teal-950` | Hero gradient start (darkest) |

**Semantic aliases (CSS custom properties):**
```css
--color-brand:        #0d9488;   /* = teal-600 */
--color-brand-dark:   #0f766e;   /* = teal-700 */
--color-brand-darker: #042f2e;   /* = teal-950 */
--color-surface:      #f0fdfa;   /* = teal-50  */
--color-border-light: #99f6e4;   /* = teal-200 */
```

### 1.2 Stone — Neutral / Text

All body text, labels, muted content, and backgrounds use the **Stone** (warm grey) palette — never cool greys.

| Token | Hex | Tailwind Class | Usage |
|---|---|---|---|
| `stone-50` | `#fafaf9` | `bg-stone-50` | Subtle section backgrounds |
| `stone-100` | `#f5f5f4` | `bg-stone-100` | Ghost button hover, chip background |
| `stone-200` | `#e7e5e4` | `border-stone-200` | Default borders, dividers |
| `stone-300` | `#d6d3d1` | `border-stone-300` | Slightly darker border |
| `stone-400` | `#a8a29e` | `text-stone-400` | Placeholder text, muted labels, table headers |
| `stone-500` | `#78716c` | `text-stone-500` | Secondary body text |
| `stone-600` | `#57534e` | `text-stone-600` | Ghost button text, form labels |
| `stone-700` | `#44403c` | `text-stone-700` | Primary label text, table cells |
| `stone-800` | `#292524` | `text-stone-800` | Subheadings |
| `stone-900` | `#1c1917` | `text-stone-900` | **Default body text** |

### 1.3 Amber — Warning / Pending

Used for **warning states**, pending payments, and capacity alerts.

| Context | Classes Used |
|---|---|
| Warning badge | `bg-amber-50 border-amber-200 text-amber-700` |
| Capacity ≥75% bar | Background: `#f59e0b` |
| Dashboard pending row hover | `hover:bg-amber-50/60` |
| Status badge: PENDING | `background: #fef9c3; color: #92400e; border: 1px solid #fde68a` |

### 1.4 Red — Error / Full / Cancelled

| Context | Classes Used |
|---|---|
| Error badge | `bg-red-50 border-red-100 text-red-700` |
| Raft FULL state | Background: `#fff5f5`, border: `#fecaca`, badge: `bg-red-100 text-red-600` |
| Capacity 100% bar | Background: `#ef4444` |
| Status badge: CANCELLED | `background: #fee2e2; color: #991b1b; border: 1px solid #fecaca` |
| Input error ring | `border-color: #f87171; box-shadow: 0 0 0 3px rgb(239 68 68 / 0.10)` |

### 1.5 Other Accent Colors (Manifest Palette)

The ManifestBuilder uses a **4-color raft palette** (one per raft, hardcoded in `ManifestBuilder.tsx`):

| Raft | Accent | Light bg | Border | Ring |
|---|---|---|---|---|
| Raft A | `#0d9488` (Teal) | `#f0fdfa` | `#99f6e4` | `#5eead4` |
| Raft B | `#2563eb` (Blue) | `#eff6ff` | `#bfdbfe` | `#93c5fd` |
| Raft C | `#d97706` (Amber) | `#fffbeb` | `#fde68a` | `#fcd34d` |
| Raft D | `#9333ea` (Purple) | `#faf5ff` | `#e9d5ff` | `#c4b5fd` |

---

## 2. Typography

| Element | Font | Properties |
|---|---|---|
| Body (Latin) | Inter | `font-family: "Inter", system-ui` |
| Body (Japanese) | Noto Sans JP | Applied via `:lang(ja)` selector |
| All headings | Bold | `font-weight: 700; line-height: 1.2; letter-spacing: -0.02em` |
| Table headers | Uppercase | `font-size: 0.6875rem; font-weight: 700; letter-spacing: 0.07em` |
| Section labels | Uppercase teal | `.section-label` — `font-size: 0.75rem; font-weight: 700; letter-spacing: 0.1em; color: teal-600` |

---

## 3. Component Library

### 3.1 Cards (`.card`)

All content panels use the `.card` class — **never apply raw `border` + `shadow` inline**.

```css
.card {
  background: #ffffff;
  border-radius: 1rem;         /* --radius-card */
  box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.04), 0 1px 2px -1px rgb(0 0 0 / 0.04);
  border: 1px solid rgba(13, 148, 136, 0.08);  /* teal-tinted at 8% opacity */
  transition: box-shadow 250ms, transform 250ms, border-color 250ms;
}

.card:hover {
  box-shadow: 0 12px 32px -6px rgb(13 148 136 / 0.15), 0 4px 12px -4px rgb(0 0 0 / 0.06);
  transform: translateY(-3px);
  border-color: rgba(13, 148, 136, 0.14);
}
```

> **Rule:** Padding is **not** included in `.card`. Always add `p-6` or similar.

### 3.2 Buttons (`.btn`)

Buttons compose two classes: a **base** (`.btn`) + a **variant** + an optional **size**.

```html
<!-- Primary -->
<button class="btn btn-primary">Book Now</button>

<!-- Outline -->
<button class="btn btn-outline">Export CSV</button>

<!-- Ghost -->
<button class="btn btn-ghost">Cancel</button>

<!-- Small -->
<button class="btn btn-outline btn-sm">Filter</button>

<!-- Large -->
<button class="btn btn-primary btn-lg">Confirm Booking</button>
```

| Variant | Background | Text | Border |
|---|---|---|---|
| `.btn-primary` | `linear-gradient(135deg, #0d9488, #0f766e)` | White | None |
| `.btn-outline` | Transparent | `teal-700` | `2px solid rgba(13,148,136,0.5)` |
| `.btn-ghost` | Transparent | `stone-600` | None |

Hover state for all: `translateY(-2px)` + brand-tinted shadow bloom.
Active state: `translateY(0)` snap-back.
Disabled: `opacity: 0.5; cursor: not-allowed; no transform`.

> **Rule:** Always add `cursor-pointer` as a Tailwind class when using `.btn` on a `<button>` element. CSS class alone does not guarantee this in all browsers.

### 3.3 Badges (`.badge`)

```html
<span class="badge badge-teal">CONFIRMED</span>
<span class="badge badge-green">PAID</span>
<span class="badge badge-amber">PENDING</span>
<span class="badge badge-red">CANCELLED</span>
<span class="badge badge-gray">INACTIVE</span>
<span class="badge badge-blue">CASH DUE</span>
```

| Variant | Background | Text | Border |
|---|---|---|---|
| `badge-teal` | `teal-100` | `teal-800` | `rgba(13,148,136,0.15)` |
| `badge-green` | `#dcfce7` | `#15803d` | `#bbf7d0` |
| `badge-amber` | `#fef9c3` | `#92400e` | `#fde68a` |
| `badge-red` | `#fee2e2` | `#991b1b` | `#fecaca` |
| `badge-gray` | `stone-100` | `stone-600` | `stone-200` |
| `badge-blue` | `#dbeafe` | `#1d4ed8` | `#bfdbfe` |

Status-specific classes are also available: `.status-PENDING`, `.status-CONFIRMED`, `.status-CASH_DUE`, `.status-COMPLETED`, `.status-CANCELLED`.

### 3.4 Forms (`.input`, `.label`, `.field-error`)

```html
<label class="label">Email</label>
<input class="input" type="email" />
<p class="field-error">Email is required</p>

<!-- Error state -->
<input class="input error" type="email" />
```

| State | Border | Shadow |
|---|---|---|
| Default | `1.5px solid rgba(0,0,0,0.12)` | None |
| Hover (unfocused) | `rgba(13,148,136,0.35)` | None |
| Focus | `teal-500` | `0 0 0 3px rgb(13 148 136 / 0.12)` |
| Error | `#f87171` | `0 0 0 3px rgb(239 68 68 / 0.10)` |

### 3.5 Admin Data Table (`.admin-table`)

```html
<table class="admin-table w-full">
  <thead><tr><th>Reference</th>...</tr></thead>
  <tbody><tr><td>DA-240101</td>...</tr></tbody>
</table>
```

- Header: `teal-50` tint background, `stone-400` uppercase labels
- Row hover: `rgba(240, 253, 250, 0.8)` (teal-50 at 80%)
- Row separator: `1px solid rgba(0,0,0,0.04)` — very subtle

---

## 4. Focus & Accessibility

### Global Focus Ring

Set globally in `globals.css`:

```css
:focus-visible {
  outline: 2px solid var(--color-teal-500);  /* #14b8a6 */
  outline-offset: 2px;
}
```

### Per-Element Focus (Interactive Components)

Where more precise control is needed (e.g., inside buttons, sidebar links):

```
focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400
```

For offset rings (e.g., sidebar nav items):
```
focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-1
```

> **Rule:** Never suppress focus rings without replacing them. Always use `focus:outline-none` **paired** with `focus-visible:ring-*` so keyboard users retain visibility while mouse users see a clean UI.

---

## 5. Layout System

### 5.1 Site Container

```css
.container-site {
  width: 100%;
  max-width: 1280px;
  margin: auto;
  padding: 0 1rem;  /* → 1.5rem at sm → 2rem at lg */
}
```

### 5.2 Section Spacing

```css
.section {
  padding-top:    5rem;   /* --spacing-section */
  padding-bottom: 5rem;
}
```

### 5.3 Admin Layout

```
<div class="flex min-h-screen" style="background: #f8faf9">
  <AdminSidebar />         ← fixed left sidebar, print:hidden
  <div class="flex-1 flex flex-col">
    <header class="h-16"> ← sticky top bar: breadcrumb + bell + signout
    <main class="p-4 sm:p-6 lg:p-8">  ← page content
```

Admin sidebar width: `w-56` (224px). Content area fills remaining width.

---

## 6. Hero Gradient

```css
.hero-gradient {
  background: linear-gradient(160deg, #042f2e 0%, #134e4a 40%, #0f766e 100%);
}
```
Teal-950 → Teal-900 → Teal-700, angled at 160°.

---

## 7. Shadows & Elevation

| Token | Value | Used For |
|---|---|---|
| `--shadow-card` | `0 1px 3px 0 rgb(0 0 0/0.04), 0 1px 2px -1px rgb(0 0 0/0.04)` | Resting card |
| `--shadow-card-hover` | `0 12px 32px -6px rgb(13 148 136/0.15), 0 4px 12px -4px rgb(0 0 0/0.06)` | Hovered card |
| `--shadow-elevated` | `0 24px 48px -12px rgb(0 0 0/0.14)` | Modals, dropdowns |
| `--shadow-btn` | `0 4px 14px 0 rgb(13 148 136/0.30)` | Hovered primary button |
| `--shadow-btn-lg` | `0 6px 20px 0 rgb(13 148 136/0.36)` | Large hovered primary button |

---

## 8. Animation & Motion

| Token | Value | Used For |
|---|---|---|
| `--duration-fast` | `150ms` | Micro-interactions (hover, color changes) |
| `--duration-normal` | `250ms` | Card hover, modal fade |
| `--duration-slow` | `400ms` | Page transitions, large reveals |
| `--ease-out-quad` | `cubic-bezier(0.25, 0.46, 0.45, 0.94)` | All transitions |

**Skeleton loader** (`animate-shimmer`): `background-size: 200%` sweeping gradient, 1.5s infinite.
**Spinner** (`.spinner`): `0.7s linear infinite` rotation.

---

## 9. Scrollbar Styling

Thin, brand-aware scrollbars applied globally:

```css
::-webkit-scrollbar         { width: 5px; height: 5px; }
::-webkit-scrollbar-track   { background: transparent; }
::-webkit-scrollbar-thumb   { background: stone-200; border-radius: 99px; }
::-webkit-scrollbar-thumb:hover { background: teal-400; }
```

---

## 10. Print Styles

Components that must be hidden in print use `print:hidden`. The ManifestBuilder shows a special print view:

- Sidebar (`print:hidden`), top nav (`print:hidden`), control bar (`print:hidden`)
- Raft cards: `print:grid-cols-2 print:gap-6`, `print:break-inside-avoid`
- Print header (`hidden print:block`): product name, date, time, participant count, JST timestamp
- All participant chips: simplified border, no shadows (`print:border print:border-stone-300 print:shadow-none`)
