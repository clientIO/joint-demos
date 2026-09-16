/**
 * Where a node's floating toolbar goes, as pure geometry in client pixels.
 *
 * Kept free of React and JointJS so the rules can be tested on numbers: the
 * toolbar prefers the space above the node, flips below when that space is
 * short, and slides sideways so it never leaves the VISIBLE canvas.
 */

/** A client-space box, as `getBoundingClientRect()` reports it. */
export interface Box {
    readonly top: number;
    readonly bottom: number;
    readonly left: number;
    readonly right: number;
}

/** The node's extent in client space; only the edges the placement needs. */
export interface NodeExtent {
    readonly top: number;
    readonly bottom: number;
    readonly centerX: number;
}

export interface ToolbarPlacement {
    readonly side: 'top' | 'bottom';
    /** Horizontal shift from the node-centred position, in client pixels. */
    readonly dx: number;
}

/** Room a toolbar with the extended shape grid open needs above a node. */
export const TOOLBAR_CLEARANCE = 320;

/** Breathing space kept between the toolbar and the canvas edges. */
export const EDGE_MARGIN = 8;

/**
 * Places a toolbar of `width` for `node` inside `bounds`, the visible canvas.
 * `bounds` must be the scroller's box, not the paper's: inside a scroller the
 * paper runs far past the viewport, so its edges say nothing about what the
 * user can see.
 */
export function placeToolbar(node: NodeExtent, width: number, bounds: Box): ToolbarPlacement {
    const spaceAbove = node.top - bounds.top;
    const spaceBelow = bounds.bottom - node.bottom;
    const side = spaceAbove < TOOLBAR_CLEARANCE && spaceBelow > spaceAbove ? 'bottom' : 'top';
    const left = node.centerX - width / 2;
    const right = node.centerX + width / 2;
    let dx = 0;
    if (left < bounds.left + EDGE_MARGIN) dx = bounds.left + EDGE_MARGIN - left;
    else if (right > bounds.right - EDGE_MARGIN) dx = bounds.right - EDGE_MARGIN - right;
    return { side, dx };
}
