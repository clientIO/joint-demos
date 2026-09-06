/**
 * The toolbar's icons, as inline SVG.
 *
 * `stroke="currentColor"` is the point: the color comes from the button's own
 * CSS, so hover and disabled states need no work here. All authored on the
 * usual 24x24 grid and sized by CSS.
 */
import type { ReactNode } from 'react';

function Icon({ children }: { readonly children: ReactNode }) {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <g
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                {children}
            </g>
        </svg>
    );
}

/** An arrow curving back on itself, anticlockwise. */
export function UndoIcon() {
    return (
        <Icon>
            <path d="M9 14 4 9l5-5" />
            <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
        </Icon>
    );
}

/** The same arrow, mirrored. */
export function RedoIcon() {
    return (
        <Icon>
            <path d="m15 14 5-5-5-5" />
            <path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13" />
        </Icon>
    );
}

/**
 * An eraser, tilted, with the line it has swept.
 *
 * A bin would read as "throw the board away"; clearing takes the rectangles off
 * a board that stays exactly as it was, which is what an eraser does.
 */
export function ClearIcon() {
    return (
        <Icon>
            <path d="m7 21-4.3-4.3a2 2 0 0 1 0-2.8l9.6-9.6a2 2 0 0 1 2.8 0l5.6 5.6a2 2 0 0 1 0 2.8L13 21" />
            <path d="M22 21H7" />
            <path d="m5 11 8 8" />
        </Icon>
    );
}

/** A sun: what you get by switching to the light theme. */
export function SunIcon() {
    return (
        <Icon>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </Icon>
    );
}

/** A crescent moon: what you get by switching to the dark theme. */
export function MoonIcon() {
    return (
        <Icon>
            <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" />
        </Icon>
    );
}

/** Two links of a chain: a link to this board. */
export function LinkIcon() {
    return (
        <Icon>
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </Icon>
    );
}

/** A tick: the link is on the clipboard. */
export function CheckIcon() {
    return (
        <Icon>
            <path d="m5 12.5 4.5 4.5L19 7.5" />
        </Icon>
    );
}

/** A chevron pointing down: there is more behind this button. */
export function ChevronDownIcon() {
    return (
        <Icon>
            <path d="m6 9 6 6 6-6" />
        </Icon>
    );
}

/** A question mark in a circle. */
export function HelpIcon() {
    return (
        <Icon>
            <circle cx="12" cy="12" r="9.25" />
            <path d="M9.2 9.3a2.9 2.9 0 0 1 5.64.7c0 1.93-2.84 2.9-2.84 2.9" />
            <path d="M12 17h.01" />
        </Icon>
    );
}
