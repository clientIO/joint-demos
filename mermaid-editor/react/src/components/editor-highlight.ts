import { StateEffect, StateField } from '@codemirror/state';
import type { EditorState, Extension } from '@codemirror/state';
import { Decoration, EditorView } from '@codemirror/view';
import type { CellId } from '@joint/react-plus';
import { parseFlowchartSpans } from '@/mermaid/flowchart-tree';
import type { DecorationSet } from '@codemirror/view';

/**
 * Links the diagram's selection back to the source text.
 *
 * Mermaid's parser is no help here: `FlowDB` keeps no source positions, so a
 * cell carries no clue about the line it came from. The Lezer grammar behind
 * the syntax highlighting does, though — it tags every node id as a `NodeId`
 * token with exact document offsets, and those ids are the same strings
 * Mermaid used for the cells. Matching the two is a plain string compare.
 *
 * An id occurs once where it is declared and again at every edge that mentions
 * it, so all occurrences are marked and every line holding one is tinted.
 */

/** Grammar term for a node id, in both the standalone and dispatched parsers. */
const NODE_ID = 'NodeId';

/** Replaces the set of highlighted ids. */
export const setHighlightedIds = StateEffect.define<readonly CellId[]>();

const idMark = Decoration.mark({ class: 'cm-mermaid-selected' });
const lineMark = Decoration.line({ class: 'cm-mermaid-selected-line' });

function buildDecorations(state: EditorState, ids: readonly CellId[]): DecorationSet {
    if (ids.length === 0) return Decoration.none;
    const wanted = new Set(ids);
    const marks = [];
    const lines = new Set<number>();

    for (const node of parseFlowchartSpans(state.doc.toString())) {
        if (node.name !== NODE_ID) continue;
        if (!wanted.has(state.doc.sliceString(node.from, node.to))) continue;
        marks.push(idMark.range(node.from, node.to));
        lines.add(state.doc.lineAt(node.from).from);
    }

    for (const from of lines) marks.push(lineMark.range(from));
    // `Decoration.set` needs the ranges sorted; line decorations are collected
    // separately above, so the combined list is not in document order yet.
    return Decoration.set(marks, true);
}

const highlightField = StateField.define<{ ids: readonly CellId[]; deco: DecorationSet }>({
    create: () => ({ ids: [], deco: Decoration.none }),
    update(value, transaction) {
        for (const effect of transaction.effects) {
            if (effect.is(setHighlightedIds)) {
                return {
                    ids: effect.value,
                    deco: buildDecorations(transaction.state, effect.value),
                };
            }
        }
        // Editing shifts every offset, so the ranges have to be rebuilt rather
        // than mapped: the ids may now sit on different lines entirely.
        if (transaction.docChanged) {
            return { ids: value.ids, deco: buildDecorations(transaction.state, value.ids) };
        }
        return value;
    },
    provide: (field) => EditorView.decorations.from(field, (value) => value.deco),
});

export function mermaidSelectionHighlight(): Extension {
    return highlightField;
}

/**
 * Node ids mentioned on the line the cursor sits on — the reverse lookup that
 * lets the caret drive the diagram's selection. A line like `a --> b` yields
 * both ends, which selects the whole edge.
 * @param state - Current editor state.
 * @returns Ids in document order, deduplicated.
 */
export function nodeIdsOnCursorLine(state: EditorState): string[] {
    const line = state.doc.lineAt(state.selection.main.head);
    const ids: string[] = [];
    for (const node of parseFlowchartSpans(state.doc.toString())) {
        if (node.name !== NODE_ID) continue;
        if (node.from < line.from || node.to > line.to) continue;
        const id = state.doc.sliceString(node.from, node.to);
        if (!ids.includes(id)) ids.push(id);
    }
    return ids;
}

/**
 * Offset of the first occurrence of any of `ids`, for scrolling it into view.
 * @param state - Current editor state.
 * @param ids - Ids to look for.
 * @returns The document offset, or `null` when none of them appear.
 */
export function firstOccurrence(state: EditorState, ids: readonly CellId[]): number | null {
    if (ids.length === 0) return null;
    const wanted = new Set(ids);
    for (const node of parseFlowchartSpans(state.doc.toString())) {
        if (node.name !== NODE_ID) continue;
        if (wanted.has(state.doc.sliceString(node.from, node.to))) return node.from;
    }
    return null;
}
