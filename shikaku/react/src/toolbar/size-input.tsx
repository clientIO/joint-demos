/**
 * One side of the board.
 *
 * A number input whose value is only settled when the player has finished with
 * it. Clamping on every keystroke is what the obvious version does, and it
 * makes a two-digit size unreachable: typing "12" clamps the "1" to the minimum
 * and the field jumps out from under the cursor.
 *
 * So the field keeps whatever has been typed — including nothing, mid-edit —
 * and hands back a clamped number on blur or on Enter. Blur runs before the
 * click that caused it, so pressing *New puzzle* with a half-typed size settles
 * it first and generates the board that is on screen.
 */
import { useState } from 'react';
import { clampSide, MAX_SIDE, MIN_SIDE } from '@/puzzle/board-size';

export interface SizeInputProps {
    readonly label: string;
    readonly value: number;
    readonly onChange: (value: number) => void;
}

export function SizeInput({ label, value, onChange }: SizeInputProps) {
    const [draft, setDraft] = useState(String(value));
    const [settledValue, setSettledValue] = useState(value);

    /*
     * The settled value can change from outside the field, and the draft has to
     * follow it. Adjusted during render rather than in an effect: React re-runs
     * this component before touching the DOM, so nothing is painted with the
     * stale draft — where an effect would paint the old value first and then
     * correct it, which is the cascade the lint rule is about.
     */
    if (value !== settledValue) {
        setSettledValue(value);
        setDraft(String(value));
    }

    const settle = () => {
        const settled = clampSide(Number(draft));
        setDraft(String(settled));
        setSettledValue(settled);
        if (settled !== value) onChange(settled);
    };

    return (
        <input
            type="number"
            className="size-input"
            aria-label={label}
            min={MIN_SIDE}
            max={MAX_SIDE}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={settle}
            onKeyDown={(event) => {
                if (event.key === 'Enter') settle();
            }}
        />
    );
}
