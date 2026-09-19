import type { dia } from '@joint/plus';
import type { usePaperScroller } from '@joint/react-plus';
import { createContext, useContext } from 'react';

import type { AddChoice, MenuRequest } from './choices';
import type { DiagramData } from './data/DiagramData';
import { Decision, End, GroupStart, Start, Step } from './shapes';
import type { Group, Link } from './shapes';

export const MIN_ZOOM = 0.2;
export const MAX_ZOOM = 3;

/** What can be selected: every element with a picture - not the end of a group, not an add button. */
export type Selectable = Step | Decision | Start | End | GroupStart;

export function isSelectable(cell: dia.Cell): cell is Selectable {
    return Step.isStep(cell) || Decision.isDecision(cell) || Start.isStart(cell) || End.isEnd(cell) || GroupStart.isGroupStart(cell);
}

/**
 * The editor, for every component of the app: the data and the graph, the
 * history, the selection, the move in progress, the menu that is open, and
 * the edits - each a change of the data, after which the graph is rebuilt.
 */
export interface EditorApi {
    data: DiagramData;
    graph: dia.Graph;
    /** Bumped after every change of the data: what reads the data re-renders on it. */
    version: number;

    selectedId: string | null;
    select(id: string | null): void;

    /** The element being moved, if any. While one is, the drop points take it and add nothing. */
    moved: dia.Element | null;
    canMove(element: dia.Element): boolean;
    startMove(element: dia.Element): void;
    cancelMove(): void;
    canDropBelow(parent: dia.Element): boolean;
    canDropOnLink(link: Link): boolean;
    dropBelow(parent: dia.Element): void;
    dropOnLink(link: Link): void;

    addBelow(parent: dia.Element, choice: AddChoice): void;
    insertOnLink(link: Link, choice: AddChoice): void;
    remove(target: dia.Element): void;
    toggleGroup(group: Group): void;
    /** Turns what a deletion of `target` would remove red, or takes the red off with `null`. */
    previewDeletion(target: dia.Element | null): void;

    menu: MenuRequest | null;
    openMenu(request: MenuRequest): void;
    closeMenu(): void;

    undo(): void;
    redo(): void;
    canUndo: boolean;
    canRedo: boolean;
    /** Everything but the start goes. */
    reset(): void;

    zoomIn(): void;
    zoomOut(): void;
    fit(): void;
}

export const EditorContext = createContext<EditorApi | null>(null);

export function useEditor(): EditorApi {
    const editor = useContext(EditorContext);
    if (!editor) throw new Error('useEditor() needs an <EditorProvider>.');
    return editor;
}

/** What the paper-side wiring hands the provider: the paper and the scroller, once mounted. */
export interface View {
    paper: dia.Paper;
    scroller: ReturnType<typeof usePaperScroller>;
}

export const ViewContext = createContext<((view: View | null) => void) | null>(null);
