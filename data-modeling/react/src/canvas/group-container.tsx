// A group container: a labelled, collapsible box that visually wraps the tables
// embedded in it. Rendered as an SVG `<g>` (NOT an HTMLBox) on purpose — HTMLBox
// content is portaled to an overlay layer above the SVG, so keeping the group in
// SVG lets the table cards float above it.
//
// The header (name + collapse toggle) is real HTML inside a `<foreignObject>` so
// the controls are natively focusable and screen-reader labelled; being in the
// SVG, it still sits below the table-card overlay. The body and header bands are
// SVG rects with rounded corners (`rx`).
//
// Edits go through the React `setCell` updater (`patchGroup`): rename writes
// `data.group.name`; the toggle writes `data.group.collapsed` and then calls
// `resizeContainer` for the geometry half (the sole raw-joint touch, owned by
// use-container-resize.ts).

import { useCallback, useRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import {
    selectElementData,
    selectElementSize,
    useCell,
    useCellId,
    useGraph,
    useIsCellSelected,
    type ElementRecord,
} from '@joint/react-plus';
import { GROUP_HEADER } from '@/model/layout';
import { isGroupCell, type ElementCellData, type GroupCellData } from '@/model/cell-data';
import { toggleGroupCollapse } from '@/canvas/group-collapse';
import { GroupMenu } from '@/canvas/group-menu';
import { useCommitOnOutside } from '@/canvas/use-commit-on-outside';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { swatchColor } from '@/appearance/swatches';
import { cn } from '@/utils/cn';
import type { Group } from '@/schema/types';

// Corner radius, mirrors the `--radius-xl` token (base 10 + 4). SVG `rx` needs a
// number, so the token can't be referenced by name here.
const RADIUS_XL = 14;

// Keep the paper from starting a drag when a header control is pressed.
function stopPointer(event: React.PointerEvent): void {
    event.stopPropagation();
}

export function GroupContainer() {
    const id = useCellId();
    const { width, height } = useCell(selectElementSize);
    const data = useCell(selectElementData<ElementCellData>);
    const api = useGraph<ElementRecord<GroupCellData>>();
    const selected = useIsCellSelected();
    const [nameDraft, setNameDraft] = useState<string | null>(null);

    // Arrow-key nudging lives in ONE place — the Diagram keyboard binding in
    // use-canvas-tools (selection-driven, translate-based, so embedded tables
    // follow). A local handler here used to fire IN ADDITION to it, double-moving
    // a focused+selected group.
    const nameInputRef = useRef<HTMLInputElement>(null);
    // Delete/Backspace on a selected group deletes it WITH its content (the native
    // behavior — fastest path, and undo covers mistakes). The ⋮ menu is where the
    // finer choice lives: Remove group (keep tables) vs Remove group + content.

    // The single guarded write path for this group's data (mirrors table-edit).
    const patchGroup = useCallback(
        (map: (group: Group) => Group): void => {
            api.setCell(id, (previous) => {
                if (!api.isElement(previous)) return previous;
                const previousData = previous.data;
                if (!isGroupCell(previousData)) return previous;
                return { ...previous, data: { ...previousData, group: map(previousData.group) }};
            });
        },
        [api, id],
    );

    // Leave the rename when clicking anywhere else — selecting another cell by its body
    // doesn't blur the input on its own (one active edit at a time). `commitName` is a
    // hoisted declaration below; the hook only stores the reference, calling it on an
    // outside press.
    useCommitOnOutside(nameDraft !== null, nameInputRef, commitName);

    // Dispatch guarantees a group cell, but narrow so the types stay honest.
    if (!isGroupCell(data)) return null;
    const { group } = data;

    // Presentation tint (body + header) and header badge color, from the swatch
    // presets chosen in the group inspector. Default = a neutral, clearly-visible
    // panel in BOTH themes (--group-fill / --group-stroke tokens), since --secondary
    // is nearly the canvas color in light mode.
    const tint = data.fill && data.fill !== 'default' ? swatchColor(data.fill) : undefined;
    // Badge resolves the same swatch the inspector picker shows (default included),
    // so the selected swatch always matches the rendered dot.
    const badgeColor = swatchColor(data.badge ?? 'default');
    const bodyFill = tint ?? 'var(--group-fill)';
    const bodyStroke = tint ?? 'var(--group-stroke)';
    const headerBg = tint ? `color-mix(in oklab, var(--group-fill), ${tint} 16%)` : 'var(--group-fill)';

    function commitName(): void {
        if (nameDraft !== null) {
            const next = nameDraft.trim();
            if (next && next !== group.name) patchGroup((current) => ({ ...current, name: next }));
        }
        setNameDraft(null);
    }

    function toggleCollapsed(): void {
    // Collapse geometry flows through the controlled cells: set the size AND the
    // collapsed flag together via setCell. A raw dia.Element.resize() would be
    // overwritten by the next controlled-cells render (stale = box stays open).
        api.setCell(id, (previous) => {
            if (!api.isElement(previous)) return previous;
            const previousData = previous.data;
            if (!isGroupCell(previousData)) return previous;
            const next = toggleGroupCollapse(previous.size ?? { width, height }, previousData);
            return { ...previous, size: next.size, data: next.data };
        });
    }

    return (
        <g>
            {/* Body FILL only — the border is a separate rect drawn LAST (below), so the
          header band can't cover half of it. OPAQUE (a translucent body let whatever's
          behind — a note, another group — bleed through, which read as wrong); the
          overlap case is handled by z instead: a SELECTED group lifts above the others
          (see group-element), so the group you're working with is never buried. A
          chosen tint stays faint on purpose. */}
            <rect
                width={width}
                height={height}
                rx={RADIUS_XL}
                ry={RADIUS_XL}
                fill={bodyFill}
                fillOpacity={tint ? 0.1 : 1}
            />
            {/* Header: real HTML for a focusable name + collapse toggle. */}
            <foreignObject x={0} y={0} width={width} height={GROUP_HEADER}>
                <div
                    // Collapsed = the whole group IS the header, so round all corners and
                    // drop the divider; expanded keeps a rounded top + bottom divider.
                    className={cn(
                        'flex h-full items-center gap-2 px-3',
                        group.collapsed ? 'rounded-xl' : 'rounded-t-xl border-b',
                    )}
                    style={{ backgroundColor: headerBg, borderColor: tint ?? 'var(--group-stroke)' }}
                >
                    {/* Header badge: always shown (primary by default), color set in the inspector. */}
                    <span
                        aria-hidden="true"
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: badgeColor }}
                    />

                    {nameDraft === null ? (
                        <div
                            role="button"
                            tabIndex={0}
                            aria-label={`Group ${group.name || '(unnamed)'}. Click or press Enter to rename, drag to move.`}
                            // A div (not a native button) so a real drag reaches the paper and the
                            // header stays the group's drag handle. SINGLE-click renames; a drag moves the
                            // group — joint withholds the click past clickThreshold, so a drag-to-move
                            // never opens the rename input (no guard needed here).
                            onClick={() => setNameDraft(group.name)}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter' || event.key === 'F2') setNameDraft(group.name);
                            }}
                            className="min-w-0 flex-1 cursor-text select-none truncate rounded-sm px-1 py-0.5 text-left text-sm font-medium text-secondary-foreground transition-colors hover:bg-background/30"
                        >
                            {group.name || <span className="italic opacity-70">unnamed</span>}
                        </div>
                    ) : (
                        <input
                            ref={nameInputRef}
                            autoFocus
                            aria-label="Group name"
                            value={nameDraft}
                            onChange={(event) => setNameDraft(event.target.value)}
                            onFocus={(event) => event.target.select()}
                            onBlur={commitName}
                            onPointerDown={stopPointer}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter') commitName();
                                else if (event.key === 'Escape') setNameDraft(null);
                            }}
                            className="min-w-0 flex-1 rounded-sm bg-background px-1 py-0.5 text-sm font-medium text-secondary-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        />
                    )}

                    <GroupMenu id={id} name={group.name} />

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button
                                type="button"
                                aria-expanded={!group.collapsed}
                                aria-label={group.collapsed ? `Expand group ${group.name}` : `Collapse group ${group.name}`}
                                onClick={toggleCollapsed}
                                onPointerDown={stopPointer}
                                className="shrink-0 rounded-sm p-0.5 text-muted-foreground outline-none hover:text-secondary-foreground focus-visible:ring-2 focus-visible:ring-ring"
                            >
                                {/* The icon shows the ACTION the click performs, not the current state:
                    an OPEN group shows a "hide" (EyeOff) since clicking collapses it; a
                    COLLAPSED group shows an "eye" since clicking reveals it. */}
                                {group.collapsed ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                            </button>
                        </TooltipTrigger>
                        <TooltipContent>{group.collapsed ? 'Show group' : 'Hide group'}</TooltipContent>
                    </Tooltip>
                </div>
            </foreignObject>

            {/* Border drawn LAST with fill:none, so it paints ON TOP of the header's HTML
          background. Otherwise the header band (a foreignObject at x=0) covers the inner
          half of the stroke, so the border looks thinner across the header than down the
          body (the mismatch the user hit). One uniform stroke all around. SELECTED: the
          SAME stroke turns primary (the group is SVG — no [data-node-card] outline ring,
          and joint's `.jj-selection` wrapper draws nothing here). pointer-events off so
          the header controls under it stay live. */}
            <rect
                width={width}
                height={height}
                rx={RADIUS_XL}
                ry={RADIUS_XL}
                fill="none"
                stroke={selected ? 'var(--color-primary)' : bodyStroke}
                strokeOpacity={selected ? 1 : tint ? 0.55 : 1}
                strokeWidth={selected ? 2 : 1.5}
                // A selected group's outline is DASHED so it reads as a container boundary, distinct
                // from the SOLID focus ring on an actionable element (a table/button) inside it —
                // the two no longer look like the same conflicting outline.
                strokeDasharray={selected ? '7 5' : undefined}
                style={{ pointerEvents: 'none' }}
            />
        </g>
    );
}
