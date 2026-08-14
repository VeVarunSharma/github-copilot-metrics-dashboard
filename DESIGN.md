---
version: 1.0
name: github-copilot-metrics-dashboard-brand
description: >-
  Copilot Metrics Dashboard's design system, derived from the official GitHub brand
  (brand.github.com). A neutral-anchored, technical, developer-native system
  where green-tinted grays and near-black do the structural work and a single
  hero — GitHub Green — carries the brand. Because Copilot Metrics Dashboard is a Copilot
  value dashboard, we adopt GitHub's Copilot Theme: Copilot Purple is the
  signature accent reserved for Copilot-attributed data, and Security Blue is a
  rare accent for security-attributed remediation. Type is Mona Sans and Mona
  Sans Mono (SIL OFL, self-hosted — aligns with our OSS-first constitution).
  Dark mode is first-class. The product UI itself is the argument: dense,
  legible, honest dashboards with a "How is this calculated?" affordance on
  every derived number.

colors:
  # ── Core brand — GitHub Green (the single hero) ──────────────────────────
  primary: "#08872B"               # canonical action/CTA color (== brand-green)
  primary-deep: "#0D6731"          # pressed action state (== brand-green-deep)
  brand-green: "#08872B"           # green-6 · iconic GitHub Green (swatch/wordmark accent)
  brand-green-emphasis: "#0FBF3E"  # green-5 · brighter fill / hover / success emphasis
  brand-green-deep: "#0D6731"      # green-7 · accessible accent + pressed state on light
  brand-green-bright: "#23EA57"    # green-4 · dark-mode fill / accent
  brand-green-mint: "#8CF2A6"      # green-2 · dark-mode accent text + chart lines
  brand-green-subtle: "#EBF9F4"    # green-0 · tinted success/brand background (light)

  # ── Copilot Theme — Purple (accent for Copilot-attributed data) ──────────
  copilot-purple: "#8534F3"          # purple-5 · Copilot-attributed accent (light)
  copilot-purple-emphasis: "#6619E1" # purple-6 · hover / pressed
  copilot-purple-bright: "#B870FF"   # purple-3 · dark-mode accent
  copilot-purple-subtle: "#F0E5FF"   # purple-0 · tinted Copilot background (light)

  # ── Security Theme — Blue (rare, security-attributed only) ───────────────
  security-blue: "#0377FF"           # blue-5
  security-blue-emphasis: "#0055D5"  # blue-6
  security-blue-subtle: "#DDF4FF"    # blue-0

  # ── Links (GitHub keeps green for brand/CTA; links are blue) ─────────────
  link: "#005DD5"
  link-dark: "#8DD6FF"

  # ── Neutrals · GitHub gray (green-tinted) — LIGHT ────────────────────────
  ink: "#191F1B"            # gray-9 · default body text (near-black, green-tinted)
  ink-black: "#000000"      # black-0 · max-emphasis headline / hero only
  ink-secondary: "#353D37"  # gray-8 · strong secondary text
  ink-muted: "#58635B"      # gray-7 · secondary / helper text
  ink-subtle: "#77827A"     # gray-6 · tertiary / captions / axis labels
  ink-disabled: "#96A199"   # gray-5 · disabled / placeholder
  canvas: "#FFFFFF"         # white · page background (light)
  canvas-subtle: "#F2F5F3"  # gray-0 · alternating band / inset panel
  canvas-inset: "#E4EBE6"   # gray-1 · deeper inset / table zebra / code strip
  hairline: "#C4CCC6"       # gray-3 · default 1px border
  hairline-muted: "#E4EBE6" # gray-1 · subtle divider
  hairline-strong: "#B6BFB8" # gray-4 · emphasized border

  # ── Neutrals — DARK (GitHub-dark, product-adapted) ───────────────────────
  # Brand marketing uses pure black (#000000) as the dark canvas. For a data
  # dashboard we lift it to a near-black green-tinted canvas to reduce OLED
  # smear and let elevated surfaces read; pure black is reserved for hero bands.
  canvas-dark: "#0B0F0C"          # product base canvas (dark)
  canvas-dark-elevated: "#191F1B" # gray-9 · cards / panels / popovers
  canvas-dark-subtle: "#12160F"   # slightly-lifted band under canvas
  canvas-dark-inset: "#000000"    # black-0 · code blocks / deepest inset
  hairline-dark: "#353D37"        # gray-8 · default border (dark)
  hairline-dark-muted: "#26302A"  # subtle divider (dark)
  ink-on-dark: "#F2F5F3"          # gray-0 · body text on dark
  ink-on-dark-emphasis: "#FFFFFF" # max-emphasis on dark
  ink-on-dark-muted: "#B6BFB8"    # gray-4 · secondary on dark
  ink-on-dark-subtle: "#96A199"   # gray-5 · tertiary / axis on dark

  # ── On-color text (white on filled brand surfaces) ──────────────────────
  on-green: "#FFFFFF"       # white on green-6/green-7 fill (passes AA)
  on-purple: "#FFFFFF"      # white on purple-5/6 fill
  on-invert: "#FFFFFF"      # white on near-black invert surface

  # ── Semantic status ─────────────────────────────────────────────────────
  success: "#0FBF3E"        # green-5
  success-subtle: "#EBF9F4" # green-0
  warning: "#B85B06"        # orange-5
  warning-subtle: "#FFF1E5" # orange-0
  danger: "#CF2230"         # red-5
  danger-subtle: "#FFEBE9"  # red-0
  info: "#0377FF"           # blue-5

  # ── Categorical chart ramp (10 hues from GitHub secondary scales) ────────
  # Ordered for maximum adjacent-hue separation + colorblind awareness.
  chart-1: "#0FBF3E"        # green-5  · brand / value
  chart-2: "#8534F3"        # purple-5 · Copilot
  chart-3: "#0377FF"        # blue-5   · security / info
  chart-4: "#DA7210"        # orange-4
  chart-5: "#23B1AE"        # teal-4
  chart-6: "#EF2AA4"        # pink-5
  chart-7: "#4956E5"        # indigo-5
  chart-8: "#698E17"        # lime-6
  chart-9: "#E13F1B"        # coral-5
  chart-10: "#BE7D00"       # yellow-5

  # ── Chart semantic reservations ─────────────────────────────────────────
  chart-value: "#0FBF3E"    # brand green · headline $ / hours saved series
  chart-copilot: "#8534F3"  # Copilot purple · Copilot-attributed series
  chart-baseline: "#77827A" # gray-6 · non-Copilot baseline series
  chart-fail: "#CF2230"     # red-5 · failures / incidents
  chart-restore: "#DA7210"  # orange-4 · restore / MTTR

typography:
  display-xxl:
    fontFamily: "'Mona Sans', ui-sans-serif, system-ui, 'Segoe UI', Helvetica, Arial, sans-serif"
    fontSize: 60px
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: -0.03em
  display-xl:
    fontFamily: "'Mona Sans', ui-sans-serif, system-ui, 'Segoe UI', Helvetica, Arial, sans-serif"
    fontSize: 44px
    fontWeight: 700
    lineHeight: 1.08
    letterSpacing: -0.025em
  display-lg:
    fontFamily: "'Mona Sans', ui-sans-serif, system-ui, 'Segoe UI', Helvetica, Arial, sans-serif"
    fontSize: 32px
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: -0.02em
  display-md:
    fontFamily: "'Mona Sans', ui-sans-serif, system-ui, 'Segoe UI', Helvetica, Arial, sans-serif"
    fontSize: 24px
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: -0.015em
  heading-lg:
    fontFamily: "'Mona Sans', ui-sans-serif, system-ui, 'Segoe UI', Helvetica, Arial, sans-serif"
    fontSize: 20px
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: -0.01em
  heading-md:
    fontFamily: "'Mona Sans', ui-sans-serif, system-ui, 'Segoe UI', Helvetica, Arial, sans-serif"
    fontSize: 16px
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: 0
  body-lg:
    fontFamily: "'Mona Sans', ui-sans-serif, system-ui, 'Segoe UI', Helvetica, Arial, sans-serif"
    fontSize: 18px
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: 0
  body-md:
    fontFamily: "'Mona Sans', ui-sans-serif, system-ui, 'Segoe UI', Helvetica, Arial, sans-serif"
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0
  body-sm:
    fontFamily: "'Mona Sans', ui-sans-serif, system-ui, 'Segoe UI', Helvetica, Arial, sans-serif"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0
  label:
    fontFamily: "'Mona Sans', ui-sans-serif, system-ui, 'Segoe UI', Helvetica, Arial, sans-serif"
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1.0
    letterSpacing: 0.01em
  caption:
    fontFamily: "'Mona Sans', ui-sans-serif, system-ui, 'Segoe UI', Helvetica, Arial, sans-serif"
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.45
    letterSpacing: 0
  eyebrow:
    fontFamily: "'Mona Sans', ui-sans-serif, system-ui, 'Segoe UI', Helvetica, Arial, sans-serif"
    fontSize: 12px
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: 0.06em
  micro:
    fontFamily: "'Mona Sans', ui-sans-serif, system-ui, 'Segoe UI', Helvetica, Arial, sans-serif"
    fontSize: 12px
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: 0.01em
  code:
    fontFamily: "'Mona Sans Mono', ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace"
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0

rounded:
  xs: 4px
  sm: 6px
  md: 8px
  lg: 12px
  xl: 16px
  2xl: 24px
  full: 9999px

spacing:
  xxs: 2px
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  2xl: 32px
  3xl: 48px
  huge: 64px

components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-green}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: 8px 16px
  button-primary-pressed:
    backgroundColor: "{colors.primary-deep}"
    textColor: "{colors.on-green}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: 8px 16px
  button-secondary:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: 8px 16px
  button-invisible:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink-muted}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: 8px 12px
  button-danger:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.danger}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: 8px 16px
  card:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.body-md}"
    rounded: "{rounded.lg}"
    padding: 24px
  card-dark:
    backgroundColor: "{colors.canvas-dark-elevated}"
    textColor: "{colors.ink-on-dark}"
    typography: "{typography.body-md}"
    rounded: "{rounded.lg}"
    padding: 24px
  kpi-tile:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.display-md}"
    rounded: "{rounded.lg}"
    padding: 20px
  label-neutral:
    backgroundColor: "{colors.canvas-subtle}"
    textColor: "{colors.ink-muted}"
    typography: "{typography.micro}"
    rounded: "{rounded.full}"
    padding: 2px 8px
  label-green:
    backgroundColor: "{colors.brand-green-subtle}"
    textColor: "{colors.brand-green-deep}"
    typography: "{typography.micro}"
    rounded: "{rounded.full}"
    padding: 2px 8px
  badge-copilot:
    backgroundColor: "{colors.copilot-purple-subtle}"
    textColor: "{colors.copilot-purple-emphasis}"
    typography: "{typography.micro}"
    rounded: "{rounded.full}"
    padding: 2px 8px
  nav-sidebar-item:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink-muted}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    padding: 8px 12px
  nav-sidebar-item-active:
    backgroundColor: "{colors.canvas-subtle}"
    textColor: "{colors.ink}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    padding: 8px 12px
  text-input:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.body-md}"
    rounded: "{rounded.sm}"
    padding: 8px 12px
  code-block:
    backgroundColor: "{colors.canvas-dark-inset}"
    textColor: "{colors.ink-on-dark}"
    typography: "{typography.code}"
    rounded: "{rounded.md}"
    padding: 16px
  how-calculated:
    backgroundColor: "{colors.canvas-subtle}"
    textColor: "{colors.ink}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    padding: 16px
  tooltip:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.on-invert}"
    typography: "{typography.caption}"
    rounded: "{rounded.sm}"
    padding: 6px 10px
---

## Overview

Copilot Metrics Dashboard's design system is a faithful application of the **GitHub brand** (see [brand.github.com](https://brand.github.com)) to a self-hosted analytics product. The brand's thesis is restraint: **neutrals do the structural work, and a single hero — GitHub Green (`{colors.brand-green}` `#08872B`) — carries the identity.** GitHub describes the intended feeling as *technical, sophisticated, serious, and uncomplicated*. Our dashboards inherit that posture directly.

Three things make this brand unmistakably GitHub, and we honor all three:

1. **Green-tinted neutrals.** GitHub's grays are not pure — they carry a faint green cast (`{colors.ink}` `#191F1B` → `{colors.canvas-subtle}` `#F2F5F3`). This subtle warmth is a brand fingerprint. We never substitute a pure/cool gray ramp.
2. **A disciplined color budget.** In GitHub's own guidance a surface is ~80% black/white/neutral, ~10% neutral chrome, and only ~5% green with ~5% themed accent. Color is an *event*, not a wash.
3. **Product UI is the argument.** GitHub markets itself by showing honest, dense product surfaces. For us that is literal: the dashboard *is* the brand artifact, so legibility and defensible numbers outrank decoration.

Because Copilot Metrics Dashboard exists to tell a **Copilot value story**, we adopt GitHub's **Copilot Theme**: purple (`{colors.copilot-purple}` `#8534F3`) is thoughtfully injected to mark Copilot products and, for us, **Copilot-attributed data**. This is not decorative — it makes Constitution Principle 9 (Transparent Methodology) visible: Copilot-attributed series read purple, non-Copilot baselines read neutral. GitHub's **Security Theme** blue (`{colors.security-blue}` `#0377FF`) is held in reserve for the rare security-attributed module.

Type is **Mona Sans** (UI + display) and **Mona Sans Mono** (code) — GitHub's own typefaces, released under the SIL Open Font License, so self-hosting them is fully compatible with our OSS-first constitution (Principle 10). Mona Sans is self-hosted today; Mona Sans Mono has no public OSS release yet, so code falls back to a system-mono stack until it ships. **Dark mode is first-class**, not an afterthought — this is GitHub.

**Key characteristics**
- Single green hero; everything else is a green-tinted neutral ladder from `{colors.canvas}` white to `{colors.ink-black}` black.
- Copilot Purple as the *only* recurring second color, reserved semantically for Copilot-attributed value.
- Mona Sans at weight 600–700 for display with tight negative tracking; 400 for body.
- 6px signature radius on buttons/inputs; 12px on cards. Square-ish, technical — never fully pill except tags/avatars.
- Blue inline links; green stays reserved for brand and primary actions.
- Every derived number ships a **"How is this calculated?"** affordance (Principle 1).
- No leaderboards, no per-developer rankings — the design surfaces org/team aggregates only (Principle 2).

## Brand & Design Principles

These are the visual-layer principles. They serve — and never override — [`specs/CONSTITUTION.md`](./specs/CONSTITUTION.md).

1. **Neutral-anchored.** Default to the green-tinted neutral ladder. Introduce color only to signal meaning. If a screen looks mostly black-and-white with small moments of green, it is correct.
2. **Green is the hero; spend it sparingly.** `{colors.brand-green}` is for the primary CTA, brand marks, the value/headline chart series, and success. One primary green action per viewport.
3. **Purple means Copilot.** `{colors.copilot-purple}` is reserved for Copilot-attributed data, the Copilot badge, and Copilot-themed modules. Never use purple as generic decoration.
4. **Blue means link or security.** Inline links are blue; Security-attributed modules may use `{colors.security-blue}`. Blue is never a primary CTA.
5. **Defensible over decorative.** A number's auditability (Principle 1) beats visual flourish. The "How is this calculated?" affordance is a first-class component, not a tooltip afterthought.
6. **Privacy in the visual language.** Aggregate-first layouts; pseudonymized logins; no ranking/leaderboard chrome (Principle 2).
7. **Dark-first parity.** Every token, chart, and component has a designed dark value. Dark is not "invert the light theme."
8. **Colorblind-aware by construction.** Never encode meaning in hue alone — pair with label, shape, position, or pattern. The categorical ramp is ordered for adjacent-hue separation.
9. **Type carries hierarchy, not weight-spam.** Use the scale. Display is 600–700; body is 400. Don't reach past 700.
10. **Motion is functional.** Transitions clarify state change (150–200ms). No ambient/looping animation on data surfaces.

## Colors

> **Source:** GitHub Brand Toolkit — [Color](https://brand.github.com/foundations/color). Hex values are the authoritative Primer Brand primitives (`@primer/brand-primitives`).

### Core brand — GitHub Green
The single hero color. Anchor it with neutrals so it stays a focal event.
- **GitHub Green** (`{colors.brand-green}` — `#08872B`): iconic swatch, brand marks, filled primary button (with white text), the value/headline chart series.
- **Green Emphasis** (`{colors.brand-green-emphasis}` — `#0FBF3E`): brighter fill, hover, success emphasis.
- **Green Deep** (`{colors.brand-green-deep}` — `#0D6731`): accessible green text/icon on light surfaces; pressed button state.
- **Green Bright** (`{colors.brand-green-bright}` — `#23EA57`) / **Mint** (`{colors.brand-green-mint}` — `#8CF2A6`): dark-mode fills, accent text, chart lines.
- **Green Subtle** (`{colors.brand-green-subtle}` — `#EBF9F4`): tinted success/brand background on light.

### Copilot Theme — Purple
Reserved for Copilot-attributed data and Copilot-themed UI (Constitution Principle 9 made visible).
- **Copilot Purple** (`{colors.copilot-purple}` — `#8534F3`): Copilot-attributed chart series, the Copilot badge, Copilot module accents.
- **Purple Emphasis** (`{colors.copilot-purple-emphasis}` — `#6619E1`): hover/pressed.
- **Purple Bright** (`{colors.copilot-purple-bright}` — `#B870FF`): dark-mode accent.
- **Purple Subtle** (`{colors.copilot-purple-subtle}` — `#F0E5FF`): tinted Copilot background on light.

### Security Theme — Blue
Rare; only for security-attributed modules (e.g., a future Copilot Autofix remediation view).
- **Security Blue** (`{colors.security-blue}` — `#0377FF`), **Emphasis** (`#0055D5`), **Subtle** (`#DDF4FF`).

### Links
GitHub keeps green for brand/CTA, so inline text links are **blue**: `{colors.link}` `#005DD5` (light) / `{colors.link-dark}` `#8DD6FF` (dark).

### Neutrals — GitHub gray (green-tinted)
The workhorse ladder. **Light:** `{colors.ink}` `#191F1B` body text · `{colors.ink-muted}` `#58635B` secondary · `{colors.ink-subtle}` `#77827A` tertiary/axis · `{colors.canvas}` `#FFFFFF` page · `{colors.canvas-subtle}` `#F2F5F3` bands/insets · `{colors.hairline}` `#C4CCC6` borders. Reserve `{colors.ink-black}` `#000000` for max-emphasis headlines only.

### Neutrals — dark
Brand marketing uses **pure black** as the dark canvas; for dense data we lift to a near-black green-tinted product canvas: `{colors.canvas-dark}` `#0B0F0C` base · `{colors.canvas-dark-elevated}` `#191F1B` cards · `{colors.canvas-dark-inset}` `#000000` code · `{colors.hairline-dark}` `#353D37` borders · `{colors.ink-on-dark}` `#F2F5F3` body text. Pure black hero bands are permitted for marketing surfaces.

### Semantic status
Success `{colors.success}` `#0FBF3E` (green — deliberately the brand hue), Warning `{colors.warning}` `#B85B06`, Danger `{colors.danger}` `#CF2230`, Info `{colors.info}` `#0377FF`. Each has a `-subtle` tint for backgrounds.

### On-color text
Filled brand surfaces use **white** text: `{colors.on-green}` on green, `{colors.on-purple}` on purple. (This is the inverse of many green systems — GitHub's primary button is dark-green with white type, which reads as confident and technical.)

## Typography

### Font families
- **Mona Sans** — GitHub's variable grotesque-humanist sans, used for all UI and display. Variable axes: weight 200–900 and width (Normal→Wide). Use **Wide** only for large marketing display.
- **Mona Sans Mono** — GitHub's monospace, intended for all code, tokens, IDs, and tabular figures where alignment matters. **Availability caveat:** GitHub has not yet published Mona Sans Mono as a standalone open-source release, so it is listed first in the `--font-mono` stack and drops in automatically once available; until then code renders in the system-mono fallback (`ui-monospace, SFMono-Regular, …`).
- Mona Sans is **SIL OFL 1.1** and MUST be **self-hosted** (aligns with Principle 10 — no external font CDN, no phone-home). Mona Sans Mono MUST also be self-hosted once released; never load fonts from a CDN.

Fallback chains are baked into every `{typography.*}` token (`ui-sans-serif, system-ui, …` for sans; `ui-monospace, SFMono-Regular, …` for mono) so the app degrades gracefully before fonts load.

### Hierarchy

| Token | Size | Weight | Line height | Tracking | Use |
|---|---|---|---|---|---|
| `{typography.display-xxl}` | 60 | 700 | 1.05 | -0.03em | Hero / landing headline |
| `{typography.display-xl}` | 44 | 700 | 1.08 | -0.025em | Page hero |
| `{typography.display-lg}` | 32 | 600 | 1.15 | -0.02em | View title |
| `{typography.display-md}` | 24 | 600 | 1.2 | -0.015em | KPI value / card title |
| `{typography.heading-lg}` | 20 | 600 | 1.25 | -0.01em | Section heading |
| `{typography.heading-md}` | 16 | 600 | 1.4 | 0 | Sub-heading |
| `{typography.body-lg}` | 18 | 400 | 1.55 | 0 | Lead paragraph |
| `{typography.body-md}` | 16 | 400 | 1.5 | 0 | Default body |
| `{typography.body-sm}` | 14 | 400 | 1.5 | 0 | Dense UI / table cell |
| `{typography.label}` | 14 | 500 | 1.0 | 0.01em | Button / form label |
| `{typography.caption}` | 13 | 400 | 1.45 | 0 | Helper / footnote |
| `{typography.eyebrow}` | 12 | 600 | 1.4 | 0.06em | UPPERCASE section eyebrow |
| `{typography.micro}` | 12 | 500 | 1.4 | 0.01em | Pill / badge |
| `{typography.code}` | 13 | 400 | 1.5 | 0 | Code, IDs, tabular figures |

### Principles
- **Display 600–700 with negative tracking.** Mona Sans tightens well; `-0.03em` at 60px scales down proportionally. Never exceed 700.
- **Body is 400.** Reserve 500/600 for labels and headings so emphasis stays meaningful.
- **Tabular figures for metrics.** Enable `font-variant-numeric: tabular-nums` on all KPI values, tables, and axes so digits align.
- **Mono for anything a developer would copy** — tokens, org slugs, run IDs, formulas.

## Layout

### Spacing
8px base with 2/4/12 sub-tokens: `{spacing.xxs}` 2 · `{spacing.xs}` 4 · `{spacing.sm}` 8 · `{spacing.md}` 12 · `{spacing.lg}` 16 · `{spacing.xl}` 24 · `{spacing.2xl}` 32 · `{spacing.3xl}` 48 · `{spacing.huge}` 64. Card padding `{spacing.xl}` (24); dashboard gutters `{spacing.xl}`–`{spacing.2xl}`.

### App shell
- **Left sidebar nav** (collapsible), **top bar** with org switcher + date-range + theme toggle, **content canvas** on `{colors.canvas}` / `{colors.canvas-dark}`.
- Content max-width ~1440px for wide dashboards; tables may go full-bleed within the canvas.

### Three-layer page (per spec 04)
Every view: (1) headline **KPI tiles**, (2) **primary chart**, (3) **breakdown panels**. Keep V1 simpler than supporting views.

## Elevation & Depth

GitHub's depth is **borders and surface-lightness first, shadow second** — especially in dark mode, where elevation is expressed by lifting the surface color, not by glow.

| Level | Light | Dark | Use |
|---|---|---|---|
| 0 | 1px `{colors.hairline}` | 1px `{colors.hairline-dark}` | Default cards, inputs |
| 1 | `0 1px 3px rgba(0,0,0,0.06)` | surface → `{colors.canvas-dark-elevated}` | Hover lift, KPI tiles |
| 2 | `0 8px 24px rgba(0,0,0,0.10)` | + subtle border highlight | Popovers, dropdowns |
| 3 | `0 16px 48px rgba(0,0,0,0.16)` | + backdrop scrim | Modals, dialogs |

## Shapes

| Token | Value | Use |
|---|---|---|
| `{rounded.xs}` | 4px | Inline tags, checkboxes |
| `{rounded.sm}` | 6px | **Buttons, inputs, selects** (GitHub signature) |
| `{rounded.md}` | 8px | Menus, alerts, code blocks |
| `{rounded.lg}` | 12px | Cards, KPI tiles, chart panels |
| `{rounded.xl}` | 16px | Modals, large containers |
| `{rounded.2xl}` | 24px | Marketing/hero panels only |
| `{rounded.full}` | 9999px | Pills, badges, avatars |

## Components

### Buttons
- **`button-primary`** — the CTA. `{colors.brand-green}` fill, `{colors.on-green}` white text, `{rounded.sm}` 6px. Pressed → `{colors.brand-green-deep}`. One per viewport.
- **`button-secondary`** — `{colors.canvas}` fill, `{colors.ink}` text, 1px `{colors.hairline-strong}` border.
- **`button-invisible`** — transparent until hover (hover fills `{colors.canvas-subtle}`); for toolbar/table actions.
- **`button-danger`** — `{colors.danger}` text on `{colors.canvas}`; fills `{colors.danger}` with white text only on confirm.

### Cards & KPI tiles
- **`card`** — `{colors.canvas}` (light) / `{colors.canvas-dark-elevated}` (dark), `{rounded.lg}`, 1px hairline, `{spacing.xl}` padding.
- **`kpi-tile`** — headline metric card. Label in `{typography.micro}` uppercase-ish, value in `{typography.display-md}` with tabular figures, delta chip (green up / red down), and a **"How is this calculated?"** link when the metric is derived.

### Labels, badges & the Copilot badge
- **`label-neutral`** — status/metadata pill on `{colors.canvas-subtle}`.
- **`label-green`** — positive/brand pill (`{colors.brand-green-subtle}` bg, `{colors.brand-green-deep}` text).
- **`badge-copilot`** — the signature Copilot marker: `{colors.copilot-purple-subtle}` bg, `{colors.copilot-purple-emphasis}` text, optional Copilot octicon. Marks any Copilot-attributed KPI, series, or module.

### Navigation
- **`nav-sidebar-item`** / **`nav-sidebar-item-active`** — 8px/12px padding, `{rounded.md}`. Active item gets `{colors.canvas-subtle}` fill and a 2px `{colors.brand-green}` left indicator; icon + label in `{typography.body-sm}`.

### Inputs & forms
- **`text-input`** — `{colors.canvas}`, 1px `{colors.hairline-strong}`, `{rounded.sm}`, `{typography.body-md}`. Focus ring: 2px `{colors.security-blue}` (light) / `{colors.link-dark}` (dark) with 2px offset.

### Code & formulas
- **`code-block`** — `{colors.canvas-dark-inset}` background in both themes, `{colors.ink-on-dark}` text, `{typography.code}`, `{rounded.md}`. Used for snippets and rendered value-translation formulas.

### "How is this calculated?" affordance (Constitution Principle 1)
- **`how-calculated`** — a first-class disclosure. Trigger is a `{colors.link}` text link or info octicon on every derived metric. Expands a panel on `{colors.canvas-subtle}` showing: the **formula** (`{typography.code}`), the **current knob values**, and the **inputs** used — traceable by hand. This component is mandatory wherever a dollar or hour figure appears.

### Tooltip
- **`tooltip`** — opaque `{colors.ink}` surface (never translucent over charts), `{colors.on-invert}` text, `{rounded.sm}`. Chart tooltips list series with their reserved colors and values.

## Data Visualization

Charts are the product. They MUST be honest, legible, and colorblind-aware.

### Semantic reservations (authoritative)
- **Value / headline** ($ saved, hours saved) → `{colors.chart-value}` **green**.
- **Copilot-attributed** series → `{colors.chart-copilot}` **purple**.
- **Non-Copilot baseline** → `{colors.chart-baseline}` **neutral gray**.
- **Failure / incident** → `{colors.chart-fail}` red; **restore / MTTR** → `{colors.chart-restore}` orange.
- **Security-attributed** → `{colors.security-blue}` blue.

### Categorical ramp
`{colors.chart-1}`…`{colors.chart-10}` — a 10-hue ramp drawn from GitHub's secondary scales (green, purple, blue, orange, teal, pink, indigo, lime, coral, yellow), ordered for adjacent separation. Consumed via `src/components/charts/palette.ts`.

**Ramp vs. reservations.** The reservations above bind the *semantic tokens* (`--chart-value`, `--chart-copilot-1`, `--chart-copilot-2`, `--chart-baseline`, `--security-blue`) — **not** the ramp positions. Multi-series and single-series categorical charts MAY use any ramp hue, including one that happens to share a color with a semantic token (e.g. `--chart-3` blue for a general series is fine and is not "the security token"). The one hard rule: **never color non-Copilot data with the Copilot purple in a context that implies attribution.** For general single-metric engineering charts (e.g. DORA/CI health), prefer a neutral ramp accent and avoid green (reads as "value") and purple (reads as "Copilot").

### Rules
- **Single-metric time series** stay on **one** accent (green for value; purple for a Copilot-attributed metric) — color never implies meaning that isn't there.
- **Multi-series** cycle the ramp by series index.
- **Single-series categorical** (by IDE, model, language) color each category by index.
- **Never hue-only.** Pair color with direct labels, legends, or shape. Verify with a deuteranopia check.
- **Grid/axes** in `{colors.ink-subtle}` / `{colors.ink-on-dark-subtle}`; keep chart chrome quiet so data dominates.

### Iconography
Use **Octicons** (GitHub's icon set, MIT). Match `{typography.body-md}` optical size; icons inherit `currentColor`.

## Motion
- **Transitions** 150–200ms `ease-out` for hover, focus, disclosure, theme switch.
- **Chart enter** ≤ 400ms, once, no loop. Respect `prefers-reduced-motion` — disable non-essential motion.
- **No ambient animation** on data surfaces.

## Do's and Don'ts

### Do
- Keep green scarce — one primary green action per viewport; let neutrals carry structure.
- Use purple *only* for Copilot-attributed meaning; use the Copilot badge to mark it.
- Use the green-tinted neutral ladder — never a pure/cool gray.
- Ship the "How is this calculated?" affordance on every derived number.
- Use white text on green/purple fills; use tabular figures for all metrics.
- Design light and dark values together for every token.

### Don't
- Don't use purple, blue, or ramp colors as generic decoration.
- Don't make green a wash or a background field — it's a focal event.
- Don't exceed weight 700 on display, or use pill radius on buttons (6px is the signature).
- Don't encode meaning in hue alone.
- Don't add leaderboards, rankings, or per-developer surveillance chrome (Principle 2).
- Don't load fonts from an external CDN — self-host Mona Sans (Principle 10).

## Responsive

| Name | Width | Key changes |
|---|---|---|
| Wide | ≥ 1440 | Full shell; multi-column KPI + chart grid |
| Desktop | 1024–1439 | Default; sidebar visible; 3–4 KPI tiles per row |
| Tablet | 768–1023 | Sidebar collapses to icons; 2 KPI tiles per row; breakdowns behind tabs |
| Mobile | < 768 | Hamburger nav; KPI tiles stack 1-up; display steps 60→32; charts scroll horizontally if needed |

Touch targets ≥ 40×40px; inputs ≥ 40px tall on touch.

## Accessibility
- **WCAG 2.1 AA** minimum. Body text ≥ 4.5:1; large text/UI ≥ 3:1. White-on-green uses green-6/green-7 which clear AA.
- **Visible focus** on every interactive element (2px blue ring, 2px offset).
- **Colorblind-aware** charts (never hue-only; verified ramp).
- **Reduced motion** honored globally.
- **Pseudonymized** identities by default (Principle 2).

## Implementation Mapping

This section makes the code phase mechanical. Copilot Metrics Dashboard is fully token-driven (shadcn CSS variables + Tailwind), so applying this system is mostly a values swap.

### `apps/web/src/app/globals.css`
Map shadcn tokens to brand values (light `:root` / dark `.dark`). HSL shown for the shadcn convention:

| shadcn var | Light → brand | Dark → brand |
|---|---|---|
| `--background` | `{colors.canvas}` `#FFFFFF` | `{colors.canvas-dark}` `#0B0F0C` |
| `--foreground` | `{colors.ink}` `#191F1B` | `{colors.ink-on-dark}` `#F2F5F3` |
| `--card` | `{colors.canvas}` | `{colors.canvas-dark-elevated}` `#191F1B` |
| `--primary` | `{colors.brand-green}` `#08872B` | `{colors.brand-green-bright}` `#23EA57` |
| `--primary-foreground` | `{colors.on-green}` `#FFFFFF` | `{colors.ink-black}` `#000000` |
| `--secondary` / `--muted` / `--accent` | `{colors.canvas-subtle}` `#F2F5F3` | `#12160F` / `{colors.hairline-dark}` |
| `--muted-foreground` | `{colors.ink-muted}` `#58635B` | `{colors.ink-on-dark-muted}` `#B6BFB8` |
| `--border` / `--input` | `{colors.hairline}` `#C4CCC6` | `{colors.hairline-dark}` `#353D37` |
| `--ring` | `{colors.security-blue}` `#0377FF` | `{colors.link-dark}` `#8DD6FF` |
| `--destructive` | `{colors.danger}` `#CF2230` | `#FF8182` |
| `--radius` | `0.5rem` → 6px buttons (`rounded-md`), 12px cards (`rounded-xl`) | same |

Chart tokens: set `--chart-value` (green), `--chart-copilot-1` → **purple** (repurposed from blue), `--chart-baseline` → neutral gray, and `--chart-1…10` to the ramp above (light + dark variants).

### Fonts
Self-host **Mona Sans** via `@fontsource-variable/mona-sans` (family `'Mona Sans Variable'`, imported in `layout.tsx`) and set the CSS `--font-sans` / `--font-mono` variables; update Tailwind `fontFamily`. **Mona Sans Mono** is not yet publicly released by GitHub, so `--font-mono` currently resolves to the system-mono fallback with `'Mona Sans Mono'` listed first (drops in when released — self-host it then, never a CDN).

### Tailwind (`apps/web/tailwind.config.ts`)
Keep the CSS-variable color mapping; add `fontFamily.sans`/`.mono` from the font vars, add the `--chart-*` and Copilot/security color aliases, and set `borderRadius` from `--radius`.

### Components to polish (per agreed scope)
Buttons, cards, KPI tiles, labels, the **Copilot badge**, sidebar nav, inputs, chart theme (`components/charts/chart-theme.tsx`, `palette.ts`), and the **How-is-this-calculated** panel. Older chart wrappers keep working via tokens; new views use EvilCharts with the brand ramp.

## Iteration Guide
1. Work one component at a time; reference token names directly.
2. Default body to `{typography.body-md}`; metrics use tabular figures; code uses `{typography.code}`.
3. Keep green scarce and purple semantic (Copilot only).
4. Validate light **and** dark for every change.
5. Run `npx @google/design.md lint DESIGN.md` after edits to this file.
6. For any user-visible change, update `specs/` + this file together (Constitution Principle 8).
