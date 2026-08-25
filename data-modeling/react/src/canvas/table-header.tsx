// Table card header: the inline-editable table name plus a comment affordance.
// Double-click the name to rename via a controlled <input> (commit on blur /
// Enter, cancel on Escape). The comment icon shows the full comment on hover
// (Tooltip) and opens a popup Dialog on click to edit it in a textarea. Both
// write back through `updateTable` to `data.table.name` / `data.table.comment`.
//
// NOTE: there is deliberately no schema/namespace editor here — the "+ schema"
// affordance was removed on request. `Table.schema` still exists in the model and
// round-trips through SQL import/export (a schema-qualified CREATE TABLE parses and
// re-emits); it simply isn't editable from the card.
//
// Editing state is a `string | null` draft (null == not editing / dialog
// closed). Entering edit seeds the draft in the click handler and exiting clears
// it — all in event handlers, so there is no setState-in-effect.

import { useRef, useState } from 'react';
import { MessageSquarePlus, MessageSquare } from 'lucide-react';
import type { CellId } from '@joint/react-plus';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { updateTable, type TableGraph } from '@/canvas/table-edit';
import { useCommitOnOutside } from '@/canvas/use-commit-on-outside';
import { cn } from '@/utils/cn';

interface TableHeaderProps {
  readonly id: CellId;
  readonly name: string;
  readonly comment?: string;
  readonly graph: TableGraph;
}

// Keep a magnet-row / drag interaction from starting when the user presses on an
// interactive control (input, button). Attached to every editable affordance.
function stopPointer(event: React.PointerEvent): void {
    event.stopPropagation();
}

export function TableHeader({ id, name, comment, graph }: TableHeaderProps) {
    const [nameDraft, setNameDraft] = useState<string | null>(null);
    const [commentDraft, setCommentDraft] = useState<string | null>(null);
    const nameInputRef = useRef<HTMLInputElement>(null);

    function commitName(): void {
        if (nameDraft !== null) {
            const next = nameDraft.trim();
            if (next && next !== name) updateTable(graph, id, (table) => ({ ...table, name: next }));
        }
        setNameDraft(null);
    }

    // Leave the rename when clicking anywhere else — selecting another table by its body
    // doesn't blur the input on its own (one active edit at a time).
    useCommitOnOutside(nameDraft !== null, nameInputRef, commitName);

    function commitComment(): void {
        if (commentDraft !== null) {
            const next = commentDraft.trim();
            const value = next === '' ? undefined : next;
            if (value !== comment) updateTable(graph, id, (table) => ({ ...table, comment: value }));
        }
        setCommentDraft(null);
    }

    return (
        <header className="group/hdr flex flex-col gap-1 border-b border-border px-5 py-2">
            <div className="flex items-center gap-2">
                {nameDraft === null ? (
                    <div
                        role="button"
                        tabIndex={0}
                        aria-label={`Table ${name || '(unnamed)'}. Click or press Enter to rename, drag to move.`}
                        // A div (not a native button) so the drag reaches the paper and the header
                        // doubles as the table's drag handle. SINGLE-click renames; a drag moves the
                        // table — joint withholds the click past clickThreshold, so a drag-to-move never
                        // opens the rename input (no guard needed here). cursor-text signals it's editable.
                        onClick={() => setNameDraft(name)}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === 'F2') setNameDraft(name);
                        }}
                        className="min-w-0 flex-1 cursor-text select-none truncate rounded-sm px-1 py-0.5 text-left font-mono text-sm font-semibold text-card-foreground transition-colors hover:bg-background/50"
                    >
                        {name || <span className="italic text-muted-foreground">unnamed</span>}
                    </div>
                ) : (
                    <input
                        ref={nameInputRef}
                        autoFocus
                        aria-label="Table name"
                        value={nameDraft}
                        onChange={(event) => setNameDraft(event.target.value)}
                        onFocus={(event) => event.target.select()}
                        onBlur={commitName}
                        onPointerDown={stopPointer}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter') commitName();
                            else if (event.key === 'Escape') setNameDraft(null);
                        }}
                        className="min-w-0 flex-1 rounded-sm bg-background px-1 py-0.5 font-mono text-sm font-semibold text-card-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                )}
                <Tooltip>
                    <TooltipTrigger asChild>
                        <button
                            type="button"
                            aria-label={comment ? `Edit comment: ${comment}` : 'Add comment'}
                            onClick={() => setCommentDraft(comment ?? '')}
                            onPointerDown={stopPointer}
                            className="shrink-0 rounded-sm p-0.5 text-muted-foreground outline-none hover:text-card-foreground focus-visible:ring-2 focus-visible:ring-ring"
                        >
                            {comment ? (
                                <MessageSquare className="size-3.5" />
                            ) : (
                                <MessageSquarePlus className="size-3.5 opacity-60" />
                            )}
                        </button>
                    </TooltipTrigger>
                    {comment ? <TooltipContent>{comment}</TooltipContent> : null}
                </Tooltip>
            </div>

            {/* onOpenChange(false) covers Esc, overlay click, and the X — all cancel by
          discarding the draft. Save commits explicitly. */}
            <Dialog open={commentDraft !== null} onOpenChange={(next) => (next ? undefined : setCommentDraft(null))}>
                <DialogContent className="max-w-md gap-4" onPointerDown={stopPointer}>
                    <DialogHeader>
                        <DialogTitle>{comment ? 'Edit comment' : 'Add comment'}</DialogTitle>
                        <DialogDescription>
              A note on the <span className="font-mono">{name}</span> table. Save with Enter, cancel with Escape.
                        </DialogDescription>
                    </DialogHeader>
                    <textarea
                        autoFocus
                        aria-label="Table comment"
                        placeholder="Add a comment…"
                        value={commentDraft ?? ''}
                        onChange={(event) => setCommentDraft(event.target.value)}
                        onKeyDown={(event) => {
                            // Enter saves; Shift+Enter inserts a newline. Escape falls through
                            // to the Dialog (onOpenChange -> cancel).
                            if (event.key === 'Enter' && !event.shiftKey) {
                                event.preventDefault();
                                commitComment();
                            }
                        }}
                        className={cn(
                            'h-28 w-full resize-none rounded-md border border-input bg-background px-3 py-2',
                            'text-sm leading-relaxed text-foreground shadow-sm transition-colors',
                            'placeholder:text-muted-foreground/70',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        )}
                    />
                    <div className="flex items-center justify-end gap-2">
                        <Button type="button" variant="ghost" onClick={() => setCommentDraft(null)}>
              Cancel
                        </Button>
                        <Button type="button" onClick={commitComment}>
              Save
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </header>
    );
}
