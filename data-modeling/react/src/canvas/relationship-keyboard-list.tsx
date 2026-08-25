// Keyboard access to FK relationships. joint-react link views carry no focusable
// portal (unlike elements), so a keyboard-only user can't Tab to a wire to open the
// RelationshipMenu — which is the ONLY way to change a relationship's cardinality
// (1:1 / 1:N / N:1), its ON DELETE / ON UPDATE actions, or delete it. This renders
// one focusable, aria-labelled button per relation, visually hidden until it takes
// focus (like a skip link): tabbing in reveals a small panel, and activating an
// entry selects that link so the RelationshipMenu (with its own focusable controls)
// opens. That makes the whole relationship-editing feature operable by keyboard.

import {
    useCells,
    useSelectionCollection,
    type CellId,
    type CellRecord,
    type Computed,
} from '@joint/react-plus';
import { isRelationLink, isTableCell } from '@/model/cell-data';

interface RelationEntry {
  readonly id: CellId;
  readonly label: string;
}

function selectRelations(cells: ReadonlyArray<Computed<CellRecord>>): readonly RelationEntry[] {
    const tableName = new Map<CellId, string>();
    for (const cell of cells) {
        if (cell.type === 'element' && isTableCell(cell.data)) tableName.set(cell.id, cell.data.table.name);
    }
    const relations: RelationEntry[] = [];
    for (const cell of cells) {
    // `type === 'link'` narrows the record union; the ends are typed (their
    // `id` is undefined for a point-pinned end).
        if (cell.type !== 'link' || !isRelationLink(cell.data)) continue;
        const { source, target } = cell;
        const sourceName = (source.id !== undefined && tableName.get(source.id)) || 'table';
        const targetName = (target.id !== undefined && tableName.get(target.id)) || 'table';
        relations.push({ id: cell.id, label: `${sourceName} → ${targetName} (${cell.data.cardinality})` });
    }
    return relations;
}

// Structural equality: labels carry no position, so a drag commit is a no-op.
function relationsEqual(a: readonly RelationEntry[], b: readonly RelationEntry[]): boolean {
    return a.length === b.length && a.every((entry, index) => entry.id === b[index]?.id && entry.label === b[index]?.label);
}

// After selecting a relation, the RelationshipMenu mounts asynchronously; move focus
// onto its cardinality control once it appears (retry a few frames) so the keyboard
// user lands in the editor instead of on this now-hidden list.
function focusRelationshipMenu(attempt = 0): void {
    const control = document.querySelector('[role="radiogroup"][aria-label="Cardinality"] button[tabindex="0"]');
    if (control instanceof HTMLElement) {
        control.focus();
        return;
    }
    if (attempt < 12) requestAnimationFrame(() => focusRelationshipMenu(attempt + 1));
}

export function RelationshipKeyboardList() {
    const relations = useCells(selectRelations, relationsEqual);
    const { selectCells } = useSelectionCollection();
    if (relations.length === 0) return null;

    return (
        <div
            role="group"
            aria-label="Edit relationships"
            // sr-only until something inside is focused; then it surfaces as a small panel
            // (a keyboard user tabs in, sees the list, Enter opens that link's menu).
            className="sr-only focus-within:not-sr-only focus-within:fixed focus-within:left-3 focus-within:top-14 focus-within:z-40 focus-within:flex focus-within:max-h-[60vh] focus-within:flex-col focus-within:gap-0.5 focus-within:overflow-auto focus-within:rounded-lg focus-within:border focus-within:border-border focus-within:bg-popover focus-within:p-2 focus-within:shadow-lg"
        >
            <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Relationships</p>
            {relations.map((relation) => (
                <button
                    key={relation.id}
                    type="button"
                    onClick={() => {
                        selectCells([relation.id]);
                        focusRelationshipMenu();
                    }}
                    className="rounded px-2 py-1 text-left text-xs text-popover-foreground outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
                >
          Edit {relation.label}
                </button>
            ))}
        </div>
    );
}
