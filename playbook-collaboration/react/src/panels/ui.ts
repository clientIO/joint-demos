import clsx from 'clsx';

/**
 * Signage button; `rush` is the single loud action, in the chrome accent.
 * Color utilities live per-variant so no two same-property classes compete.
 */
export function buttonClass(variant?: 'rush' | 'icon'): string {
    return clsx(
        'cursor-pointer rounded-full border font-sans text-[13px] font-semibold disabled:cursor-default disabled:opacity-45',
        // The icon box is square and padding-free; text buttons get the padding.
        // Kept apart because two same-property utilities would compete in the
        // stylesheet order, not in the order written here.
        variant === 'icon' ? 'inline-flex size-9 items-center justify-center p-0' : 'px-3.5 py-1.5',
        variant === 'rush'
            ? 'border-accent bg-accent text-accent-ink hover:enabled:brightness-105'
            : 'border-control bg-panel text-ink hover:enabled:border-accent'
    );
}
