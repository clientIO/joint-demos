import type { dia } from '@joint/plus';
import { useCellId } from '@joint/react-plus';
import { createContext, useContext } from 'react';

import type { AddChoice } from './add-menu';
import type { MoveScope } from './actions';
import type { MenuRequest } from './components/menu';
import type { DiagramData } from './data/diagram-data';
import type { Mark, Marks } from './highlights';
import { DecisionModel, EndModel, GroupStartModel, StartModel, StepModel } from './shapes';
import type { GroupModel, LinkModel } from './shapes';

export const MIN_ZOOM = 0.2;
export const MAX_ZOOM = 3;

/** What can be selected: every element with a picture - not the end of a group, not an add button. */
export type Selectable = StepModel | DecisionModel | StartModel | EndModel | GroupStartModel;

export function isSelectable(cell: dia.Cell): cell is Selectable {
    return StepModel.isStep(cell) || DecisionModel.isDecision(cell) || StartModel.isStart(cell) || EndModel.isEnd(cell) || GroupStartModel.isGroupStart(cell);
}

/**
 * The editor, for every component of the app: the data and the graph, the
 * history, the marks on the cells, the move in progress, the menu that is
 * open, and the edits - each a change of the data, after which the graph is
 * rebuilt. The selection is the diagram's own (`useSelectionCollection()`).
 */
export interface EditorApi {
    data: DiagramData;
    graph: dia.Graph;
    /** Bumped after every change of the data: what reads the data re-renders on it. */
    version: number;

    /** The marks on the cells: the previews and the move in progress (see `highlights.ts`). A cell reads its own with `useCellMark()`. */
    marks: Marks;

    /** The element being moved, if any. While one is, the drop points take it and add nothing. */
    moved: dia.Element | null;
    /** What the move in progress takes along: the element alone, or the branch below it too; `null` while no move is on. */
    movedScope: MoveScope | null;
    canMove(element: dia.Element, scope: MoveScope): boolean;
    startMove(element: dia.Element, scope: MoveScope): void;
    cancelMove(): void;
    canDropBelow(parent: dia.Element): boolean;
    canDropOnLink(link: LinkModel): boolean;
    dropBelow(parent: dia.Element): void;
    dropOnLink(link: LinkModel): void;

    addBelow(parent: dia.Element, choice: AddChoice): void;
    insertOnLink(link: LinkModel, choice: AddChoice): void;
    /** Whether the element `id`, just added and selected, still wants the cursor in its first field - once: the inspector asks after it renders the fields. */
    takeFocus(id: dia.Cell.ID): boolean;
    /** Removes `target`: alone - its children move up in its place - or with the branch below it. */
    remove(target: dia.Element, scope: MoveScope): void;
    toggleGroup(group: GroupModel): void;
    /** Turns what a removal of `target` with `scope` would take red, or takes the red off with `null`. */
    previewDeletion(target: dia.Element | null, scope: MoveScope): void;
    /** Fades what a collapse of `group` would hide - or restores it, with `null`. */
    previewCollapse(group: GroupModel | null): void;
    /** Fades what a move of `target` with `scope` would take along - or restores it, with `null`. */
    previewMove(target: dia.Element | null, scope: MoveScope): void;

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
    /** The whole diagram in the view, centered. */
    zoomToFit(): void;
    /** The width of the diagram in the view, the start at the top: the view at the start, and after a reset. */
    fit(): void;
}

export const EditorContext = createContext<EditorApi | null>(null);

export function useEditor(): EditorApi {
    const editor = useContext(EditorContext);
    if (!editor) throw new Error('useEditor() needs an <EditorProvider>.');
    return editor;
}

/** The mark on the cell a component renders, or `null` - worn as a class on its content, which the stylesheet paints. */
export function useCellMark(): Mark | null {
    return useEditor().marks.get(useCellId()) ?? null;
}

/** The id of the paper of the diagram: the provider reaches the paper and its scroller by it, from outside of `<Paper>`. */
export const PAPER_ID = 'diagram';
