// A free-floating sticky note that renders MARKDOWN (GFM) when idle and swaps in a
// raw <textarea> while editing — the same model as the AI workflow builder demo, so
// a note can hold a formatted how-to, a checklist, a table. An HTMLBox on the HTML
// overlay (warm + distinct from the mono table cards).
//
// Warm + quiet + on-brand: a dedicated amber "paper" surface (`--note-*` tokens, hue
// ~80, the key-gold family as `--type-pk`) reads as a real sticky and carries its OWN
// high-contrast ink so both the rendered Markdown and the editor stay readable in
// both themes. Double-click (or Enter on the focused card) edits; Escape / blur
// returns to the rendered view. Dragging the body still moves the note.

import { useRef, useState } from 'react';
import {
    FreeTransform,
    HTMLBox,
    selectElementData,
    useCell,
    useCellId,
    useGraph,
    useIsCellSelected,
    useSelectionCollection,
    type ElementRecord,
} from '@joint/react-plus';
import { cn } from '@/utils/cn';
import { MarkdownView } from '@/components/ui/markdown';
import { isNoteCell, type ElementCellData, type NoteCellData } from '@/model/cell-data';

// react-markdown is imported directly (not lazily): the seed intro note is on screen at
// load, so a lazy chunk just flashed the RAW markdown (the Suspense fallback) for a few
// frames before the renderer landed. Bundling it renders the preview from frame one.

// Cede the box visuals to the inner note surface (jj-box defaults would fight the
// warm paper). A module const so it isn't reallocated per render.
const BOX_RESET: React.CSSProperties = { padding: 0, border: 'none', background: 'transparent' };

// Keep the paper from starting a drag while typing/selecting in the editor.
function stopPointer(event: React.PointerEvent): void {
    event.stopPropagation();
}

export function NoteCard() {
    const id = useCellId();
    const data = useCell(selectElementData<ElementCellData>);
    const api = useGraph<ElementRecord<NoteCellData>>();
    const selected = useIsCellSelected();
    const { selectCells } = useSelectionCollection();
    const cardRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    // `draft` holds the in-progress text WHILE editing (null = not editing). Keeping it
    // local means each keystroke does NOT touch the cell, so a whole edit collapses into
    // ONE undo entry (committed on blur) instead of one-per-character — and nothing
    // reads the note text mid-edit (the Markdown preview is hidden while the textarea is
    // up), so there's no live consumer to keep in sync.
    const [draft, setDraft] = useState<string | null>(null);
    const editing = draft !== null;

    if (!isNoteCell(data)) return null;
    const { text } = data;

    function startEditing(): void {
        setDraft(text);
        // Focus once the textarea has mounted.
        requestAnimationFrame(() => textareaRef.current?.focus());
    }

    // Leave the editor, writing the draft back as a SINGLE history step (only if it
    // actually changed). Shared by blur and Escape.
    function commit(): void {
        if (draft !== null && draft !== text) {
            api.setCell(id, (previous) => {
                if (!api.isElement(previous)) return previous;
                const previousData = previous.data;
                if (!isNoteCell(previousData)) return previous;
                return { ...previous, data: { ...previousData, text: draft }};
            });
        }
        setDraft(null);
    }

    return (
        <>
            {selected ? <FreeTransform minWidth={160} minHeight={80} /> : null}
            <HTMLBox style={BOX_RESET} useModelGeometry>
                <div
                    ref={cardRef}
                    data-node-card
                    // Same "you are here" ring as the table cards (index.css).
                    data-selected={selected || undefined}
                    // In the Tab order so a keyboard user can REACH a note while stepping through
                    // the scene (a rendered-Markdown note has no inner control to land on, unlike
                    // a table's header button — tabindex="-1" made it unreachable). role
                    // "application" keeps it a valid focusable widget (WCAG focus-order-semantics)
                    // and its own key handler owns Enter (edit) / Delete (remove) / Esc.
                    tabIndex={0}
                    role="application"
                    aria-roledescription="diagram node"
                    aria-label="Sticky note. Press Enter to edit, Delete to remove."
                    onDoubleClick={() => {
                        if (!editing) startEditing();
                    }}
                    onKeyDown={(event) => {
                        if (!editing && event.key === 'Enter' && event.target === cardRef.current) {
                            event.preventDefault();
                            startEditing();
                        }
                    }}
                    className={cn(
                        // No node-lift: a note is draggable content, not a button — the hover
                        // translateY made it "jump". Just a steady elevation + the selection ring.
                        // text-left: the HTMLBox overlay defaults to centered text; a note is prose,
                        // so pin it left (else the rendered Markdown reads center-aligned).
                        'flex h-full w-full flex-col overflow-hidden rounded-lg border border-note-border bg-note p-3 text-left text-note-foreground outline-none',
                        'focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
                        'node-elevation animate-card-in',
                    )}
                >
                    {editing ? (
                        <textarea
                            ref={textareaRef}
                            aria-label="Sticky note (Markdown)"
                            placeholder="Write Markdown…"
                            value={draft ?? ''}
                            onChange={(event) => setDraft(event.target.value)}
                            onPointerDown={stopPointer}
                            onBlur={commit}
                            onKeyDown={(event) => {
                                // Esc commits the edit (one undo step) and focuses the node (selecting
                                // it) so the next Delete/Backspace removes the note instead of text.
                                if (event.key === 'Escape') {
                                    event.preventDefault();
                                    commit();
                                    selectCells([id]);
                                    cardRef.current?.focus();
                                }
                            }}
                            className={cn(
                                'h-full w-full resize-none bg-transparent font-sans text-sm leading-relaxed text-note-foreground outline-none',
                                'placeholder:text-note-foreground/70',
                            )}
                        />
                    ) : text.trim() ? (
                    // Rendered Markdown. Dragging the body still moves the note (no
                    // stopPropagation here); double-click enters edit.
                        <div className="min-h-0 flex-1 overflow-auto">
                            <MarkdownView markdown={text} className="text-note-foreground [&_a]:text-note-foreground" />
                        </div>
                    ) : (
                        <button
                            type="button"
                            // The card is the single Tab stop (Enter edits); this hint is a mouse
                            // affordance only, kept out of the tab order so a note isn't two stops.
                            tabIndex={-1}
                            onClick={startEditing}
                            onPointerDown={stopPointer}
                            className="m-auto text-sm italic text-note-foreground/50"
                        >
              Empty note — click to edit
                        </button>
                    )}
                </div>
            </HTMLBox>
        </>
    );
}
