import { type dia, linkTools } from '@joint/plus';
import { SELECTION_COLOR } from '../const';
import { isDuplicateEvent } from '../events';

/*
 * The link tools of the selected pipe, in the color of the selection (as the frame of a selected element).
 */

/**
 * The arrowheads: dots at the ends of the pipe in the color of the selection, ringed with the background
 * (see `theme/theme-minimal.css`): they stand out on a pipe of any color. Dragging one reconnects the end, or moves
 * its anchor along the side of the same element (see `connectionStrategy` in `connections.ts`)
 * - there is no anchor tool.
 */
const arrowheadAttributes = {
    r: 10,
    fill: SELECTION_COLOR,
    stroke: '#ffffff',
    strokeWidth: 2.5,
    cursor: 'move'
};

export const SourceArrowhead = linkTools.SourceArrowhead.extend({
    tagName: 'circle',
    attributes: { ...arrowheadAttributes, class: 'source-arrowhead' }
});

export const TargetArrowhead = linkTools.TargetArrowhead.extend({
    tagName: 'circle',
    attributes: { ...arrowheadAttributes, class: 'target-arrowhead' }
});

/**
 * A vertex of the pipe (the `handleClass` of `linkTools.Vertices`): as the arrowheads, smaller
 * (the colors in `theme/theme-minimal.css`) - a bend, not an end.
 */
export const VertexHandle = linkTools.Vertices.VertexHandle.extend({
    attributes: {
        class: 'vertex-handle',
        r: 7,
        fill: SELECTION_COLOR,
        stroke: '#ffffff',
        strokeWidth: 2.5,
        cursor: 'move'
    }
});

// The original `guard()` of the tool (see `Vertices`)
// TODO: `guard()` is not in the typings of `dia.ToolView` (a library internal) - a public `guard()`, or an option of
// `linkTools.Vertices` deciding which presses add a vertex: clientIO/joint#3540
const toolGuard: (this: dia.ToolView, evt: dia.Event) => boolean = Reflect.get(linkTools.Vertices.prototype, 'guard');

/**
 * The vertices of a selected link (its bends): added by a press on the line of the link itself (`interactiveLinkNode`,
 * no path of the tool over it) - not with Cmd / Ctrl: the press drags a copy of the link (see `EditController`)
 */
export const Vertices = linkTools.Vertices.extend({
    guard(this: dia.ToolView, evt: dia.Event): boolean {
        return isDuplicateEvent(evt) || toolGuard.call(this, evt);
    }
});

/** The options of the vertices of a link: on its line (see `Vertices`), the handles of the bends (see `VertexHandle`) */
export const verticesOptions: linkTools.Vertices.Options = {
    handleClass: VertexHandle,
    vertexAdding: { interactiveLinkNode: 'line' }
};
