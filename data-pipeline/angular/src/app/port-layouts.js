import { layout } from '@joint/plus';

/**
 * Extended port layout namespace that includes the built-in layouts
 * plus the custom `vertical` layout. Passed to Element models via
 * the `portLayoutNamespace` constructor option so it is available
 * in both the main thread and the web worker.
 */
export const portLayoutNamespace = {
    ...layout.Port,
    /**
     * Places ports at fixed vertical (or horizontal) offsets starting
     * from a given position, instead of distributing them evenly along
     * the element side.
     *
     * When `opt.y` and `opt.dy` are multiples of GRID_SIZE, every port
     * center is guaranteed to fall on a grid intersection.
     *
     * @param {Array} portsArgs - Array of port definitions (one per port).
     * @param {{ width: number }} elBBox - The element's local bounding box.
     * @param {Object} opt - Layout options.
     * @param {number|'w'} [opt.x=0] - X position. Use `'w'` for the element's width (right side).
     * @param {number} [opt.y=0] - Y offset of the first port center.
     * @param {number} [opt.dy=24] - Vertical distance between consecutive port centers.
     * @returns {{ x: number, y: number, angle: number }[]} Computed port positions.
     */
    vertical: (
        portsArgs,
        elBBox,
        opt = {}
    ) => {
        const x = opt.x === 'w' ? elBBox.width : (opt.x ?? 0);
        const y = opt.y ?? 0;
        const dy = opt.dy ?? 24;
        return portsArgs.map((_, index) => ({
            x,
            y: y + index * dy,
            angle: 0,
        }));
    },
};
