# ThumbIntel — Design System (03)

**Document status:** `completed`
**Stage:** Locked source of truth for all visual + interaction design
**Owner:** Design Systems Engineering
**Applies to:** Marketing site, app shell, analysis dashboard, browser canvas editor, data-visualization, all export flows
**Source of truth:** `docs/00_SHARED_CONTEXT.md` (section 11 Design Direction, section 3 Product Principles, section 12 Conventions — all reproduced where load-bearing)
**Related:** `docs/01_PRD.md` (requirements), `docs/02_ARCHITECTURE.md` (if present)

> **Convention note (shared-context §12):** every spec below is written to be consumed directly by a build agent. Token names are the actual CSS custom-property identifiers shipped in production CSS. Component names are real React component identifiers in the `ui/` package. There is no pseudocode where a real `@theme` declaration, CSS variable, or `cva()` variant set is achievable.

---

## 0. Design-language statement

ThumbIntel is a **creative-pro analytics tool**, not a generic AI dashboard. The visual language must read as *precision instrument*: dark-first, quiet chrome, one loud accent. The product's job is to show a creator **why** a thumbnail works and let them **rebuild** it — so the chrome recedes and the *thumbnail itself* is the loudest thing on screen.

Three non-negotiables (shared-context §11):

1. **Dark-first, professional, premium, minimal.** The dark theme is the default and the canonical brand state. Marketing site may run light, but the app is dark.
2. **One confident accent.** Electric red-orange `#FF4D2E` is the single brand/high-CTR accent. It drives call-to-actions and the score system. Everything else is neutral surface/text/border plus muted semantic states. No gradient-heavy, glassmorphic noise.
3. **No generic SaaS look.** Avoid: excessive glassmorphism, giant purple/blue gradients, decorative hero animations, radial glow oceans, `backdrop-blur` on every card, animated count-ups everywhere, rainbow data-viz. The thumbnail is the hero.

### What this document governs

- Token system (color / type / space / radius / shadow / border / focus / z-index / motion / breakpoint)
- Grid & layout (app vs marketing density)
- Component library (Form, Feedback, Navigation, Data, Editor controls)
- Editor chrome specifics (toolbar, layer list, properties, transient overlays, guides)
- Data visualization (score ring, radar, bars, sparklines)
- Iconography, motion, theme strategy
- Two fully-specified worked examples (Analysis Score Card, Editor Toolbar)

---

## 1. Design tokens

Everything ships as **CSS custom properties** plus Tailwind v4 `@theme` mappings. Modes: `:root` (light) and `.dark` (dark). The **dark theme is the default**; the app root renders `<html class="dark">` unless the user has an explicit light override (see §9).

### 1.1 Raw design tokens (the palette source)

These are the primitive scales. They feed the semantic surface/text/border tokens. Never used directly in components — only via the semantic token.

```css
/* ---- PRIMITIVE: SURFACE/NEUTRAL (dark = default) ---- */
--palette-black-000: #FFFFFF;
--palette-black-025: #FCFCFD;
--palette-black-050: #F6F7F8;
--palette-black-100: #ECEEF0;
--palette-black-200: #D6DADF;
--palette-black-300: #AFB6BE;
--palette-black-400: #7D8790;
--palette-black-500: #4B5560;
--palette-black-600: #343D48;
--palette-black-700: #232B34;
--palette-black-800: #161C23;
--palette-black-850: #11161C;
--palette-black-900: #0B0D10;   /* locked base surface (§11) */
--palette-black-950: #060709;

/* ---- PRIMITIVE: BRAND ACCENT (electric red-orange) ---- */
--palette-accent-050: #FFF1EC;
--palette-accent-100: #FFDCD2;
--palette-accent-200: #FFB7A4;
--palette-accent-300: #FF8D6E;
--palette-accent-400: #FF6B47;
--palette-accent-500: #FF4D2E;   /* locked accent (§11) */
--palette-accent-600: #E23A1E;
--palette-accent-700: #B9341C;
--palette-accent-800: #8A2917;
--palette-accent-900: #5D1E12;

/* ---- PRIMITIVE: SEMANTIC STATE HUES (mutated, not rainbow) ---- */
--palette-green-400: #2FBF71;  --palette-green-500: #1FA968;  --palette-green-600: #158756;
--palette-amber-400: #FFB020;  --palette-amber-500: #F59E0B;  --palette-amber-600: #D97706;
--palette-blue-400: #4C9EEB;   --palette-blue-500: #2E90FA;   --palette-blue-600: #1570EF;
--palette-red-400: #F04438;    --palette-red-500: #E5484D;    --palette-red-600: #C73030;
```

### 1.2 Semantic tokens — DARK THEME (default, `html.dark` / `.dark`)

Contrast ratios computed against the token's own background (WCAG AA target ≥ 4.5:1 body, ≥ 3:1 large/UI).

#### Surfaces (ground → raised → elevated → overlay)

| Token | Value | Use | Contrast vs base surface |
|---|---|---|---|
| `--surface-1` | `#0B0D10` | App/marketing page ground. Locked base (§11). | — |
| `--surface-2` | `#11151A` | Cards, panels, static wells (raised by 1 step). | n/a (fills) |
| `--surface-3` | `#161C23` | Hover-on-surface-2, popovers, menus, dropdown panels. | n/a |
| `--surface-4` | `#1C232C` | Flyouts, modals, elevated floating layers (radix overlays). | n/a |
| `--surface-overlay` | `rgba(6,7,9,0.72)` | Modal/command-palette scrim. | n/a |
| `--canvas-editor` | `#060709` | Editor viewport background behind the thumbnail canvas. Slightly darker than surface-1 to isolate the artwork. | n/a |
| `--surface-inverse` | `#F6F7F8` | Inverted emphasis (e.g., text on accent buttons uses accent-500 + near-black, not this). Reserved for selected row fills on very dark chrome. | vs `--text-primary` ≥ 12 |

Text surfaces must not exceed ~2 elevation steps for static content — depth comes from border + shadow, not endless stacking.

#### Text

| Token | Value | Use | Contrast (on surface-1/2) |
|---|---|---|---|
| `--text-primary` | `#F6F7F8` | Headings, primary labels, score numbers. | 16.9:1 (AAA) |
| `--text-secondary` | `#AFB6BE` | Body, secondary labels, table cells, muted headings. | 9.1:1 (AAA) |
| `--text-tertiary` | `#7D8790` | Captions, placeholders, disabled-unless-needed, timestamps. | 5.4:1 (AA) |
| `--text-disabled` | `#4B5560` | Disabled text. Not required to hit AA (non-interactive). | ~3:1 |
| `--text-inverse` | `#0B0D10` | Text on accent/solid-inverse fills. | on accent-500 ≥ 8:1 |

> Rule: never use `--text-tertiary` for anything a user must read to act (button labels, form labels, table headers). Tertiary is for genuine de-emphasis only.

#### Borders & dividers

| Token | Value | Use | Notes |
|---|---|---|---|
| `--border-subtle` | `#1E242C` | Default card/chrome border, subtle. | low-emphasis separation |
| `--border-default` | `#2A323C` | Editable/sortable/input borders. | medium emphasis |
| `--border-strong` | `#3B4550` | Focus-state, selected boundary, table header rule. | high emphasis |
| `--border-focus` | `#FF6B47` | Focus ring (accent-400 on dark). See §1.6. | AA vs surface ≥ 3:1 |
| `--divider` | `#1A2027` | In-card divider lines, list separators. | quiet |

#### Accent (brand)

| Token | Value | Use | Contrast |
|---|---|---|---|
| `--accent` | `#FF4D2E` | Primary CTA, score-high, active tab, selected state, brand marks. | 3.5:1 on surface-1 (AA large/UI); text-on-accent uses `--text-inverse` |
| `--accent-hover` | `#FF6B47` | Hover for accent fills. | |
| `--accent-pressed` | `#E23A1E` | Active/pressed for accent fills. | |
| `--accent-subtle` | `rgba(255,77,46,0.12)` | Accent-tinted fill for badges, selected rows, faint highlights. | text on it = `--text-primary` |
| `--accent-soft` | `rgba(255,77,46,0.18)` | Accent ring/glow behind score ring, active icon bg. | |
| `--on-accent` | `#0B0D10` | Text/icon on `--accent` solid. | 8.1:1 on accent-500 (AAA) |

#### Semantic states (success / warning / info / danger)

| State | Token | Color | Surface tint (for `.state-subtle` chips) | Text-on-tint | Contrast (on surface-1) |
|---|---|---|---|---|---|
| Success | `--success` | `#1FA968` | `rgba(31,169,104,0.14)` | `--success-strong` `#2FBF71` | 3.1:1 |
| Warning | `--warning` | `#F59E0B` | `rgba(245,158,11,0.14)` | `--warning-strong` `#FFB020` | 2.6:1 (large only) |
| Info | `--info` | `#2E90FA` | `rgba(46,144,250,0.14)` | `--info-strong` `#4C9EEB` | 3.0:1 |
| Danger | `--danger` | `#E5484D` | `rgba(229,72,77,0.14)` | `--danger-strong` `#F04438` | 3.1:1 |

- `--success` / `--danger` / `--info` / `--warning` are **state accents** for icons, chart emphasis, status dots. For dense text at AA, use the `-strong` variants (`--success-strong`, etc.).
- Status chips use the **surface-tint fill + =strong text** pair (never pure color on dark; tinted fills bleed). See §3.9 chips.

### 1.3 Semantic tokens — LIGHT THEME (`:root`, no `.dark`)

Contrast computed against light surface. AA target holds.

#### Surfaces

| Token | Value | Use |
|---|---|---|
| `--surface-1` | `#FFFFFF` | Page ground (marketing only by default; light is opt-in for app). |
| `--surface-2` | `#F6F7F8` | Cards, panels, wells. |
| `--surface-3` | `#ECEEF0` | Hover-on-2, popovers, menus. |
| `--surface-4` | `#FFFFFF` + `--shadow-lg` | Modals, flyouts, floating layers. |
| `--surface-overlay` | `rgba(11,13,16,0.40)` | Scrim. |
| `--canvas-editor` | `#ECEEF0` | Editor viewport (light mode). |

#### Text

| Token | Value | Contrast (on surface-1) |
|---|---|---|
| `--text-primary` | `#11161C` | 17.4:1 (AAA) |
| `--text-secondary` | `#4B5560` | 7.4:1 (AAA) |
| `--text-tertiary` | `#7D8790` | 4.5:1 (AA) |
| `--text-disabled` | `#AFB6BE` | n/a |
| `--text-inverse` | `#FFFFFF` | on accent-500 4.7:1 (AA) |

#### Borders / accent (light)

| Token | Value | Notes |
|---|---|---|
| `--border-subtle` | `#ECEEF0` | |
| `--border-default` | `#D6DADF` | |
| `--border-strong` | `#AFB6BE` | |
| `--border-focus` | `#E23A1E` | accent-600 on light for AA. |
| `--divider` | `#F0F2F4` | |
| `--accent` | `#E23A1E` | accent-600 on light (accent-500 is 3.1:1 on white — too low for UI text). Two-step down in light. |
| `--accent-hover` | `#B9341C` | |
| `--accent-subtle` | `rgba(226,58,30,0.10)` | |
| `--on-accent` | `#FFFFFF` | |

> **Accent lightness differs by theme.** Dark uses `#FF4D2E` (accent-500) to read vivid on dark; light drops to `#E23A1E` (accent-600) so it holds AA on white. This is intentional and locked. Consumer components reference `--accent`, never a raw hex.

### 1.4 Typography scale

Fonts (via `next/font`, shared-context §11): **Inter** (UI stack) + **Sora** (display/marketing). Sora is chosen over Space Grotesk as the default display face for its slightly warmer, more "creator premium" feel; Space Grotesk is the fallback `--font-display-fallback` and can be swapped by editing one theme line. Self-hosted, no Google Fonts fetch at runtime.

```ts
// app/layout.tsx (conceptual — see next/font integration in §1.5)
import { Inter, Sora } from 'next/font/google'
const inter = Inter({ subsets:['latin'], variable:'--font-inter' })
const sora  = Sora({ subsets:['latin'], variable:'--font-display', weight:['500','600','700','800'] })
```

| `--font-sans` | Inter (body/UI) |
| `--font-display` | Sora (headings, marketing, score numerals, editor display strips) |
| `--font-mono` | `ui-monospace, SFMono-Regular, "JetBrains Mono", Menlo` — used for estimates `~` figures, IDs, hex values, OCR text readouts, keybind hints |

#### UI type ramp (Inter) — $type tokens

| Token | Size / Line-height / Weight / Letter-spacing | Use | Visual load |
|---|---|---|---|
| `--text-ui-xs` | `11px / 14px / 500 / +0.02em` | Tooltip text, axis labels, badge micro-text, kbd. | quiet |
| `--text-ui-sm` | `12px / 16px / 500 / +0.01em` | Table cells, form help, chip labels, panel section hints. | quiet |
| `--text-ui-smmd` | `13px / 18px / 500 / 0` | Buttons, inputs, select text, most body control text. | body |
| `--text-ui-md` | `14px / 20px / 400 / 0` | Default body / paragraph, descriptions. | body |
| `--text-ui-lg` | `16px / 24px / 400 / 0` | Lead body, empty-state prose. | body |
| `--text-ui-btn` | `13.5px / 20px / 600 / +0.01em` | Button + tab labels (semibold, not heavy). | control |

Controls should default to 13px (`--text-ui-smmd`) — compact, precise, not puffy.

#### Display/marketing type ramp (Sora) — $display tokens

| Token | Size / Line-height / Weight / Letter-spacing | Use |
|---|---|---|
| `--text-display-xs` | `18px / 26px / 600 / -0.01em` | Card titles, section headers inside panels. |
| `--text-display-sm` | `22px / 30px / 600 / -0.015em` | Panel/group titles, dashboard "kicker". |
| `--text-display-md` | `30px / 38px / 700 / -0.02em` | Marketing section H2, analysis "verdict" headline. |
| `--text-display-lg` | `42px / 48px / 700 / -0.025em` | Marketing hero. |
| `--text-display-xl` | `56px / 60px / 800 / -0.03em` | Landing hero headline. |
| `--text-display-score` | `56px / 56px / 800 / -0.02em` | The big score number on ring card. Sora, tabular. |
| `--text-display-metric` | `20px / 26px / 700 / -0.01em` | Per-metric score numerals. |

#### Tabular numbers

Score / usage / ratio numerals use `font-variant-numeric: tabular-nums`. Apply via a `.num` utility or per-token. Never let a count-up animate a value that isn't tabular — jitter.

### 1.5 Font loading & `@theme` wiring

```css
/* globals.css — Tailwind v4 */
@import "tailwindcss";
@theme inline {
  --font-sans: var(--font-inter), system-ui, sans-serif;
  --font-display: var(--font-display), var(--font-display-fallback), sans-serif;
}
@layer base {
  body { font-family: var(--font-sans); font-feature-settings: "cv05","cv11"; }
  .display { font-family: var(--font-display); }
  .num { font-variant-numeric: tabular-nums; font-feature-settings: "tnum"; }
}
```

### 1.6 Spacing scale (4px base)

| Token | rem | px | Use |
|---|---|---|---|
| `--space-0` | 0 | 0 | none |
| `--space-0-5` | 0.125 | 2px | micro-pad within icons, tight gap |
| `--space-1` | 0.25 | 4 | icon-to-label gap, chip inner pad |
| `--space-1-5` | 0.375 | 6 | |
| `--space-2` | 0.5 | 8 | standard intra-control gap |
| `--space-3` | 0.75 | 12 | input padding, button padding-y |
| `--space-4` | 1 | 16 | card padding-y, control gap |
| `--space-5` | 1.25 | 20 | card padding (density default) |
| `--space-6` | 1.5 | 24 | section gap, panel padding |
| `--space-8` | 2 | 32 | layout gap, card padding (comfortable) |
| `--space-10` | 2.5 | 40 | block gap |
| `--space-12` | 3 | 48 | page section spacing |
| `--space-16` | 4 | 64 | marketing section spacing |
| `--space-20` | 5 | 80 | marketing hero spacing |
| `--space-24` | 6 | 96 | major page breaks |

**Editor density** uses `--space-0-5`/`--space-1`/`--space-2`/`--space-3`. **Marketing density** uses `--space-6`/`--space-8`/`--space-12`.

### 1.7 Radius

| Token | Value | Use |
|---|---|---|
| `--radius-xs` | `4px` | tags, tiny chips, kbd |
| `--radius-sm` | `6px` | inputs, small buttons, toolbar icon buttons, segmented control |
| `--radius-md` | `8px` | default buttons, cards, table containers, popovers, toasts |
| `--radius-lg` | `12px` | large cards, modals, editor panel headers, marketing cards |
| `--radius-xl` | `16px` | marketing hero cards, score ring card, feature tiles |
| `--radius-full` | `9999px` | pills, avatar, switch thumb, status dots, tag pills |

> Rule: radius scales with element size. Micro (icon buttons) = `--radius-sm`; mid (cards) = `--radius-md`; big (hero) = `--radius-xl`. No mixed radii on a single component unless the anatomy specifies it.

### 1.8 Shadows

| Token | Value | Use |
|---|---|---|
| `--shadow-xs` | `0 1px 2px rgba(6,7,9,0.06)` | subtle lift, list rows |
| `--shadow-sm` | `0 1px 3px rgba(6,7,9,0.10), 0 1px 2px rgba(6,7,9,0.06)` | cards, popovers |
| `--shadow-md` | `0 4px 12px rgba(6,7,9,0.18), 0 2px 4px rgba(6,7,9,0.08)` | menus, dropdowns, floating panels |
| `--shadow-lg` | `0 12px 32px rgba(6,7,9,0.28), 0 4px 8px rgba(6,7,9,0.12)` | modals, command palette |
| `--shadow-glow-accent` | `0 0 0 1px rgba(255,77,46,0.28), 0 0 24px rgba(255,77,46,0.18)` | score ring interior, selected editor element ring (sparingly) |

> Glow is reserved for the **score ring** and the **focused/selected editor element** only. No chart glow. Light theme uses same shadows but reduced opacity (`rgba(11,13,16,...)`).

### 1.9 Borders

Border widths: **1px** default, **2px** state/emphasized, **1.5px** select/input (matches sizing).

Tokens map to §1.2/§1.3 border colors:

| Class | Token |
|---|---|
| `border-subtle` | `--border-subtle` |
| `border-default` | `--border-default` |
| `border-strong` | `--border-strong` |
| `border-transparent` | `transparent` |
| `border-accent` | `--accent` |
| `border-danger` | `--danger` |

### 1.10 Focus ring

Single consistent focus treatment: a **2px outline** with a **2px offset**, using `--border-focus`. Applied on `:focus-visible`, not on mouse `:focus`. Never box-shadow-only (breaks Windows high-contrast).

```css
:focus-visible {
  outline: 2px solid var(--border-focus);
  outline-offset: 2px;
  border-radius: inherit;   /* keep ring radius matched */
}
/* suppress on mouse click, keep on keyboard */
*:focus:not(:focus-visible){ outline: none; }
```

For the editor canvas (absolutely-positioned elements), the selected-element ring uses `--shadow-glow-accent` (outline+glow) instead of the standard outline — see §4.

### 1.11 Z-index scale

| Token | Value | Use |
|---|---|---|
| `--z-base` | 0 | default content |
| `--z-raised` | 10 | sticky headers, editor toolbar |
| `--z-dropdown` | 30 | dropdowns, popovers, tooltips |
| `--z-overlay` | 40 | scrim, modal backdrop, command palette backdrop |
| `--z-modal` | 50 | modal/command palette panels |
| `--z-toast` | 60 | toasts, snackbars |
| `--z-tooltip` | 70 | tooltips above modals |

Editor canvas internal z (Konva) is separate and layered via `zIndex` on stages, not these tokens (see §4).

### 1.12 Motion

| Token | Value | Use |
|---|---|---|
| `--dur-1` | `100ms` | micro: hover bg, chevron, icon swap, toggle, instant state change |
| `--dur-2` | `150ms` | buttons, inputs focus, table rows, chip state |
| `--dur-3` | `200ms` | panels collapse, tabs, segment switch, tooltip |
| `--dur-4` | `300ms` | modals, drawers, drawers-in, overlay fade, command palette |
| `--dur-5` | `500ms` | score ring fill, chart bars, progress (once, e.g. `linear` out) |
| `--ease-standard` | `cubic-bezier(0.2,0.0,0,1)` | most UI |
| `--ease-in-out` | `cubic-bezier(0.4,0,0.2,1)` | overlays, x-position, larger movement |
| `--ease-out` | `cubic-bezier(0.0,0,0.2,1)` | enter/exit, score fills |

See §7 Motion rules for what may/cannot animate and reduced-motion.

### 1.13 Breakpoints

| Token | px | Container (app) | Target |
|---|---|---|---|
| `--breakpoint-sm` | `640` | mobile | |
| `--breakpoint-md` | `768` | — | |
| `--breakpoint-lg` | `1024` | — | analysis dashboard break |
| `--breakpoint-xl` | `1280` | container max `1280` | pro split pane break |
| `--breakpoint-2xl` | `1536` | container max `1440` | editor full-width break |

---

## 2. Grid & layout

### 2.1 12-column grid (app)

```
[ 1 ] [ 2 ] [ 3 ] [ 4 ] [ 5 ] [ 6 ] [ 7 ] [ 8 ] [ 9 ] [10] [11] [12]   ← 12-col, 8px gutters (app)
┊─────────────── content ───────────────────────────────┊┊──────────────┊
```

- **App grid:** 12 cols, **8px gutters** (compact/editor), 16px gutters (dashboard views). Grid fluid within the app shell.
- **Container widths:** app content `max-width: 1280px`; editor shell is **full-fluid** (no max — it fills viewport); marketing `max-width: 1200px` with `--space-8` gutters.
- **Page gutter:** `padding: 0 var(--space-6)` on app page frames (24px), `var(--space-8)` (32px) on marketing.

### 2.2 Density settings

Two densities. A single page uses one.

| Property | Editor (compact) | App dashboard | Marketing (comfortable) |
|---|---|---|---|
| Vertical rhythm | 8px | 16px | 32px |
| Panel padding | `--space-3` (12px) | `--space-5` (20px) | `--space-8` (32px) |
| Control height (buttons/inputs) | 28px | 36px | 48px |
| Icon button | 24px | 32px | 40px |
| Gap between panels | 8px | 16px | 24px |
| Section title size | `--text-ui-smmd` | `--text-display-xs` | `--text-display-md` |

The editor is intentionally the most compact UI in the product — chrome must not steal canvas real estate. Marketing is the loosest.

### 2.3 Alignment rules

- Left-align text and controls in the app (right-align numbers in tables/score columns).
- Center hero/landing blocks and score-ring cards.
- Labels above inputs (full-width fields); inline labels only for switches/checkboxes.
- Vertical rhythm: consistent 8px multiples; block gaps use `--space-4`/`--space-6`.
- Panel headers: 3-part row — title (left), actions (right), optional `kbd` hint (right, tertiary).

---

## 3. Components

All components are React + `cva()` variants + Tailwind v4 classes backed by the semantic tokens. Radix primitives are used for overlay/interaction primitives (menus, dialog, popover, tooltip, select, switch, slider, tabs, accordion, command). Naming is the literal `@/components/ui/*` export.

Shared anatomy conventions:

- **Controls = `--radius-sm`**, **containers = `--radius-md`**, **floating = `--radius-md`**.
- **States** (on every interactive component): `default`, `hover`, `focus`/`focus-visible`, `active/pressed`, `disabled`, `loading`, `error` (form only). For icon buttons, also `active`(toggled/selected).
- **Error/disabled states** must be recoverable and never block a clear path.
- Every control exposes an **accessible name** (label or `aria-label`) and, for icon-only, an `aria-label` + `title` tooltip.

### 3.1 Button

`<Button asChild? size variant>`. Variants: `accent` (brand), `secondary` (neutral raised), `ghost` (quiet), `outline`, `danger`, `link`. Sizes: `sm`(28px editor), `md`(36px default), `lg`(48px marketing), `icon`(32/36), `icon-sm`(24).

```tsx
// cva variants
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        accent:   'bg-[var(--accent)] text-[var(--on-accent)] hover:bg-[var(--accent-hover)] active:bg-[var(--accent-pressed)]',
        secondary:'bg-[var(--surface-3)] text-[var(--text-primary)] hover:bg-[var(--surface-4)] border border-[var(--border-default)]',
        ghost:    'text-[var(--text-primary)] hover:bg-[var(--surface-3)]',
        outline:  'border border-[var(--border-default)] text-[var(--text-primary)] hover:bg-[var(--surface-3)]',
        danger:   'bg-[var(--danger)] text-[var(--text-inverse)] hover:opacity-90',
        link:     'text-[var(--accent)] underline-offset-2 hover:underline',
      },
      size: {
        sm: 'h-7 px-3 text-[var(--text-ui-smmd)]',      // 28px — editor
        md: 'h-9 px-4 text-[var(--text-ui-smmd)]',      // 36px — app
        lg: 'h-12 px-6 text-[var(--text-ui-lg)]',       // 48px — marketing
        icon: 'h-8 w-8', 'icon-sm': 'h-6 w-6',
      },
    },
  }
)
```

States:
- **hover** → background token swap (never scale/translate). For `accent`, `--accent-hover`.
- **focus-visible** → standard focus ring (§1.10).
- **active/pressed** → darker fill (`--accent-pressed` / `--surface-4`), no offset animation.
- **disabled** → `opacity-50` + `pointer-events-none`; keep the label readable (not `--text-disabled` on an accent fill, which would be illegible).
- **loading** → swap label for a 14px spinner (class `.spinner`, `--accent` on accent buttons, `--text-secondary` otherwise), preserve the button's exact width (`min-w` via `w-[token-on-load]` or `data-loading` keeps width locked) so no layout shift.
- **error** (rare on buttons) → `danger` variant only, not a state on all buttons.

Accessibility: focus ring, `min-width` for loading swap, `aria-busy={loading}`, `aria-aria-disabled` not just `disabled` where a click is required to re-enable.

### 3.2 Input (text / search / URL)

`<Input>`. Height: `sm` 28, `md` 36 (default), `lg` 48. Radius `--radius-sm`. `--text-ui-smmd` font. Padding `px-3`.

Anatomy: label (optional, above), input, help/inline feedback (below), 16px left icon (optional, grays it not part of value).

States:
- **default**: `bg--surface-2`, `border--border-default`, `text--text-primary`. Placeholder = `--text-tertiary`.
- **hover**: `border--border-strong`.
- **focus**: `border--border-focus` + 2px outline ring (§1.10); remove the default box-shadow.
- **disabled**: `opacity-50`, `cursor-not-allowed`, `bg--surface-1`.
- **error**: `border--danger`; helper text = `--danger-strong`; `aria-invalid="true"`; `aria-describedby` to the error message.
- Valid (optional): `border--success` subtle with a tiny success check only when the field meaningfully validates (e.g., URL, export config) — not on every field finish.

Usage notes: single-line only. Use `Textarea` for multi-line. Server-side trim + `zod` schema in `@/lib/validators`. Placeholders must never be the only label; always render a `<label>` with `for`.

### 3.3 Textarea

Row count 3–8. Same states as input. `resize-y`, `min-h-[80px]`. Character counter (optional, tertiary, right-aligned below). Used for: prompt to Claude-vision description, export settings, "remix note", team note. `aria-describedby` links counter+error.

### 3.4 Select (native + Radix)

Two flavors:
- **Native `<select>`** for simple forms (sort, page size) — cheap, accessible.
- **Radix Select** for rich options (font family picker, export format, viewport presets) — styled trigger + custom menu.

Trigger anatomy: label placeholder/value, chevron-down icon, `--radius-sm`, 36px. States same as input.

Radix menu (popup): `--surface-4`, `--shadow-md`, `--radius-md`, border `--border-subtle`. Items 32px, left-aligned, hover `--surface-3`, selected shows `--accent` check + `--accent-subtle` fill. Disabled `opacity-50`. Keyboard: full Radix listbox semantics, `aria-activedescendant`.

### 3.5 Checkbox / Radio / Switch

All visually consistent, `--radius-xs`.

- **Checkbox**: 18px. Unchecked `--border-strong`; checked fill `--accent` with `--on-accent` check; indeterminate = accent fill with dash (for "select all layers"). Focus ring standard.
- **Radio**: 18px, circle, filled accent dot when selected.
- **Switch**: 36×20 track. Off `--surface-4`; on `--accent`. Thumb 16px `--text-inverse`. Transition `--dur-1` on transform+background. `aria-checked`, `role="switch"`.

Usage: labels remain fully clickable via Radix `Label`. Convert "on/off" — prefer Switch; multi-choice mutually exclusive → Radio; toggle list membership → Checkbox.

### 3.6 Slider

Radix Slider. 16px thumb, 4px track. Annotated (for things like "contrast", "opacity", "thickness", "zoom%").

- Track: `--surface-4`; fill to `--accent` at active value.
- Thumb: white/`--text-inverse`, 16px circle, focus ring on focus-visible.
- Two thumb handles for range (e.g., acceptable font-size range) with tooltip on drag (`--dur-2`).
- `aria-valuetext` for percentage, `aria-label` always.

### 3.7 Color picker (hex + hsl + eyedropper)

Editor properties + brand palette panel. Two contexts: **swatch** (inline, compact) and **full picker** (popover). THREE input modes, all synced:

- **Hex** field (`--font-mono`), validates `#RGB`/`#RRGGBB`/`#RRGGBBAA`. On commit normalizes.
- **HSL** sliders (H 0–360, S/L 0–100) — a mini 3-track slider set + a 2D saturation/lightness square (Radix / custom pointer events). Saturation/lightness square on `--surface-3`, handles on `--accent`.
- **Eyedropper** — uses `EyeDropper` API where supported; falls back to "click canvas to sample" on the editor. Samples the thumbnail (Konva pixel) or the current page.

Palette strip: accent-family swatches (the 9 `--palette-accent-*` steps) + neutral ramp (5 steps) + semantic (4) + "add custom" (+). Each swatch 20px, `--radius-xs`, tooltip with hex on hover, selected = `--shadow-glow-accent` ring.

Accessibility: every swatch `role="button"` `aria-label={`${hex}`}` and a live hex readout (never color-only).

### 3.8 Number stepper / NumberField

Used for: font size (px), line height, letter-spacing (em), padding, corner radius, stroke width.

- 36px control, `--radius-sm`, siblings: `−` / value / `+`. `--font-mono` value for precision.
- Only integer or step-defined decimal steps (e.g., 0.5px). `step`, `min`, `max`, plus `precision` and a unit suffix (px/em/%).
- Keyboard: ArrowUp/Down increment, hold repeats. `role="spinbutton"`, `aria-valuenow/min/max/now`.
- Focus: since the value is editable or steppable, give the number a subtle accent underline to signal editability; `--border-focus` on focus.
- **Editor-specific**: display/nudge directly applies to the selected Konva node — must round trip through the serialized editor state (§17).

### 3.9 Tabs

Radix Tabs. Variant `underline` (in panel header) and `pill` (segment-like filtering: "Overview / Metrics / Text / Colors / Objects").

- **Underline**: label 14px, `--text-secondary` inactive, `--text-primary` active + 2px `--accent` underline. Hover `--text-primary`. Active content uses `aria-selected`.
- **Pill**: container `--surface-2` filled, radius `--radius-md`, padding `4px`; active pill `--surface-4` + `--text-primary` + `--shadow-xs`; inactive `--text-secondary`. This is the default for matching score metric tabs.

### 3.10 Dropdown / Menu (Radix DropdownMenu)

Trigger = ghost/icon button (e.g., `⋯`). Menu: `--surface-4`, `--shadow-md`, `--radius-md`, `--border-subtle`, `min-w-[200px]`, item 32px.

Item anatomy: icon (16, `--text-secondary`) leading, label, ofted `kbd`, trailing check/submenu; separator (`--divider`, 1px, `my-1`). Danger item in `--danger-strong` text. `role="menu"`, `aria-haspopup`, focused item highlight `--surface-3`.

### 3.11 Tooltip

Trigger hover/focus. Panel: `--surface-3` (dark) / `--surface-4`, radius `--radius-sm`, `--text-ui-xs`, `max-w-[280px]`. Delay default 300ms + `--dur-2` fade. `role="tooltip"` via Radix. Focus-triggerable. Tooltips never contain the only copy of critical info.

### 3.12 Badges / Chips

Badge types (each has `default`/`subtle`/`outline`):

- **Status badge**: stage status (`pending|queued|running|completed|failed|partial`) — tinted, per §1.2 semantic and §12 statuses. `.state-subtle` fill + `-strong` text. `running` shows a 12px spinner + label, `partial` uses `--warning`.
- **Confidence chip**: the estimate maker. Renders `~78% (est.)` with a confidence tier: `high`(≥0.8, `--success`), `medium`(0.5–0.8, `--warning`), `low`(<0.5, `--danger`). Always shows both a numeric-estimate and a confidence tier. Never a bare number. (shared-context §3 + §12 — estimates are always labeled.)
- **Estimate chip**: `~`-prefixed value + "est." label, `--font-mono`, tertiary text.
- **Font/type chip**: shows the detected font family + weight + size, e.g. `Montserrat · Bold · 64px` — used in the text detection readout; non-editable display, but clickable to jump to that layer.
- **Metric chip**: e.g. `Readability 82`.
- **Tag/pill**: neutral, for filters; `--radius-full`, `--radius-xs` for micro.

Sizes: `sm`(20px), `md`(24px). Anatomy: optional dot/indicator + label. `--text-ui-xs`/`--text-ui-sm`.

### 3.13 Card

Container for a logical group. Kinds:

- **Card** (default): `--surface-2`, `--radius-md`, `border--border-subtle`, `0 1px 2px` shadow. Padding: app `--space-5`, editor `--space-3`, marketing `--space-8`.
- **Raised card** (interactive): adds hover `--surface-3` + `--shadow-sm` (used for analysis metric tiles that are clickable into a section).
- **Metric card** (score tile): anatomy = header row (label + confidence chip) + big Sora number (`--text-display-metric`) + sparkline/bar + optional delta + footer. See worked example §10.1.
- **Empty-card** and **error-card** are Card with a centered state block (§3.17).

Card header anatomy (3-region): `title` (left, `--text-display-xs`, semibold), `actions` (right, ghost/icon 16-24px), optional `meta` (tertiary). Card body below, separated by `--divider` if sticky header is used.

### 3.14 Table

Used on: analysis "detected elements" table, export history, billing, team members, usage/dashboard.

- Container: `--surface-2`, `--radius-md`, `border--border-subtle`, overflow-x-auto.
- Header: `--text-ui-sm`, `--text-tertiary` (allow AA large for headers — uppercase optional but keep letter-spacing modest), 1px `--border-strong` under header, `bg-#0b0d10`/transparent.
- Row: `--text-ui-smmd`, `--text-secondary` cells; row `data-state="selected"` → `--accent-subtle` left 2px bar + slightly brighter bg; hover `--surface-3`; row height 40px default (36 compact).
- Numeric columns right-aligned with `.num` tabular.
- Sortable headers: click toggles sort, `aria-sort`, small caret `--text-tertiary`.
- Empty state → row-span empty block (§3.17). Loading → skeleton rows (§3.16).

### 3.15 Modal / Dialog

Radix Dialog. Surface `--surface-4` (light `#fff`), `--shadow-lg`, `--radius-lg`, `max-w` per content (forms `520px`, confirmation `440px`, editor export `720px`, layer inspector `640px`).

- Scrim: `--surface-overlay`, fade `--dur-4`.
- Header: title (`--text-display-xs`), close (icon, ghost). `aria-labelledby`, `aria-describedby` (or `aria-describedby` omitted for non-descriptive confirmation modals).
- Body: `--space-6` pad, footer with button actions (primary accent, secondary cancel).
- **Focus trap** via Radix; Esc closes; `role="dialog"` `aria-modal="true"`; scroll outside prevented; body content is not `aria-hidden`-gated — focus lives in the modal.
- No `resize`. Never more than one modal in the stack except nested confirmation within a dialog (allowed once, e.g. "Delete layer?").

### 3.16 Skeleton / loading

- Skeleton block: `bg-[--surface-3]` with a subtle 1200ms `pulse` at 40–60% opacity (respect reduced-motion → no pulse, just dim block). Rounded to match the real element.
- Skeleton rows for tables (5 `<tr>` of shimmerless blocks), metric cards, layer list.
- `aria-busy="true"` on the loading region; alternative text / `aria-hidden` on skeleton; a real `aria-label` for the container ("Loading analysis…").

### 3.17 Empty states

Pattern: icon (32 `--text-tertiary`) + title (`--text-ui-md` semibold) + body (`--text-ui-md`, `--text-secondary`) + optional primary CTA. Centered, `--space-8` padding.

Per-domain messages:
- **No analysis yet** → "Upload a thumbnail to get your first analysis." CTA "Analyze a thumbnail".
- **No layers** (editor empty) → "Add a text layer or import a design." CTA "New layer" / "Import".
- **No export history** → "Your exports will appear here."
- **No OCR text detected** → "No text found. This could be a heavily stylized or image-only thumbnail." with an "est." note that tesseract may have failed → "Try re-running with the vision provider."
- **Search no results** → generic with "Clear filters".

Empty = invitation + one primary action. Never a dead end.

### 3.18 Error states

Two layers (shared-context §12 error taxonomy + envelope `{ error: { code, message, details? } }`):

- **Inline field error** (§3.2): a red helper under field with `--danger-strong`.
- **Error card / banner**: surface `--danger` tint `rgba(229,72,77,0.12)`, border `--danger`, `--text-primary` title + `--text-secondary` detail. Includes `retry` action or `re-run` where applicable. Maps from `details?.retryable` and `details?.stage`.
- **Editor/analyze errors**: a top-of-panel error strip with the specific stage (`ocr | vision | scoring | export`) and a "Retry stage" button. `failed` / `partial` states surface here with `--warning` for partial.

No error state should be a bare red rectangle — always a boundary (`border`), a title, a recovery path.

### 3.19 Progress / Stepper

- **Indeterminate linear** (analysis stages): a segmented progress bar — track `--surface-3`, segments that fill `--accent` as each analysis stage completes (OCR, Vision, Scoring, Export). This matches the deterministic stage model (§8). Label right shows current stage (e.g., "Running OCR… 2/4").
- **Determinate gauges** use the score ring (§5.1).
- **Step indicator** (onboarding / export wizard): 4 steps, current `--accent`, done `--success` check, upcoming `--text-secondary`. Connected by `--divider` line.

### 3.20 Accordion

Radix Accordion (single). Used for properties panel collapsible sections, FAQ, "show detected fonts" groups.

- Trigger: 28–36px row, `--text-ui-smmd` semibold, chevron-right rotates 90° open (transition `--dur-2`), hover `--text-primary`.
- Content: pad-bottom `--space-3`, `--text-secondary`. Only one open at a time within a group by default.
- `aria-expanded`, keyboard arrows navigate, single vs multiple via `type` prop.

### 3.21 Segmented control

A 2–5 option single-select at a tighter visual weight than tabs (pills) — for "Analysis type: Auto / Vision / OCR", "Zoom: Fit / 50 / 100", "View: Design / Compare".

- Container `--surface-2`, `--radius-md`, pad `3px`. Selected `--surface-4` + `--text-primary` + `--shadow-xs`, transition `--dur-2`. Inactive `--text-secondary`.
- `role="radiogroup"` with `role="radio"` items + `aria-checked`; arrow keys move; focus ring on the group.

### 3.22 Command palette (editor)

Radix Command. Floating `--surface-4`, `--shadow-lg`, `--radius-lg`, `--border-subtle`, `max-w-[600px]`. Two zones: input row (search icon + input + `kbd` "esc"/"/") then grouped list. Trigger: `Cmd/Ctrl+K` globally; `/` also opens in editor.

- Input: 44px, `--text-ui-md`, `--font-mono` not required; placeholder "Search layers, actions, colors…".
- Group headers: `--text-ui-xs`, `--text-tertiary`, uppercase.
- Item: 32px, icon 16, label, action-name in `--text-secondary`, pressed `--surface-3`, selected `--accent-subtle` + left 2px `--accent` bar + `--text-primary`.
- Editor index includes: layer search, actions (New Text Layer, Import, Export, Toggle Grid, Fit to Canvas, Toggle Guides), and a palette lookup (type a hex → jump to applying it to selected layer).
- Empty results: "No matches for “X”".

### 3.23 Popover

Radix Popover — lighter than modal; anchored, non-blocking. `--surface-4`, `--shadow-md`, `--radius-md`, `--border-subtle`, 8px offset (16px on flip). Used for: filter menu, color picker on focus, inline export preview, "why this metric" explainer, annotation editor. Esc + outside click to close; `aria-haspopup="dialog"`, focus moves into the popover and returns to trigger on close.

---

## 4. Editor-specific controls

The canvas editor (react-konva, shared-context §17 serializable state) has chrome that differs from the rest of the app. Everything here lives at **compact density** and must never visually compete with the thumbnail.

### 4.1 Toolbar (top chrome)

Fixed top bar, full width, 40px, `--surface-1`, bottom `--border-subtle`. Left-to-right groups separated by `--divider` (1px, 16px tall, `my-auto`):

1. **Brand/back** — ThumbIntel wordmark (Sora, 14px, semibold) + back chevron.
2. **Layers toggle** — icon button (layers, 16px) tooltip "Layers".
3. **Undo / Redo** — icon (arrow-left / arrow-right), disabled when stack empty.
4. **Zoom group** — `−` / current % (`.num`, `--text-ui-sm`) / `+` / divider / `Fit` / `100%`.
5. **Tool group (segmented)** — Select (cursor), Text (type), Shape (square), Color (droplet), each an icon button with `active` state fill `--accent-subtle` + `--text-primary`.
6. **Right cluster** — Guide toggle (layout-grid), Grid toggle (grid), Compare toggle (columns), divider, `Export` (accent `sm` button).

Toolbar buttons are 28px icon buttons (`.icon @ size=sm`). Active tool: `bg-[--accent-subtle] text-[--text-primary]` + left accent bar via inset shadow. Tooltip is always `--text-ui-xs`.

### 4.2 Toolbar button spec (worked element)

| Property | Value |
|---|---|
| Size | 28×28, `--radius-sm` |
| Icon | 16px stroke icon (Lucide) |
| Default | `--text-secondary`, hover `bg-[--surface-2] text-[--text-primary]` |
| Active (toggled tool) | `bg-[--accent-subtle] text-[--text-primary]` + `1px inset border-[--accent]` |
| Disabled | `opacity-40` + `cursor-not-allowed`, keep `--text-secondary` |
| Focus-visible | standard ring |

### 4.3 Layer list (left panel)

240px, `--surface-1`, right `--border-subtle`, scrollable. Item = 36px row.

Anatomy per row: 16px **thumbnail** (rounded `--radius-xs`, 1px `--border-subtle` — the actual mini render), 12px **name** (`--text-ui-smmd`, `--text-secondary`; selected = `--text-primary`), trailing **visibility eye** + **lock** icon buttons (only on hover/selected to reduce noise).

States:
- **Selected**: `bg-[--surface-3]` + left 2px `--accent` bar + `--text-primary`; `aria-selected="true"`.
- **Hidden** (eye off): name `--text-disabled`, thumbnail dimmed 40%.
- **Locked**: lock icon `--accent` (locked = emphasized so you notice); row not selectable for transform (cursor not-allowed on canvas hit).
- **Hover**: `bg-[--surface-2]`.

Row `role="option"` within a `role="listbox"`; ordering mirrors `state.layers[]` (top of list = top of stack). Drag to reorder updates layer z-index.

### 4.4 Properties panel (right)

280px, `--surface-1`, left `--border-subtle`. Scrollable sections (Accordion, §3.20), each `padding 12px`.

Sections (context-driven by selection):
- **Transform**: X, Y, W, H (NumberField), rotation (deg stepper + a small rotate handle on canvas), opacity slider.
- **Typography** (text layer): font family (Select), weight (Select), size (NumberField `px`), line height (NumberField), letter-spacing (NumberField `em`), fill (color picker), stroke (toggle + color + width), align (segmented L/C/R/J).
- **Text content**: textarea (the literal OCR sheet/`string`), editable here.
- **Fill / stroke** (shape): color, opacity, stroke width, radius.
- **Effects**: shadow (toggle + blur + offset + color — careful, minimal), gradient (only for imported/remixed: 2-stop, angle — but note shared-context §3 do not verbatim copy designs; gradient tools only for original user work).
- **Estimate snap**: any `est.`/`~` value shown here echoes the confidence chip.

Properties rows: label left (12px, `--text-tertiary`), control right, 36px row, `--divider` between rows (1px, `--space-3` gutter). Values that are estimates append an `est.` tertiary suffix.

### 4.5 Transform handles

Konva `Transformer` on the selected node. Handles:

- Corners: 10px white squares, `--radius-xs`, 1px `--border-default`, offset outside node. On hover 12px. Resize = corners; rotate = top-center handle (a 16px dashed circle handle).
- Edge handles (midpoints) for 1D stretch (optional per selection).
- Selected-node boundary: dashed `#FF6B47` (accent-400) 1.5px, 8-dash/6-gap, outside the stroke.
- **Corner radius popover** on shape selection.
- Cursors: `nwse-resize`, `nesw-resize` on corner drag; `grab`→`grabbing` on move; `alias` for rotate.

The whole transformer uses `--shadow-glow-accent` lightly on the boundary (only on the selected item — never multiple).

### 4.6 Zoom controls

- Zoom range 10%–400%, default "Fit" (which is computed to fit the 1280×720 semantic grid in the viewport, `fit` caps at 100% max).
- Controls: `−`/`+` icon buttons, % readout (`.num`, `--text-ui-sm`), `Fit` text button, `100%` text button. Group in toolbar §4.1.
- **Zoom to fit** on load. `Cmd/Ctrl + 0` = fit, `Cmd/Ctrl + +/−` = zoom, `Shift + wheel` = zoom (pointer fine).
- Pinch gestures on trackpads; Clamp with a `--text-tertiary` toast at limits ("Max zoom").

### 4.7 Grid / guide / safe-zone overlay styles (must not pollute the canvas)

These are **non-printing** (excluded from export), very low opacity, and only visible when their toggle is on.

| Overlay | Color | Opacity | Style | Purpose |
|---|---|---|---|---|
| Grid | `#9AA5B1` (neutral) | 8% | 1px lines, 32px cell | alignment scaffolding |
| Baseline guide | `#9AA5B1` | 12% | horizontal lines at text baselines | text alignment |
| Center guides | `#FF6B47` (accent-400) | 30% | 1px vertical + horizontal through center | optical center |
| Safe zone | `#F04438` (danger) | 12% fill + 25% border | 5% inset rectangle | CTA/brand safety (YouTube face/UI, corners) |
| Selection boundary | `#FF6B47` | dashed 90% | around selected node | editing affordance |

Any toggle ON adds a faint, brief (~150ms) cross-sample so the user knows it's on, but no flashy fade-in. Guides are **disabled on export** and never serialized into the design document state (§17 — serializable editor state = content only, not chrome).

### 4.8 Compare slider handle

Original vs recreated/optimized. Two images overlaid, clipped by the handle.

- Handle: 44px grabber circle, `--surface-4`, `--shadow-md`, `--radius-full`, 1px `--border-strong`, centered vertical draggable line 2px `--accent`. Left/right chevrons inside the handle.
- Labels pinned top-left ("Original") / top-right ("Remix") — 12px, `--text-ui-xs`, on a `--surface-overlay` pill (`--radius-sm`, `--text-primary`).
- Pointer cursor: `ew-resize`. `aria-valuenow` on a `role="slider"` for the overlay position. Arrow keys move the divider.
- Only animates on initial reveal (a 200ms ease-out swipe) — then fully manual.

### 4.9 Color-picker accent swatches (as used in the editor)

The recomposition accent palette (the exact hue range the brand uses to tint CTAs in a recreated thumb). This palette is offered as ready swatches in the editor for the user's own art.

```
#FF4D2E  →  #E23A1E  →  #B9341C
#FF6B47  →  #FF8D6E  →  #FFB7A4
#0B0D10  →  #11151A  →  #232B34
```

Each swatch 20×20 `--radius-xs`, tooltip with hex, selected `--shadow-glow-accent`. These are *brand*-family, not a claim the thumbnail must use them — editing a recreated thumb is the user's original work; the palette is a starting point.

---

## 5. Data visualization

Rules: no rainbow. One accent + derived neutrals. Series color is **consistent** for a given metric across every chart type. Patterns (hatching) accompany color for accessibility. Every chart has an `aria-label` and a text-equivalent.

### 5.1 Series palette (locked)

| Index | Metric | Color (dark) | Color (light) | Pattern |
|---|---|---|---|---|
| 1 | Scores overall / accent | `#FF4D2E` `--accent` | `#E23A1E` | solid |
| 2 | Text clarity | `#F5A623` `--warning` | `#D97706` | 45° hatch |
| 3 | Color contrast | `#2E90FA` `--info` | `#1570EF` | dots |
| 4 | Composition / focus | `#4C9EEB` | `#1D4ED8` | vertical lines |
| 5 | Object clarity | `#2FBF71` `--success` | `#158756` | horizontal lines |
| 6 | Brand recall | `#9D6BFF` (derived violet) | `#7C3AED` | cross-hatch |
| 7 | Readability | `#E5484D` `--danger` | `#B91C1C` | 60° hatch |

> Notice: metric 1 is the brand accent; metrics 2–7 re-use the existing semantic hues (warning/info/success/danger) plus exactly one derived violet for breadth. No new rainbow. Pattern differences carry meaning independently of color (accessibility).

### 5.2 The score ring / gauge

The hero metric — a 128px **progress ring** (SVG stroke, not a canvas image so it stays crisp + accessible).

- Ring: track stroke `--surface-4` (16px), progress `--accent` (16px), `stroke-linecap="round"`, animate `stroke-dashoffset` once over `--dur-5` on mount (reduced-motion → no animation).
- Center: big score in Sora `--text-display-score` `.num` + label `/100` tertiary + a confidence chip below.
- Under `~80` show `(est.)` in the sub-label ONLY if the underlying score is an estimate (scoring is partly heuristic per §8 — all AI-derived metrics are `est.`). Actually show **score is deterministic where possible**, but OCR text confidence and vision-derived metrics are estimates — the chip communicates that.
- Threshold color reflects score: `0–39` `--danger`, `40–69` `--warning`, `70–100` `--accent`. (Brand accent for good; degrades to warning/danger for low.)
- Beneath the ring, 7 small metric ticks.

Accessibility: `role="img"` with `aria-label="Overall score 82 out of 100."`; a visible text equivalent. No color-only meaning — the number is present.

### 5.3 Radar chart (7 metrics)

Spider/polygon of the 7 metrics, scaled 0–100.

- Ring layers: 4 concentric polygons at 25/50/75/100, stroke `--surface-4`, labels at each vertex (`--text-ui-xs`, `--text-tertiary`).
- Data polygon: fill `--accent` at 18% opacity, stroke `--accent` 2px. Vertex dots `--accent` 4px. A second series (optional compare: current vs benchmark) is a dashed `--info` polygon.
- 7 axes → use a heptagon (odd count) — no vertical axis. Rotate started at top.
- Empty/low: if a metric is missing (e.g., no text detected → `n/a`), render the vertex at 0 and label it `n/a` (`--text-tertiary`), don't omit the axis — keeps structure and truthfulness.
- Labels use abbreviations + tooltip full name. `aria-label` summarises: "Readability 82, Color contrast 74, …". A table fallback to the right lists the exact numbers.

### 5.4 Horizontal bar breakdown

Ranked per-metric bars. Each row: metric label (left), bar (middle), value (right, `.num`).

- Track `--surface-4`, fill = metric's series color, rounded `--radius-sm`, height 8px (app) / 6px (editor-compact). Animate width once on mount (in-out `--dur-5`).
- **Benchmark marker**: a 2px `--text-tertiary` vertical line at the "good threshold" (e.g., `70`) with a legend note. Value bars that fall below threshold get a `--warning`/`--danger` value label; above use `--text-primary`.
- Low state: value `n/a` → bar track full-width dimmed, label + `n/a` (`--text-tertiary`), with an info tooltip "Not enough text to score." (again the honest-estimate principle).

### 5.5 Sparklines (usage / recency)

Use in "usage this week", monthly active, export volume. Tiny line chart 24–32px tall.

- Stroke 1.5px `--accent` (single series) or metric color; baseline `--surface-4`; area fill `--accent` at 10% opacity.
- Last point = 3px dot. No gridlines, no y-axis labels (tooltip on hover shows the value). `aria-label` = [`X to Y`, min/max]. Empty → just baseline.

### 5.6 Gridlines, labels, accessibility (all vizzes)

- **Gridlines** `--surface-4`, 1px, only where they guide (axis), never on sparklines.
- **Labels** always `--text-ui-xs`/`--text-ui-sm`, `--text-tertiary`, left-aligned for text, right-aligned for numbers.
- **Contrast**: chart strokes ≥ 1.5px and ≥ 3:1 vs surface. Data colors ≥ 3:1.
- **Patterns** (hatch/dot/cross) applied per series above so color-blind users can disambiguate.
- **Text equivalent** required for ring, radar, and bar chart (number list). Sparklines get a summary value instead.
- Animations: single mount only, `--dur-5`, reduced-motion → static.

---

## 6. Iconography

- **Set:** Lucide only (stroke-based, 24px grid, `stroke-linecap="round"`, `stroke-linejoin="round"`). No mixed icon sets. shadcn/ui ships Lucide-compatible.
- **Size scale:** `16` (inline/panel/menu/toolbar), `20` (controls, tabs), `24` (standalone, empty-state hero, brand-adjacent). Editor chrome heavily uses 16.
- **Stroke width:** default `2`; `1.5` for large decorative; `2` always for @16. Never `3`.
- **Color:** `currentColor` — icon color comes from parent `--text-*`; `--text-secondary` default, `--text-primary` when active/primary. Accent only where semantically important (active tool, warning).
- **Usage rules:**
  - Icon-only controls MUST have `aria-label` + tooltip (§3.11).
  - No decorative icons on every line; icons imply function.
  - Micron icons (status dots, checks) switch to `--text-secondary`.
- **Editor icon mapping** (all Lucide): layers, undo/redo, cursor/`MousePointer2`, `Type`, `Square`, `Palette`/`Droplet`, `LayoutGrid` (guide), `Grid`, `Columns2` (compare), `Eye`/`EyeOff`, `Lock`, `SlidersHorizontal` (props), `ChevronDown/Left/Right`, `Search`, `Plus`, `Minus`, `Upload`, `Download`, `Copy`, `Trash2`, `Sparkles` (remix), `AlertTriangle`, `Check`, `X`, `Info`.
- **Brand mark:** The wordmark is Sora, and a tiny 16px mark (a stylized play-thumbnail glyph, currently placeholder) is accent `--accent` only — never multi-color.

---

## 7. Motion

### 7.1 Principles

- **Minimal + purposeful.** Animate state *change*, not habit. No decorative loops, no floats, no particles, no glow pulses.
- Every animated property is a **state transition**.
- **Default durations:** 100–200ms UI, 300ms overlays. Score ring and bars get a one-time 500ms entrance.
- **Easings:** `--ease-standard` for UI; `--ease-in-out` for overlays/full movement; `--ease-out` for entrances and score fills.

### 7.2 Allowed animations

| Element | Property | Duration | Easing | Notes |
|---|---|---|---|---|
| Button hover | background-color | `--dur-1` | standard | no transform |
| Focus ring | outline (alpha) | `--dur-1` | standard | instant is fine |
| Input focus | border-color | `--dur-1` | standard | |
| Tabs/segment | background + color | `--dur-2` | standard | moving indicator uses a shared-layout animation only if cheap; else cross-fade |
| Tooltip | opacity | `--dur-2` | standard | + 300ms delay |
| Dropdown/menu/popover | opacity + scale(0.98→1), translateY(4→0) | `--dur-3` | in-out | overlay |
| Modal scrim | opacity | `--dur-4` | in-out | |
| Modal panel | opacity + translateY(8→0) | `--dur-4` | in-out | |
| Command palette | opacity + translateY(4→0) | `--dur-4` | in-out | |
| Accordion | height/opacity | `--dur-3` | standard | |
| Switch | background + thumb transform | `--dur-1` | standard | |
| Score ring | stroke-dashoffset | `--dur-5` | out | one-shot |
| Charts (bar/radar/ring) | size + fill/stroke | `--dur-5` | out | one-shot on mount |
| Compare reveal | clip | `--dur-3` | out | initial only |
| Toast | translateY + opacity | `--dur-3` | in-out | dismiss |
| Skeleton | opacity pulse | 1200ms | — | disabled under reduced-motion |

### 7.3 Forbidden

- Infinite spin/pulse beyond a **loading spinner** (spinners ARE the exception; they must be a real `aria-labelledby`/`aria-label` "Loading").
- Hover-scale on buttons/cards (a subtle `translateY(-1px)` on raised cards is acceptable; do NOT enlarge).
- Floating logos, parallax, scrub-scroll on marketing (keep the homepage and landing page calm).
- Color flash/confetti on score reveal. The score reveal is a single ring sweep.

### 7.4 Reduced motion

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.001ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.001ms !important;
    scroll-behavior: auto !important;
  }
}
```

Under reduced-motion: score ring and charts render *instantly at final value*; overlays appear without translate; the skeleton pulse becomes a static dim block; any still-useful pointer (navigational arrow, not a flash) is fine. The compare swipe reveals immediately.

---

## 8. Typography application rules

### 8.1 Marketing (display) vs app (UI)

| Context | Family | Level | Notes |
|---|---|---|---|
| Marketing hero, section H1–H3, feature titles, big CTA | **Sora** (`--font-display`) | `--text-display-lg/xl`, `--text-display-md` | Tight letter-spacing −0.02 to −0.03em. Confident, premium. |
| Marketing body | **Inter** | `--text-ui-lg`/`--text-ui-md` | Comfortable line-height 1.5. |
| App panel titles, metric numerals, score ring | **Sora** | `--text-display-xs/sm`, `--text-display-metric/score` | Score uses tabular-nums. |
| App controls, labels, table cells, UI body | **Inter** | `--text-ui-*` | Compact, 13px default. |
| Estimates `~`, hex codes, OCR text readouts, keybind hints, IDs | **Mono** | `--font-mono` | `~82%`, `#FF4D2E`, `Montserrat`. |

### 8.2 Heading hierarchy

- Marketing: H1 `--text-display-xl`, H2 `--text-display-lg`, H3 `--text-display-md`, H4 `--text-display-sm`. Rendered with proper `<h1..h4>` in DOM (SEO, shared-context §19 clusters).
- App: panel section titles = `--text-display-xs` (or a styled `<h3>`); metric labels + values; the score ring headline = `--text-display-score`.
- Never skip levels; never use color alone to denote a heading.

### 8.3 Body text

- `--text-ui-md` (14/20), `--text-secondary`. Product/analysis prose and empty/error copy use `--text-ui-lg`.
- Max line length ~ 60ch (measure) for prose paragraphs in cards/empty states.

### 8.4 Tabular numbers

`.num` always on: score numerals, per-metric numbers, usage totals, table numeric columns, ratio figures, export stats, zoom %, percentages. `font-variant-numeric: tabular-nums`. Improves alignment + prevents jitter during count-up (which is only used for score ring/bar reveal and is tabular).

---

## 9. Dark / light theme strategy

### 9.1 Default + toggle

- **Dark is the default and canonical.** The app root renders `<html class="dark">` by default.
- User can toggle **Light / Dark / System** in Settings (a segmented control) and via a quick `<button>` in the account menu. Stored in a user preference (and a cookie for the public marketing site).
- **OS preference** (`prefers-color-scheme`) is honored only when the setting is `System` (default). A small inline script on `<head>` reads the cookie (+ `matchMedia`) and sets `.dark`/removes it *before first paint* to avoid a flash — the classic pattern. Respect an explicit per-user override over the OS.
- Persisted per user in `preferences.theme` (Prisma, shared-context §16) with default `system`.

### 9.2 How tokens swap

No JS re-writes for colors. Two scopes:

```css
:root { /* LIGHT values — all --surface-*, --text-*, --border-* light tokens */ }
.dark { /* DARK values — all dark tokens, overrides :root */ }
```

Components ONLY reference semantic tokens (`--accent`, `--surface-2`) — never raw hex. Flipping `<html>`'s `class` cleanly re-themes everything. Any component that defines a raw color inline is a bug (lint rule `no-raw-color-fn`/eslint guard in the repo).

### 9.3 What stays constant across themes

- **Working set is constants, only appearance changes.** Service/Epoch that the *editor document model* (§17) never carries theme — the canvas, the exported PNG, and the final design are **independent of app chrome theme**. A thumbnail the user made looks identical in light or dark chrome (this is critical: the artwork is not theme-affected).
- Fonts, radii, spacing, z-index, motion durations, icon set: identical.
- **Accent value differs** (dark `#FF4D2E` vs light `#E23A1E`) for contrast, but the *brand* is single-accent in both.
- Score / chart series colors differ per theme (per §5.1) but the *order + pattern* is identical, so meaning does not shift.
- Shadcn/radix focus ring and keyboard interaction: identical.
- The editor viewport background (`--canvas-editor`) differs so the canvas remains legible, but the *thumbnail/clip area* itself is never tinted.

### 9.4 Light-mode guardrails

Light is a secondary citizen (and default off for the app). No `theme="light"`-only features. Marketing default is light; app default is dark. If a marketing page needs dark (a feature deep-dive), it scopes `.dark` to that section and resets.

---

## 10. Worked component examples

### 10.1 Analysis Score Card

**Purpose:** the primary read-out after a thumbnail analysis. Shows the overall estimated score + 7 metric bars + confidence. Two-column card on desktop, stacked on mobile.

**Anatomy (grid: `grid-cols-[auto_1fr]`):**
- Left: `ScoreRing` (128px, §5.2) on `--surface-2`-tinted circle well.
- Right column: header row `Analysis complete` (title `--text-display-xs`) + a `StageBadge` (`completed`) + a `ConfidenceChip` (`high`); then the metric bar breakdown (`MetricBar` × 7, §5.4); then the 4-line determinant summary ("Text clarity: excellent, Color contrast: good, Composition: busy…") in `--text-secondary`.
- Footer: a ghost "View details" button toggles the metrics-tab modal, plus an accent "Open in editor" button.

```tsx
// conceptual composition (real identifiers)
<Card size="md">
  <CardHeader slotRight={<StageBadge status="completed" />} title="Analysis complete" />
  <div className="grid grid-cols-[auto_1fr] gap-8">
    <ScoreRing value={82} confidence={{tier:'high', value:0.92}} size={128} />
    <div className="flex flex-col gap-3">
      {metrics.map(m => <MetricBar key={m.id} metric={m} benchmark={70} />)}
    </div>
  </div>
  <CardFooter>
    <p className="text-[var(--text-secondary)]">{verdictSentence}</p>
    <div className="flex justify-end gap-2">
      <Button variant="ghost" size="sm">View metrics</Button>
      <Button variant="accent" size="sm">Open in editor</Button>
    </div>
  </CardFooter>
</Card>
```

**States:**
- **Loading:** score ring renders a skeleton circle + 7 skeleton bars (`.skeleton`), `aria-busy="true"`, label "Analyzing thumbnail…".
- **Empty:** no analysis yet → `EmptyState` (icon `ImagePlus` + "Analyze a thumbnail to score it." + accent CTA).
- **Error (stage=failed):** ErrorCard with the stage in the detail, Retry stage button.
- **Partial (stage=partial):** a `--warning` stripe — "OCR could not read all text (est.); score is partial." and the affected metric shows `n/a`, confidence `low`.
- **Completed:** full rendering.

**Accessibility:** ScoreRing `role="img"` `aria-label="Overall score 82 out of 100"`; the 7 bars duplicated as a text `<dl>` (screen-reader-equivalent) with `<dt>` metric / `<dd>` value; all numeric = `.num`; the confidence chip conveys estimate nature (`~` + `(est.)` + tier) so no one mistakes an estimate for a measurement (shared-context §3 + §12).

### 10.2 Editor Toolbar

**Purpose:** the primary editor chrome, described in §4.1. Full anatomy + states below.

**Anatomy (HTML order):**

```
┌─ Toolbar (h-10, surface-1, border-b, radius 0) ────────────────────────────────┐
│  <brand> │ <layers> │ <undo> <redo> │ <−> 100% <+> │ Fit │ 100% │ :: │ tools │ :: │ <guide><grid><compare> │ <Export> │
└────────────────────────────────────────────────────────────────────────────────┘
```

**Container spec:**

```tsx
<Toolbar as="header" className="h-10 shrink-0 border-b border-[var(--border-subtle)] bg-[var(--surface-1)] px-2 flex items-center gap-1">
  {/* groups separated by <Divider /> = 16px tall 1px --divider */}
</Toolbar>
```

**States per control (all 28×28 icon buttons / sm buttons):**
- Undo/Redo: disabled when stack empty → `opacity-40`, `cursor-not-allowed`, still readable; enabled `--text-secondary` → hover `--surface-2`/`--text-primary`.
- Zoom group: `−`/`+` icon buttons; the % readout `--text-ui-sm` `.num` `min-w-[3ch]` (no layout jump as digits change); `Fit` and `100%` are ghost `sm` buttons; active zoom state shown only in the numbers.
- Tool group (Select/Text/Shape/Color segmented): active tool has `bg-[--accent-subtle] text-[--text-primary]` + inset accent bar; inactive `--text-secondary`; the group has `aria-label="Tools"` and `aria-pressed` per button (`role="group"` of toggle buttons); arrow keys navigate, single-select radio semantics (see §3.21).
- Guide/Grid/Compare toggles: `aria-pressed` toggle white/color; ON = `--accent-subtle` + `--text-primary`; OFF = `--text-secondary`. All transient-visible only.
- Export (accent, `sm`, `h-7`): loading state swaps to spinner with locked width via `aria-busy`; disabled when no layers or save-in-flight (`disabled`).

**Accessibility:**
- The toolbar is `role="toolbar"` with single-tab stop; arrow keys move between controls; each icon button has `aria-label` + tooltip.
- `Cmd/Ctrl+K` opens the command palette (§3.22) which can reach every toolbar action — keyboard-complete even if pointer tools are heavy.
- Compare toggle has a live label "Compare on/off".

**Reduced-motion:** no ambient animation anywhere; tool switch is an instant color change; zoom is instant (no fly to next).

---

## 11. Token + component QoL (build conventions)

- **Primitives never used directly:** components consume semantic tokens. eslint `no-restricted-syntax` blocks `--palette-*` outside `globals.css`.
- **`@theme` mapping:** all semantic tokens also exposed as Tailwind utilities for ergonomics (e.g., `bg-surface-2`, `text-secondary`, `border-subtle`, `rounded-md`) via `@theme inline` — the exact utility names follow shadcn/ui v4 conventions.
- **One source:** `app/globals.css` is the only file that defines `:root`/`.dark`. All tokens documented here are shipped verbatim there.
- **Component conventions:** each `ui/*.tsx` = `cva()` base + variants + states + an `*.stories.tsx` for Playwright-visual + `*.test.tsx` for Vitest/RTL (per shared-context §5/§15 skeleton). Every component ships a disabled state where semantically valid.

---

## 12. Conformance checklist (shared-context §12 + §3)

- [ ] Estimates never presented as measurements: `~` prefix + `(est.)` label + confidence chip (high/medium/low). Applies to OCR text confidence, vision-detected objects, any AI metric. Scores from the deterministic engine (§8) are reported without `est.` when they are deterministic; the UI is explicit about which is which.
- [ ] Every important action has loading / success / empty / error states (buttons, analysis, export, save, transfer).
- [ ] Stage statuses exactly: `pending | queued | running | completed | failed | partial` (§12). `partial` renders a `--warning` treatment (never a false "completed").
- [ ] Error envelope consumed: `{ error: { code, message, details? } }` rendered as ErrorCard / banner; retry where `details.retryable`.
- [ ] No verbatim copying of copyrighted designs — the recreation tool produces an *editable* derivative for the user's own art + a text/typographic analysis; it is not a copyrighted-design clone. The wordmark and remake affordances are neutral. (See product-principles §3.)
- [ ] Server-side secrets only; no theme/token value leaks security.
- [ ] Editor state is serializable (§17): guide/grid toggles are chrome, excluded from the design document.
- [ ] WCAG AA: text ≥ 4.5:1 (large/UI ≥ 3:1), charts ≥ 3:1, focus ring ≥ 3:1, patterns + labels for color independence.
- [ ] Zod validation on all editor property changes and export config (input symmetry with §14 API schemas).

---

## 13. Appendix: Quick reference tables

### 13.1 Core tokens cheat sheet

| Category | Tokens |
|---|---|
| Surfaces (dark) | `--surface-1 #0B0D10` · `-2 #11151A` · `-3 #161C23` · `-4 #1C232C` · `--canvas-editor #060709` |
| Text (dark) | `--text-primary #F6F7F8` · `-secondary #AFB6BE` · `-tertiary #7D8790` · `-disabled #4B5560` |
| Accent | `--accent #FF4D2E` (dark) / `#E23A1E` (light) · hover · pressed · subtle · soft · on-accent |
| Semantic | `--success #1FA968` · `--warning #F59E0B` · `--info #2E90FA` · `--danger #E5484D` + `-strong` |
| Radius | `--radius-xs 4` · `-sm 6` · `-md 8` · `-lg 12` · `-xl 16` · `-full 9999` |
| Durations | `--dur-1 100` · `-2 150` · `-3 200` · `-4 300` · `-5 500` ms |
| Easing | `--ease-standard` · `--ease-in-out` · `--ease-out` |
| Z-index | `--z-base 0` · `-raised 10` · `-dropdown 30` · `-overlay 40` · `-modal 50` · `-toast 60` · `-tooltip 70` |

### 13.2 Control heights (per density)

| Control | Editor (compact) | App (default) | Marketing |
|---|---|---|---|
| Button | 28 | 36 | 48 |
| Input | 28 | 36 | 48 |
| Icon button | 24 | 32 | 40 |
| Toolbar row | 40 | — | — |
| Layer row | 36 | — | — |
| Table row | 36 | 40 | — |

---

*End of document. Status `completed`. Build agents: start from `app/globals.css` tokens, then `@/components/ui/*`, then the editor chrome, then viz. Do not add a raw color outside the token files.*
