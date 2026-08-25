// Floating inspector for the selected relationship (FK) link. When exactly one
// relation link is selected, it anchors a small menu near the link's midpoint:
// a cardinality segmented control (re-styles the wire on change) plus ON DELETE
// / ON UPDATE referential-action pickers and a delete action. Renders null for
// any other selection.
//
// Reactivity: `useCells(collection, ...)` tracks the selection; a second
// `useCells(endpointIds)` tracks the two connected tables so the anchor follows
// the link as its tables are dragged. All writes go through `setCell` /
// `removeCells` (no raw joint), keeping the controlled-cells prop the source of truth.

import { useEffect, useId, useRef, useState } from 'react';
import {
    Overlay,
    useCells,
    useGraph,
    useOnPaperEvents,
    useSelectionCollection,
    type CellId,
    type CellRecord,
    type Computed,
    type ElementRecord,
    type LinkRecord,
} from '@joint/react-plus';
import { Trash2 } from 'lucide-react';
import { isRelationLink, type RelationLinkData } from '@/model/cell-data';
import { DIALECT_REFERENTIAL_ACTIONS, type Cardinality, type ReferentialAction } from '@/schema/types';
import { useDialect } from '@/context/dialect-context';
import { cardinalityToLinkStyle } from './relationship-style';
import { rovingRadioKeyDown } from '@/utils/roving-radio';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { cn } from '@/utils/cn';

type RelationLink = Computed<LinkRecord<RelationLinkData>>;
type Point = { readonly x: number; readonly y: number };

const CARDINALITIES: readonly Cardinality[] = ['1:1', '1:N', 'N:1'];
const ACTIONS: readonly ReferentialAction[] = ['no action', 'restrict', 'cascade', 'set null', 'set default'];
// Sentinel Select value for "leave the FK's action unset" (the DB applies its
// default). Distinct from the real 'no action' keyword.
const UNSET = 'unset';

// --- Pure selection / geometry helpers -------------------------------------

function isRelationLinkRecord(cell: Computed<CellRecord>): cell is RelationLink {
    return cell.type === 'link' && isRelationLink(cell.data);
}

// The primitive fields the menu binds to. Returned by a `useCells` selector as a
// fresh object each commit, so it needs an explicit field-wise `isEqual` (the
// default `Object.is` would either churn or, on the mutated-in-place record,
// miss data changes).
interface LinkInfo {
  readonly id: CellId;
  readonly sourceId: CellId | undefined;
  readonly targetId: CellId | undefined;
  readonly cardinality: Cardinality;
  readonly onDelete: ReferentialAction | undefined;
  readonly onUpdate: ReferentialAction | undefined;
}

// The single selected relation's fields, or null for any other selection
// (empty, multi, or a non-relation cell).
function selectLinkInfo(cells: ReadonlyArray<Computed<CellRecord>>): LinkInfo | null {
    if (cells.length !== 1) return null;
    const [only] = cells;
    if (!isRelationLinkRecord(only)) return null;
    const { data } = only;
    return {
        id: only.id,
        // Typed link ends — `id` is undefined for a point-pinned end.
        sourceId: only.source.id,
        targetId: only.target.id,
        cardinality: data.cardinality,
        onDelete: data.onDelete,
        onUpdate: data.onUpdate,
    };
}

function linkInfoEqual(a: LinkInfo | null, b: LinkInfo | null): boolean {
    if (a === b) return true;
    if (!a || !b) return false;
    return (
        a.id === b.id &&
    a.sourceId === b.sourceId &&
    a.targetId === b.targetId &&
    a.cardinality === b.cardinality &&
    a.onDelete === b.onDelete &&
    a.onUpdate === b.onUpdate
    );
}

function elementCenter(cell: Computed<CellRecord>): Point | null {
    if (cell.type !== 'element') return null;
    return { x: cell.position.x + cell.size.width / 2, y: cell.position.y + cell.size.height / 2 };
}

// Midpoint between the connected tables' centres — a stable, raw-joint-free
// stand-in for the link's own midpoint that follows table drags reactively.
function midpoint(cells: ReadonlyArray<Computed<CellRecord>>): Point | null {
    const centers = cells.map(elementCenter).filter((point): point is Point => point !== null);
    if (centers.length === 0) return null;
    const sum = centers.reduce((acc, point) => ({ x: acc.x + point.x, y: acc.y + point.y }), { x: 0, y: 0 });
    return { x: sum.x / centers.length, y: sum.y / centers.length };
}

function pointEqual(a: Point | null, b: Point | null): boolean {
    if (a === b) return true;
    if (!a || !b) return false;
    return a.x === b.x && a.y === b.y;
}

// Map a Select value back to a referential action (or undefined for UNSET). No
// cast: `find` returns the matching literal, narrowing string -> ReferentialAction.
function toAction(value: string): ReferentialAction | undefined {
    return ACTIONS.find((action) => action === value);
}

// --- Sub-components ---------------------------------------------------------

interface CardinalityControlProps {
  readonly value: Cardinality;
  readonly onChange: (value: Cardinality) => void;
}

// Segmented radiogroup for the three cardinalities. Roving tabIndex + arrow keys
// (WAI-ARIA radio pattern); selection follows focus.
function CardinalityControl({ value, onChange }: CardinalityControlProps) {
    return (
        <div
            role="radiogroup"
            aria-label="Cardinality"
            onKeyDown={(event) => rovingRadioKeyDown(event, CARDINALITIES, value, onChange)}
            className="inline-flex rounded-md bg-muted p-0.5 text-xs"
        >
            {CARDINALITIES.map((option) => (
                <button
                    key={option}
                    type="button"
                    role="radio"
                    data-value={option}
                    aria-checked={option === value}
                    tabIndex={option === value ? 0 : -1}
                    onClick={() => onChange(option)}
                    className={cn(
                        'rounded-sm px-2.5 py-1 font-medium transition-colors',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        option === value
                            ? 'bg-background text-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                    )}
                >
                    {option}
                </button>
            ))}
        </div>
    );
}

interface ActionSelectProps {
  readonly label: string;
  readonly value: ReferentialAction | undefined;
  // Actions this dialect offers. The current value is always shown even if the
  // dialect drops it (e.g. SET DEFAULT after switching to MySQL).
  readonly actions: readonly ReferentialAction[];
  readonly onChange: (value: ReferentialAction | undefined) => void;
}

// One ON DELETE / ON UPDATE picker. Radix Select gives full keyboard + focus a11y.
function ActionSelect({ label, value, actions, onChange }: ActionSelectProps) {
    const id = useId();
    // Keep the current value visible even when this dialect doesn't offer it.
    const options = value && !actions.includes(value) ? [value, ...actions] : actions;
    return (
        <div className="flex flex-col gap-1">
            <label htmlFor={id} className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {label}
            </label>
            <Select value={value ?? UNSET} onValueChange={(next) => onChange(toAction(next))}>
                <SelectTrigger id={id} className="h-8 text-xs">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value={UNSET}>Default</SelectItem>
                    {options.map((action) => (
                        <SelectItem key={action} value={action}>
                            {action.toUpperCase()}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}

// --- Menu -------------------------------------------------------------------

export function RelationshipMenu() {
    const { collection } = useSelectionCollection();
    const { dialect } = useDialect();
    const { setCell, removeCells } = useGraph<ElementRecord, LinkRecord<RelationLinkData>>();

    const info = useCells<CellRecord, LinkInfo | null>(collection, selectLinkInfo, linkInfoEqual);

    // Show the menu UNDER THE CURSOR: joint's `link:pointerdown` fires with the press
    // point in paper coords ONLY when a link is pressed — exactly the click that selects
    // it — so the popup opens on the wire you clicked, not at the tables' far-apart
    // midpoint. (Set in the event handler, not an effect body; no ref read in render.)
    //
    // The anchor is TAGGED with the link id it belongs to. Using a bare point made the
    // popup open "somewhere else" whenever the selected link changed WITHOUT a fresh press
    // — a keyboard selection, a re-select, or the render race between the press event and
    // the selection update — because the stale point from the previous click was reused.
    // We only trust the click point when its id matches the currently selected link;
    // otherwise we fall back to the tables' midpoint.
    const [clickAnchor, setClickAnchor] = useState<({ readonly linkId: CellId } & Point) | null>(null);
    // Typed paper events: the camelCase handler receives a params object with the
    // link `id` and the press point in paper coords already extracted.
    useOnPaperEvents({
        onLinkPointerDown: ({ id, x, y }) => setClickAnchor({ linkId: id, x, y }),
    });

    // Fallback: the midpoint of the two connected tables (used for keyboard selection;
    // it also follows table drags).
    const endpointIds = info
        ? [info.sourceId, info.targetId].filter((id): id is CellId => id !== undefined)
        : [];
    const midAnchor = useCells<CellRecord, Point | null>(endpointIds, midpoint, pointEqual);
    // Only use the cursor point when it belongs to the link that's actually selected.
    const openedByClick = !!(info && clickAnchor && clickAnchor.linkId === info.id);
    const clickPoint = openedByClick && clickAnchor
        ? { x: clickAnchor.x, y: clickAnchor.y }
        : null;
    const anchor = clickPoint ?? midAnchor;

    // Move focus INTO the popup when it opens from a CLICK on the wire, so Tab continues into
    // the relationship controls (the user's request) instead of being stranded on the canvas.
    // Keyed on the link id so a fresh click on a DIFFERENT link re-focuses; re-renders of the
    // same open menu don't steal focus back.
    const popupRef = useRef<HTMLDivElement>(null);
    const focusedLinkRef = useRef<CellId | null>(null);
    useEffect(() => {
        if (openedByClick && info && focusedLinkRef.current !== info.id) {
            focusedLinkRef.current = info.id;
            popupRef.current?.focus();
        }
        if (!info) focusedLinkRef.current = null;
    }, [openedByClick, info]);

    if (!info || !anchor) return null;
    const { id, cardinality, onDelete, onUpdate } = info;

    // Cardinality also re-derives the crow's-foot marker style (data + style in one write).
    function applyCardinality(next: Cardinality) {
        setCell(id, (previous) => {
            if (previous.type !== 'link') return previous;
            return { ...previous, data: { ...previous.data, cardinality: next }, style: cardinalityToLinkStyle(next) };
        });
    }

    function patchData(patch: Partial<RelationLinkData>) {
        setCell(id, (previous) => {
            if (previous.type !== 'link') return previous;
            return { ...previous, data: { ...previous.data, ...patch }};
        });
    }

    return (
        <Overlay x={anchor.x} y={anchor.y} origin="bottom" dy={-16}>
            <div
                ref={popupRef}
                tabIndex={-1}
                role="group"
                aria-label="Relationship settings"
                className="min-w-56 animate-rise space-y-3 rounded-lg border border-border bg-popover p-3 text-popover-foreground shadow-lg outline-none"
            >
                <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-semibold tracking-wide">Relationship</span>
                    <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Delete relationship"
                        onClick={() => removeCells([id])}
                        className="size-7 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    >
                        <Trash2 className="size-4" />
                    </Button>
                </div>

                <CardinalityControl value={cardinality} onChange={applyCardinality} />

                <div className="grid grid-cols-2 gap-2">
                    <ActionSelect
                        label="On delete"
                        value={onDelete}
                        actions={DIALECT_REFERENTIAL_ACTIONS[dialect]}
                        onChange={(next) => patchData({ onDelete: next })}
                    />
                    <ActionSelect
                        label="On update"
                        value={onUpdate}
                        actions={DIALECT_REFERENTIAL_ACTIONS[dialect]}
                        onChange={(next) => patchData({ onUpdate: next })}
                    />
                </div>
            </div>
        </Overlay>
    );
}
