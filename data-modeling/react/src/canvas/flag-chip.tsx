// A small toggle chip for a column flag (NN = NOT NULL, UQ = UNIQUE). Always shown
// so every row keeps the same right edge (types stay aligned); faint when off, a
// filled ringed brand pill when on. Clicking flips the flag — a live, in-node edit.
// Split out of table-column-row to keep that file under the size cap.

import { cn } from '@/utils/cn';

export function FlagChip({
    label,
    title,
    columnName,
    active,
    onToggle,
}: {
  readonly label: string;
  readonly title: string;
  readonly columnName: string;
  readonly active: boolean;
  // Fires on a genuine click. joint-core withholds the native click after a drag (past the
  // paper's clickThreshold), so a drag that draws a wire never toggles the flag — the chip
  // needs no click-vs-drag guard of its own.
  readonly onToggle: () => void;
}) {
    return (
        <button
            type="button"
            title={title}
            // Accessible name CONTAINS the visible label ("UQ"/"NN") so it doesn't trip
            // WCAG label-in-name; the column name gives a screen-reader user context for
            // which column this flag belongs to; aria-pressed carries the on/off state.
            aria-label={`${label}, ${title}, column ${columnName}`}
            aria-pressed={active}
            onClick={onToggle}
            className={cn(
                'shrink-0 cursor-pointer whitespace-nowrap rounded text-[10px] font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
                // ON reads as a clearly filled, ringed brand pill (coral tint + coral ring);
                // the label uses `text-foreground` — the coral `--primary` only reaches ~4.3:1
                // on the tint and fails WCAG AA at 10px, so high-contrast neutral text is used
                // instead (13.6:1 / 6.7:1). OFF is a faint hint.
                active
                    ? 'bg-primary/20 text-foreground ring-1 ring-inset ring-primary/40'
                    : 'text-muted-foreground hover:text-foreground',
            )}
        >
            {/* The label lives in a SPAN that fills the chip (padding moved here from the button):
          joint-core's form-control gate refuses to start a magnet drag when the pointerdown
          target is a <button>, so making this non-form-node span the press target is what
          lets a drag from the chip draw an FK wire. A plain click still bubbles to onClick. */}
            <span className="block px-1">{label}</span>
        </button>
    );
}
