import { layout } from '@joint/plus';

interface PortLayoutResult {
    x: number;
    y: number;
    angle: number;
}

interface VerticalLayoutOptions {
    x?: number | 'w';
    y?: number;
    dy?: number;
}

/**
 * Extended port layout namespace that includes the built-in layouts
 * plus the custom `vertical` layout. Passed to Element models via
 * the `portLayoutNamespace` constructor option so it is available
 * in both the main thread and the web worker.
 */
export const portLayoutNamespace = {
    ...layout.Port,
    /**
     * Places ports at fixed vertical offsets starting from a given
     * position, instead of distributing them evenly along the element side.
     *
     * When `opt.y` and `opt.dy` are multiples of GRID_SIZE, every port
     * center is guaranteed to fall on a grid intersection.
     */
    vertical: (
        portsArgs: unknown[],
        elBBox: { width: number },
        opt: VerticalLayoutOptions = {}
    ): PortLayoutResult[] => {
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
