// Named preset colors shared by the table + group appearance pickers. One place
// resolves a SwatchKey into the three forms the UI needs:
//   - dot:     a solid tailwind fill for the picker button / group badge
//   - surface: a subtle bg + border tint for a table/group card (light AND dark)
//   - color:   a raw CSS color usable in SVG `fill`/`stroke` + inline styles
//
// Dark surface fills are an OPAQUE color-mix over --color-card (not an alpha
// tint): an alpha bg would let the canvas show through the card. The literal
// arbitrary-value class strings must appear here verbatim so Tailwind v4's JIT
// emits them.

import type { SwatchKey } from '@/model/cell-data';

interface Swatch {
  readonly dot: string;
  readonly surface: string;
  readonly color: string;
}

const SWATCHES: Readonly<Record<SwatchKey, Swatch>> = {
    default: {
        dot: 'bg-muted-foreground/40',
        surface: 'bg-card border-border',
        color: 'var(--muted-foreground)',
    },
    violet: {
        dot: 'bg-violet-400',
        surface:
      'bg-violet-50 border-violet-200 dark:bg-[color-mix(in_oklab,var(--color-card),var(--color-violet-500)_16%)] dark:border-violet-400/40',
        color: 'var(--color-violet-500)',
    },
    blue: {
        dot: 'bg-sky-400',
        surface:
      'bg-sky-50 border-sky-200 dark:bg-[color-mix(in_oklab,var(--color-card),var(--color-sky-500)_16%)] dark:border-sky-400/40',
        color: 'var(--color-sky-500)',
    },
    green: {
        dot: 'bg-emerald-400',
        surface:
      'bg-emerald-50 border-emerald-200 dark:bg-[color-mix(in_oklab,var(--color-card),var(--color-emerald-500)_16%)] dark:border-emerald-400/40',
        color: 'var(--color-emerald-500)',
    },
    amber: {
        dot: 'bg-amber-400',
        surface:
      'bg-amber-50 border-amber-200 dark:bg-[color-mix(in_oklab,var(--color-card),var(--color-amber-500)_16%)] dark:border-amber-400/40',
        color: 'var(--color-amber-500)',
    },
    rose: {
        dot: 'bg-rose-400',
        surface:
      'bg-rose-50 border-rose-200 dark:bg-[color-mix(in_oklab,var(--color-card),var(--color-rose-500)_16%)] dark:border-rose-400/40',
        color: 'var(--color-rose-500)',
    },
    slate: {
        dot: 'bg-slate-400',
        surface:
      'bg-slate-100 border-slate-300 dark:bg-[color-mix(in_oklab,var(--color-card),var(--color-slate-500)_16%)] dark:border-slate-400/40',
        color: 'var(--color-slate-500)',
    },
};

// Explicit list (TS checks each element against SwatchKey) — no `as` cast, and it
// fixes the picker order rather than relying on object key order.
export const SWATCH_KEYS: readonly SwatchKey[] = [
    'default',
    'violet',
    'blue',
    'green',
    'amber',
    'rose',
    'slate',
];

export function swatchDot(key: SwatchKey): string {
    return SWATCHES[key].dot;
}

// Table/group card bg + border for a chosen fill (default -> the plain card look).
export function surfaceClass(fill?: SwatchKey): string {
    return SWATCHES[fill ?? 'default'].surface;
}

// Raw color for SVG (group body tint/stroke) + inline styles (group badge dot).
export function swatchColor(key?: SwatchKey): string {
    return SWATCHES[key ?? 'default'].color;
}
