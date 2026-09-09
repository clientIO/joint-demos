import type { CellId } from '@joint/react-plus';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';

/**
 * The "+" under a shape does two things, as in the Mermaid live editor: a
 * click appends a connected step, a drag draws a connection to whichever
 * shape it is dropped on (dropped on empty canvas it appends a step, like the
 * click). The gesture lives on the button itself through pointer capture: the
 * moves and the release come back to it wherever the pointer goes, and no
 * other element gets a leave or enter event until the drop.
 */

/** Pointer travel before a press counts as a drag rather than a click. */
const DRAG_THRESHOLD = 4;

/** Marks the shape a drag would connect to; styled in index.css. */
const TARGET_ATTRIBUTE = 'data-connect-target';

interface Point {
    readonly x: number;
    readonly y: number;
}

/** A drag in flight, in client pixels. */
export interface ConnectDraft {
    readonly from: Point;
    readonly to: Point;
    /** The shape under the pointer that would take the connection. */
    readonly targetId: string | null;
}

interface Gesture {
    readonly sourceId: CellId;
    readonly start: Point;
    isDragging: boolean;
}

type ButtonPointerEvent = ReactPointerEvent<HTMLButtonElement>;

export interface ConnectDrag {
    readonly onPointerDown: (event: ButtonPointerEvent) => void;
    readonly onPointerMove: (event: ButtonPointerEvent) => void;
    readonly onPointerUp: (event: ButtonPointerEvent) => void;
    readonly onPointerCancel: (event: ButtonPointerEvent) => void;
    /**
     * Every activation that is not a drop: the click after a plain press, and
     * Enter / Space. The click that follows a captured drag is swallowed.
     */
    readonly onClick: () => void;
    /** The drag in flight, or `null`. */
    readonly draft: ConnectDraft | null;
}

/** The shape under the pointer, if it is one and not the drag's own source. */
function shapeUnderPointer(point: Point, exceptId: CellId): string | null {
    const root = document.elementFromPoint(point.x, point.y)?.closest('[model-id]');
    if (!(root instanceof Element)) return null;
    const id = root.getAttribute('model-id');
    // Links and subgraph frames carry a model id too; only shapes have a body.
    if (id === null || id === String(exceptId) || root.querySelector('.mermaid-node-body') === null) {
        return null;
    }
    return id;
}

function markTarget(id: string | null): void {
    document.querySelector(`[${TARGET_ATTRIBUTE}]`)?.removeAttribute(TARGET_ATTRIBUTE);
    if (id === null) return;
    document.querySelector(`[model-id="${CSS.escape(id)}"]`)?.setAttribute(TARGET_ATTRIBUTE, '');
}

/**
 * Pointer handlers for the "+" button of `sourceId`, plus the drag in flight.
 * @param sourceId - The shape the button belongs to.
 * @param onConnect - Called with (source, target) when the drag lands on a shape.
 * @param onAddChild - Called for a click (keyboard flagged), or a drag dropped on empty canvas.
 * @param onPress - Called as the press starts, before anything else: the
 *   caller cancels whatever would unmount the button meanwhile (the hover
 *   clear the paper schedules as the pointer crosses from the shape onto it).
 *   Nothing else can: with the pointer captured, no leave event fires on the
 *   shape or the button until the drop.
 */
export function useConnectDrag(
    sourceId: CellId | undefined,
    onConnect: (from: CellId, to: CellId) => void,
    onAddChild: (id: CellId, fromKeyboard: boolean) => void,
    onPress: () => void
): ConnectDrag {
    const [draft, setDraft] = useState<ConnectDraft | null>(null);
    const gesture = useRef<Gesture | null>(null);
    // A click with no pointer press before it came from the keyboard.
    const pressedByPointer = useRef(false);
    // A captured release is followed by a click; after a drag it must do nothing.
    const suppressClick = useRef(false);

    const onPointerDown = useCallback((event: ButtonPointerEvent) => {
        event.stopPropagation();
        if (event.button !== 0 || sourceId === undefined) return;
        pressedByPointer.current = true;
        onPress();
        event.currentTarget.setPointerCapture(event.pointerId);
        gesture.current = { sourceId, start: { x: event.clientX, y: event.clientY }, isDragging: false };
    }, [onPress, sourceId]);

    const onPointerMove = useCallback((event: ButtonPointerEvent) => {
        const current = gesture.current;
        if (current === null) return;
        const to = { x: event.clientX, y: event.clientY };
        if (!current.isDragging) {
            if (Math.hypot(to.x - current.start.x, to.y - current.start.y) < DRAG_THRESHOLD) return;
            current.isDragging = true;
        }
        const targetId = shapeUnderPointer(to, current.sourceId);
        markTarget(targetId);
        setDraft({ from: current.start, to, targetId });
    }, []);

    /** Ends the gesture; a plain press is left to the click that follows. */
    const finish = useCallback((release: Readonly<{ clientX: number; clientY: number }>, shouldCommit: boolean) => {
        const current = gesture.current;
        if (current === null) return;
        gesture.current = null;
        markTarget(null);
        setDraft(null);
        if (!shouldCommit) {
            pressedByPointer.current = false;
            return;
        }
        if (!current.isDragging) return;
        suppressClick.current = true;
        const targetId = shapeUnderPointer({ x: release.clientX, y: release.clientY }, current.sourceId);
        if (targetId === null) onAddChild(current.sourceId, false);
        else onConnect(current.sourceId, targetId);
    }, [onAddChild, onConnect]);

    const onPointerUp = useCallback((event: ButtonPointerEvent) => finish(event, true), [finish]);
    const onPointerCancel = useCallback((event: ButtonPointerEvent) => finish(event, false), [finish]);

    const onClick = useCallback(() => {
        const fromKeyboard = !pressedByPointer.current;
        pressedByPointer.current = false;
        if (suppressClick.current) {
            suppressClick.current = false;
            return;
        }
        if (sourceId !== undefined) onAddChild(sourceId, fromKeyboard);
    }, [onAddChild, sourceId]);

    useEffect(() => {
        if (draft === null) return;
        // Escape abandons the drag; the release and click that follow do nothing.
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return;
            gesture.current = null;
            suppressClick.current = true;
            markTarget(null);
            setDraft(null);
        };
        // Should the button unmount mid-drag (a re-render of the overlay), the
        // pointer capture goes with it and the release is only heard here.
        const onWindowUp = (event: PointerEvent) => finish(event, true);
        const onWindowCancel = (event: PointerEvent) => finish(event, false);
        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('pointerup', onWindowUp, true);
        window.addEventListener('pointercancel', onWindowCancel, true);
        return () => {
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('pointerup', onWindowUp, true);
            window.removeEventListener('pointercancel', onWindowCancel, true);
        };
    }, [draft, finish]);

    return { onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onClick, draft };
}
