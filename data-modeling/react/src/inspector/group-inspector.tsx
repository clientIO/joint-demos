// Right-docked inspector for a single selected GROUP. Reads the live selection
// (useSelectionCollection.collection -> reactive useCells) and, when EXACTLY one
// group element is selected, derives it during render — no setState-in-effect —
// exposing rename, a background-fill swatch, a header-badge swatch, and a
// collapse/expand toggle. Any other selection renders nothing.
//
// Presentation writes (fill/badge) go to the cell `data` (not the domain Group);
// the rename goes to `data.group.name`. Every write is guarded by isElement +
// isGroupCell so the typed payload stays honest (mirrors group-container.tsx).

import { memo } from 'react';
import {
    useCells,
    useGraph,
    useSelectionCollection,
    type CellId,
    type ElementRecord,
    type GraphApi,
} from '@joint/react-plus';
import { InspectorShell } from '@/inspector/inspector-shell';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SwatchRow } from '@/appearance/swatch-row';
import { isGroupCell, type GroupCellData, type SwatchKey } from '@/model/cell-data';
import { toggleGroupCollapse } from '@/canvas/group-collapse';
import { Eye, EyeOff } from 'lucide-react';
import type { Group } from '@/schema/types';

type GroupApi = GraphApi<ElementRecord<GroupCellData>>;

// memo'd for the same reason as TableInspector — keep the per-frame controlled-cells
// cascade from re-running this panel during a drag.
export const GroupInspector = memo(function GroupInspector() {
    const { collection } = useSelectionCollection();
    // Re-render only when the selected cell's DATA changes, not on position-only drag
    // commits (see TableInspector for the rationale).
    const only = useCells(
        collection,
        (cells) => (cells.length === 1 ? cells[0] : undefined),
        (a, b) => a?.id === b?.id && a?.data === b?.data,
    );
    const api = useGraph<ElementRecord<GroupCellData>>();

    // The single selection must be a group element.
    if (!only || !isGroupCell(only.data)) return null;
    const { group } = only.data;
    const fill = only.data.fill ?? 'default';
    const badge = only.data.badge ?? 'default';

    return (
        <InspectorShell
            label={`Inspector for group ${group.name}`}
            title={group.name || 'group'}
        >
            <header className="flex shrink-0 items-center gap-2 border-b border-border px-4 py-3 pr-14 lg:pr-4">
                <span className="size-2.5 shrink-0 rounded-full bg-primary" aria-hidden />
                <h2 className="truncate text-sm font-semibold text-foreground">
                    {group.name || 'Untitled group'}
                </h2>
                <span className="ml-auto text-[11px] uppercase tracking-wide text-muted-foreground">Group</span>
            </header>

            <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-4">
                <section className="flex flex-col gap-2">
                    <Label
                        htmlFor="group-name"
                        className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
                    >
            Name
                    </Label>
                    <Input
                        id="group-name"
                        value={group.name}
                        onChange={(event) =>
                            patchGroup(api, only.id, (current) => ({ ...current, name: event.target.value }))
                        }
                        placeholder="Group name"
                        className="h-9"
                    />
                </section>

                <section className="flex flex-col gap-4">
                    <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Appearance</h3>
                    <div className="flex items-center justify-between gap-3">
                        <span className="text-sm text-foreground">Background</span>
                        <SwatchRow
                            label="Background"
                            value={fill}
                            onChange={(value) => patchGroupData(api, only.id, { fill: value })}
                        />
                    </div>
                    <div className="flex items-center justify-between gap-3">
                        <span className="text-sm text-foreground">Badge</span>
                        <SwatchRow
                            label="Badge"
                            value={badge}
                            onChange={(value) => patchGroupData(api, only.id, { badge: value })}
                        />
                    </div>
                </section>

                <section className="flex flex-col gap-2">
                    <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Layout</h3>
                    <button
                        type="button"
                        aria-pressed={group.collapsed}
                        onClick={() => toggleCollapsed(api, only.id)}
                        className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm text-card-foreground outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
                    >
                        {/* Label + icon name the ACTION the click performs: an open group shows
                "Hide" (EyeOff); a collapsed group shows "Show" (Eye). */}
                        {group.collapsed ? (
                            <Eye className="size-4 text-muted-foreground" aria-hidden />
                        ) : (
                            <EyeOff className="size-4 text-muted-foreground" aria-hidden />
                        )}
                        {group.collapsed ? 'Show group' : 'Hide group'}
                    </button>
                </section>
            </div>
        </InspectorShell>
    );
});

// --- Guarded writes --------------------------------------------------------

function patchGroup(api: GroupApi, id: CellId, map: (group: Group) => Group): void {
    api.setCell(id, (previous) => {
        if (!api.isElement(previous)) return previous;
        if (!isGroupCell(previous.data)) return previous;
        return { ...previous, data: { ...previous.data, group: map(previous.data.group) }};
    });
}

function patchGroupData(
    api: GroupApi,
    id: CellId,
    patch: { readonly fill?: SwatchKey; readonly badge?: SwatchKey },
): void {
    api.setCell(id, (previous) => {
        if (!api.isElement(previous)) return previous;
        if (!isGroupCell(previous.data)) return previous;
        return { ...previous, data: { ...previous.data, ...patch }};
    });
}

// Collapse geometry MUST flow through the controlled cells (size + flag together),
// mirroring group-container.toggleCollapsed — a lone flag leaves the box full height.
function toggleCollapsed(api: GroupApi, id: CellId): void {
    api.setCell(id, (previous) => {
        if (!api.isElement(previous)) return previous;
        if (!isGroupCell(previous.data)) return previous;
        // ponytail: a selected+rendered group always has a size; 0×0 is a dead fallback.
        const next = toggleGroupCollapse(previous.size ?? { width: 0, height: 0 }, previous.data);
        return { ...previous, size: next.size, data: next.data };
    });
}
