// The draw-to-create capture layer: while a tool is armed this transparent overlay
// owns the pointer, so pressing anywhere (blank paper, over a group, over a table)
// starts the region draw instead of panning or moving an element. The rubber band
// itself is drawn by the react-plus region the press starts (see useCanvasTools) —
// this layer only forwards the pointerdown.
//
// It is also the KEYBOARD placement surface: it's a focusable button that auto-
// focuses on arm and places the tool at the viewport centre on Enter/Space, so the
// primary "add a table/group/note" flow works without a pointer (WCAG 2.1.1). Its
// aria-label tells a screen-reader user exactly how to drop the cell.
import { useEffect, useRef } from 'react';
import type { AddTool } from '@/context/add-tool-context';

const TOOL_LABEL: Record<AddTool, string> = {
    table: 'table',
    group: 'group',
    note: 'note',
};

interface DrawCaptureLayerProps {
  readonly tool: AddTool;
  readonly onPointerDown: (event: React.PointerEvent) => void;
  readonly onPlace: () => void;
}

export function DrawCaptureLayer({ tool, onPointerDown, onPlace }: DrawCaptureLayerProps) {
    const ref = useRef<HTMLDivElement>(null);

    // Move focus to the layer as soon as a tool is armed so a keyboard user can drop
    // the cell with Enter without hunting for the canvas. Only mounts while armed.
    useEffect(() => {
        ref.current?.focus();
    }, []);

    return (
        <div
            ref={ref}
            role="button"
            tabIndex={0}
            aria-label={`Place ${TOOL_LABEL[tool]}: press Enter to drop it in the centre, or drag on the canvas to size it. Press Escape to cancel.`}
            className="absolute inset-0 z-20 cursor-crosshair touch-none outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
            onPointerDown={onPointerDown}
            onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    event.stopPropagation();
                    onPlace();
                }
            }}
        />
    );
}
