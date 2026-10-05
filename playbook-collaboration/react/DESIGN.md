# Journey Board — Design System

Aesthetic: **LEDGER** — the dress of a serious SaaS planning tool.
Light-first: a warm-gray working surface with ink typography; the dark
theme is the same room after hours. All colors OKLCH; neutrals tint faintly
warm (hue 80) so the surface reads as paper, not screen-gray.

## Color

- Shell: paper `oklch(0.972 0.003 80)`, panel near-white, ink
  `oklch(0.24 0.015 260)`. Dark flips to a blue-black of the same family.
- One chrome accent — a restrained amber `oklch(0.5 0.12 60)` (brighter in
  dark) — reserved for the primary action (Run cohort), selection and focus.
- **The eight department seats are the only saturated hues** and always
  mean data: Marketing violet 295, Sales blue 245, Product teal 175,
  Support amber 70, Success rose 350, Finance green 145, Operations cyan
  220, Legal slate 275. Both themes tuned separately.
- Flows are neutral ink strokes; handoffs go dashed with a small-caps chip.
  Cards are near-white plates with a hairline edge; the owner's color
  appears only as the 3px accent bar, the corner dot and the entry pill dot.

## Typography

- UI + canvas labels: **Public Sans Variable** (engineered US-gov grotesque:
  credible, neutral, not the default everyone ships). `tnum` on globally.
- Metrics, timestamps and the results block: **Overpass Mono Variable**.
- Scale: 13px body, 12.5px card titles (700), 10.5px card metadata, 11px
  small-caps section titles with 0.14em tracking. Weight contrast over size.

## Surfaces & depth

- Panels are flat plates: 1px edge, one soft shadow token, radius 10–14px.
- Cards on the board: 1px hairline + a 1px drop shadow only — the board
  stays calm so seat colors and the cohort dots are the loudest things.
- Stage columns: alternate 2.5%-tint bands, hairline separators, small-caps
  headers above the working area. No grid dots, no decoration.

## Motion

- Cursors and cards move with the presence stream (no artificial easing).
- Cohort customers ride at constant speed and vanish where they drop.
- Feed rows enter with a 140ms ease-out slide; `prefers-reduced-motion`
  turns the slide off (the customers still move — they are the data).

## Layout

- Header (wordmark · board chip · avatars · Run cohort · theme).
- Board fills the rest; 312px right rail: inspector → cohort results →
  team roster → activity feed. The lobby is a centered single column.
