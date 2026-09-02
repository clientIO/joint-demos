import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './shape-picker.css';

import type { CSSProperties, KeyboardEvent, ReactNode } from 'react';

/** Which side of the anchor the list opens on. */
export type PickerPlacement = 'right' | 'left' | 'down' | 'up';

const GAP = 8;

/**
 * Positions the list over the canvas rather than inside it.
 *
 * It cannot be a child of the paper: the paper scrolls, and the list would
 * ride along with it — including when picking a row scrolls the canvas to
 * preview the choice. So it is portalled out and placed in screen
 * coordinates, from the anchor's rect at the moment it opened.
 */
export function PickerOverlay({ anchor, placement, children }: {
    /** The anchor's rect in screen coordinates. */
    anchor: { top: number, left: number, right: number, bottom: number },
    placement: PickerPlacement,
    children: ReactNode
}) {
    const style: CSSProperties = { position: 'fixed', zIndex: 900 };

    switch (placement) {
        case 'left':
            style.left = anchor.left - GAP;
            style.top = anchor.top;
            style.transform = 'translateX(-100%)';
            break;
        case 'down':
            style.left = anchor.left;
            style.top = anchor.bottom + GAP;
            break;
        case 'up':
            style.left = anchor.left;
            style.top = anchor.top - GAP;
            style.transform = 'translateY(-100%)';
            break;
        default:
            style.left = anchor.right + GAP;
            style.top = anchor.top;
    }

    return createPortal(<div style={style}>{children}</div>, document.body);
}

/** One row: `value` is whatever the caller needs back — a type, an id. */
export interface PickerItem {
    value: string;
    label: string;
    icon?: ReactNode;
}

interface ShapePickerProps {
    items: PickerItem[];
    onPick: (value: string) => void;
    onCancel: () => void;
    /** Called as the highlighted row changes, for previewing the choice. */
    onActive?: (value: string) => void;
    /** Names the list for assistive tech, e.g. "Add a shape". */
    label: string;
}

/**
 * A short, keyboard-first list anchored beside a shape. Real buttons with
 * roving focus, so the arrows move between them, `enter` picks and `escape`
 * closes.
 */
export function ShapePicker({ items, onPick, onCancel, onActive, label }: ShapePickerProps) {

    const listRef = useRef<HTMLDivElement>(null);
    const [active, setActive] = useState(0);

    useEffect(() => {
        const buttons = listRef.current?.querySelectorAll('button');
        (buttons?.[active] as HTMLButtonElement | undefined)?.focus();

        const item = items[active];
        if (item) onActive?.(item.value);
    }, [active, items, onActive]);

    const onKeyDown = (evt: KeyboardEvent) => {
        // The list owns the keyboard while it is open. The app's shortcuts
        // are bound on `document` and the list renders inside the paper, so
        // anything left to bubble would also act on the shape behind it —
        // `enter` alone would rename it and swallow the pick.
        evt.stopPropagation();

        if (evt.key === 'Escape') {
            evt.preventDefault();
            onCancel();
            return;
        }

        if (evt.key === 'Enter' || evt.key === ' ') {
            evt.preventDefault();
            const item = items[active];
            if (item) onPick(item.value);
            return;
        }

        const step = evt.key === 'ArrowDown' ? 1 : evt.key === 'ArrowUp' ? -1 : 0;
        if (step === 0) return;

        evt.preventDefault();
        setActive((current) => (current + step + items.length) % items.length);
    };

    return (
        <div
            ref={listRef}
            className="shape-picker"
            role="listbox"
            aria-label={label}
            onKeyDown={onKeyDown}
        >
            {items.map((item, index) => (
                <button
                    key={item.value}
                    type="button"
                    role="option"
                    aria-selected={index === active}
                    tabIndex={index === active ? 0 : -1}
                    className="shape-picker-item"
                    onClick={() => onPick(item.value)}
                    onFocus={() => setActive(index)}
                >
                    {item.icon && <span className="shape-picker-icon">{item.icon}</span>}
                    {item.label}
                </button>
            ))}
        </div>
    );
}
