# Design system

Tokens live in `src/index.css` (`:root` and `:root[data-theme='dark']`);
the Monaco themes in `src/components/mermaid-editor.tsx` mirror them in hex.

## Colour

OKLCH for the neutrals and the diagram ink, tinted toward hue 262 (the diagram's blue-violet); brand, focus, state and syntax colours stay hex.
Strategy: restrained. One accent (JointJS red) at well under 10% of the surface.

| Role | Light | Dark |
| --- | --- | --- |
| Canvas, editor (`--surface-sunken`) | `oklch(0.975 0.004 262)` | `oklch(0.215 0.03 262)` |
| Panels (`--surface`) | `oklch(0.995 0.002 262)` | `oklch(0.25 0.03 262)` |
| Border | `oklch(0.88 0.012 262)` | `oklch(0.37 0.03 262)` |
| Text / muted | `oklch(0.25 0.02 262)` / `oklch(0.5 0.02 262)` | `oklch(0.93 0.01 262)` / `oklch(0.72 0.02 262)` |
| Node fill / stroke | `oklch(0.945 0.03 290)` / `oklch(0.6 0.15 300)` | `oklch(0.28 0.035 270)` / `oklch(0.8 0.05 280)` |
| Accent | `#ed2637` | `#ff5567` |
| Focus and selection | `#2563eb` | `#7cb3ff` |
| Gutter, strings | teal `oklch(0.5 0.09 190)` | teal `oklch(0.66 0.09 190)` / `oklch(0.82 0.12 185)` |

Pressed state: `--chip-active` (accent mixed into the chip). Danger: `--error`
on `--error-surface`, on hover only.

## Typography

- UI: `--font-ui` (system sans), 12 to 14 px.
- Code and diagram: `--font-mono` (system mono). Node labels 13 px, edge labels
  12 px, source 13 px on a 21 px line.

## Shape and elevation

Toolbar panel radius 10 px, floating clusters 8 px, buttons 7 px, chips 6 px, node corners 4 px.
Floating panels: 1 px `--overlay-border` plus `--overlay-shadow`; in dark mode
the shadow includes a 1 px inset highlight along the top edge.
Inside a panel: no nested wells. Clusters are separated by a 1 px divider.

## Motion

150 ms `--ease-out` (`cubic-bezier(0.22, 1, 0.36, 1)`) on colour and background
only. Everything stops under `prefers-reduced-motion`.
