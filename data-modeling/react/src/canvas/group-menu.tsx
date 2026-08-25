// The "⋮" actions menu on a group header. A group owns its embedded tables, so a
// plain delete takes the tables with it — which isn't always wanted. This menu gives
// the two sensible choices:
//   • Remove group          — delete the group but KEEP its tables (detach first)
//   • Remove group + content — delete the group AND its tables
// (A standalone "Detach content" was dropped — leaving an empty group around tripped
// the containment re-embed loop.) Unembedding for "Remove group" must go through the
// raw dia.Graph (a controlled setCell can add a parent but can't remove one), the same
// sanctioned escape hatch use-containment-embedding uses; it flows back out via
// onCellsChange, and the group is deleted immediately after so nothing re-embeds.

import { FolderMinus, MoreVertical, Trash2 } from 'lucide-react';
import { useGraph, type CellId } from '@joint/react-plus';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

function stopPointer(event: React.PointerEvent): void {
    event.stopPropagation();
}

export function GroupMenu({ id, name }: { readonly id: CellId; readonly name: string }) {
    const { graph, removeCells } = useGraph();

    // Ids of the tables embedded in this group, read off the graph at event time.
    function childIds(): CellId[] {
        const group = graph.getCell(id);
        return group ? group.getEmbeddedCells().map((cell) => cell.id) : [];
    }

    function detachContent(): void {
        const group = graph.getCell(id);
        if (!group) return;
        for (const child of group.getEmbeddedCells()) group.unembed(child);
    }

    function removeKeepingContent(): void {
        detachContent(); // free the tables first so removing the group doesn't take them
        removeCells([id]);
    }

    function removeWithContent(): void {
        removeCells([id, ...childIds()]);
    }

    return (
        <DropdownMenu>
            <Tooltip>
                <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                        <button
                            type="button"
                            aria-label={`Group ${name || '(unnamed)'} actions`}
                            onPointerDown={stopPointer}
                            className="shrink-0 rounded-sm p-0.5 text-muted-foreground outline-none hover:text-secondary-foreground focus-visible:ring-2 focus-visible:ring-ring"
                        >
                            <MoreVertical className="size-4" />
                        </button>
                    </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent>Group actions</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="end" onPointerDown={stopPointer}>
                <DropdownMenuItem onClick={removeKeepingContent}>
                    <FolderMinus className="size-4" /> Remove group
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={removeWithContent} className="text-destructive focus:text-destructive">
                    <Trash2 className="size-4" /> Remove group + content
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
