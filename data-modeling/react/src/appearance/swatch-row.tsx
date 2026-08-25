// A row of color-preset swatches, shared by the table + group inspectors. Copied
// from the ai-workflow-builder demo's SwatchRow and adapted to this demo's
// SwatchKey set. Each swatch is a radio in an ARIA radiogroup so the whole picker
// is one keyboard-navigable control; the active swatch shows a ring.

import type { SwatchKey } from '@/model/cell-data';
import { SWATCH_KEYS, swatchDot } from '@/appearance/swatches';
import { rovingRadioKeyDown } from '@/utils/roving-radio';
import { cn } from '@/utils/cn';

interface SwatchRowProps {
  readonly label: string;
  readonly value: SwatchKey;
  readonly onChange: (value: SwatchKey) => void;
}

export function SwatchRow({ label, value, onChange }: SwatchRowProps) {
    return (
        <div
            role="radiogroup"
            aria-label={label}
            onKeyDown={(event) => rovingRadioKeyDown(event, SWATCH_KEYS, value, onChange)}
            className="flex flex-wrap items-center gap-1.5"
        >
            {SWATCH_KEYS.map((swatch) => (
                <button
                    key={swatch}
                    type="button"
                    role="radio"
                    data-value={swatch}
                    aria-checked={value === swatch}
                    aria-label={`${label}: ${swatch}`}
                    // Roving tabIndex: only the checked swatch is a Tab stop; arrows move within.
                    tabIndex={value === swatch ? 0 : -1}
                    onClick={() => onChange(swatch)}
                    className={cn(
                        'size-4 cursor-pointer rounded-full outline-none ring-offset-1 ring-offset-background transition-transform',
                        'hover:scale-110 focus-visible:ring-2 focus-visible:ring-ring',
                        swatchDot(swatch),
                        value === swatch && 'ring-2 ring-foreground',
                    )}
                />
            ))}
        </div>
    );
}
