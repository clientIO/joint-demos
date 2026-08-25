import type { KeyboardEvent } from 'react';

// Arrow/Home/End keyboard navigation for an ARIA radiogroup of buttons (the
// WAI-ARIA radio pattern). Each button must carry `data-value={value}` and roving
// tabIndex (checked = 0, else -1). Call from the group's onKeyDown; on a nav key it
// selects the neighbour and moves focus to it.
export function rovingRadioKeyDown<T extends string>(
    event: KeyboardEvent<HTMLElement>,
    values: readonly T[],
    current: T,
    onChange: (value: T) => void,
): void {
    const index = values.indexOf(current);
    const next =
    event.key === 'ArrowRight' || event.key === 'ArrowDown'
        ? values[(index + 1) % values.length]
        : event.key === 'ArrowLeft' || event.key === 'ArrowUp'
            ? values[(index - 1 + values.length) % values.length]
            : event.key === 'Home'
                ? values[0]
                : event.key === 'End'
                    ? values[values.length - 1]
                    : undefined;
    if (next === undefined) return;
    event.preventDefault();
    onChange(next);
    event.currentTarget.querySelector<HTMLElement>(`[data-value="${next}"]`)?.focus();
}
