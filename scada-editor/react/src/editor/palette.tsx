import { useState, type MouseEvent, type PointerEvent } from 'react';
import { Search } from 'lucide-react';
import { useGraph, usePaperScroller, useSelectionCollection, useStencil } from '@joint/react-plus';
import { createEquipment, nextTag } from '../plant/cells';
import type { EquipmentKind } from '../plant/model';
import { tagsInUse } from '../plant/use-unique-tags';
import { PAPER_ID } from './paper-id';
import { CATALOG, FLANGE_WIDTH, isEquipmentKind, PALETTE_GROUPS, TERMINAL_LENGTH } from '../shapes/catalog';
import { EquipmentPreview } from '../shapes/equipment-node';

const KINDS = Object.keys(CATALOG).filter(isEquipmentKind);
const PREVIEW_BOX = 44;
// How far a terminal reaches out of its side: the lead and its end.
const TERMINAL_REACH = TERMINAL_LENGTH + 4;
// A tank in the palette shows some liquid.
const PREVIEW_LEVEL = 60;

/** The box of a kind with room for its stubs and terminals, square so every tile has one scale. */
function previewBox(kind: EquipmentKind): string {
    const { width, height, stubs = [], terminals = [] } = CATALOG[kind];
    const reach = Math.max(0, ...stubs.map((stub) => stub.length + FLANGE_WIDTH), ...terminals.map(() => TERMINAL_REACH));
    const side = Math.max(width, height) + 2 * reach;
    return `${(width - side) / 2} ${(height - side) / 2} ${side} ${side}`;
}

function PaletteItem({ kind }: { readonly kind: EquipmentKind }) {
    const { startCellDrag } = useStencil();
    const { graph, setCell } = useGraph();
    const { paperScroller } = usePaperScroller(PAPER_ID);
    const { selectCells } = useSelectionCollection();
    const spec = CATALOG[kind];

    // A new element gets the next free tag of its series.
    const onPointerDown = (event: PointerEvent<HTMLButtonElement>) => {
        startCellDrag(createEquipment(kind, nextTag(kind, tagsInUse(graph))), event);
    };

    // Enter or Space on the tile (a click without a pointer, `detail` 0): the
    // element is added in the middle of the view, for keyboard users.
    const onClick = (event: MouseEvent<HTMLButtonElement>) => {
        if (event.detail !== 0 || !paperScroller) {
            return;
        }
        const tag = nextTag(kind, tagsInUse(graph));
        const center = paperScroller.getVisibleArea().center();
        const record = createEquipment(kind, tag, { x: center.x - spec.width / 2, y: center.y - spec.height / 2 });
        setCell(record);
        selectCells([tag]);
    };

    return (
        <li>
            <button
                type="button"
                onPointerDown={onPointerDown}
                onClick={onClick}
                className="flex w-full touch-none flex-col items-center gap-1.5 rounded-md border border-transparent px-1 py-2 text-ink-2 transition-colors duration-[var(--dur-micro)] hover:border-rule hover:bg-paper focus-visible:border-accent active:bg-paper-3"
                aria-label={`Add ${spec.name}`}
                title="Drag onto the diagram, or press Enter to add it in the middle"
            >
                <svg width={PREVIEW_BOX} height={PREVIEW_BOX} viewBox={previewBox(kind)} aria-hidden>
                    <EquipmentPreview data={{ kind, tag: kind, name: spec.name, level: PREVIEW_LEVEL, value: 0 }} />
                </svg>
                <span className="text-center text-xs leading-tight">{spec.name}</span>
            </button>
        </li>
    );
}

/** The equipment, grouped as on a P&ID legend; drag one onto the diagram. */
export function Palette() {
    const [query, setQuery] = useState('');
    const normalized = query.trim().toLowerCase();
    const matches = KINDS.filter((kind) => CATALOG[kind].name.toLowerCase().includes(normalized));

    return (
        <div className="flex h-full flex-col">
            <div className="border-b border-rule p-3">
                <label className="relative block">
                    <span className="sr-only">Search equipment</span>
                    <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted" aria-hidden />
                    <input
                        type="search"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Search equipment"
                        className="field pl-8"
                    />
                </label>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
                {matches.length === 0 && (
                    <p className="px-2 py-6 text-sm text-muted">Nothing called “{query.trim()}”. Try pump, valve or tank.</p>
                )}
                {PALETTE_GROUPS.map((group) => {
                    const kinds = matches.filter((kind) => CATALOG[kind].group === group);
                    if (kinds.length === 0) {
                        return null;
                    }
                    return (
                        <section key={group} aria-labelledby={`group-${group}`} className="pt-3">
                            <h2 id={`group-${group}`} className="px-2 pb-1 font-display text-sm font-medium text-muted">
                                {group}
                            </h2>
                            <ul className="grid grid-cols-3 gap-0.5">
                                {kinds.map((kind) => (
                                    <PaletteItem key={kind} kind={kind} />
                                ))}
                            </ul>
                        </section>
                    );
                })}
            </div>
        </div>
    );
}
