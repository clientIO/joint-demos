/**
 * The one button style of the chrome, in three variants; `primary` is the single
 * loud action of a view, in the accent color.
 */
import clsx from 'clsx';

/** Tailwind classes for a button of the given variant. */
export function buttonClass(variant?: 'primary' | 'icon'): string {
    return clsx(
        'cursor-pointer rounded-full border font-sans text-[13px] font-semibold disabled:cursor-default disabled:opacity-45',
        // Two utilities for the same property would compete in stylesheet order, not
        // in the order written here, so the icon box and the text padding never mix.
        variant === 'icon' ? 'inline-flex size-9 items-center justify-center p-0' : 'px-3.5 py-1.5',
        variant === 'primary'
            ? 'border-accent bg-accent text-accent-ink hover:enabled:brightness-105'
            : 'border-control bg-panel text-ink hover:enabled:border-accent'
    );
}
