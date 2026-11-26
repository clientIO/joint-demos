import { selectElementAngle, selectElementSize, useCell } from '@joint/react-plus';
import { FlipProvider } from './directional';
import { shapePortsOf, type Size } from './geometry';
import { Stubs, Terminals } from './parts';
import { specOf } from './registry';
import { ShapeLabel } from './shape-label';
import { useSurface } from './surface';
import type { ShapeData, ShapeSpec } from './types';

interface ShapeDrawingProps {
    readonly spec: ShapeSpec;
    readonly data: ShapeData;
    readonly size: Size;
    /** The rotation of the element; the label is kept horizontal. */
    readonly angle: number;
    readonly hasLabel: boolean;
}

/**
 * The whole drawing of an element: the stubs under its symbol, the symbol (its directional parts mirrored by its
 * flip), the stubs over it, the terminals, the label. The data attributes say its state to the stylesheets
 * (the run-mode animations, the locked look).
 */
export function ShapeDrawing({ spec, data, size, angle, hasLabel }: ShapeDrawingProps) {
    const surface = useSurface(spec, data.style);
    const ports = shapePortsOf(spec, data, size);
    const { Drawing } = spec;
    const { width, height } = size;
    return (
        <g
            className="scada-shape"
            data-kind={spec.kind}
            data-power={data.plant?.power ? true : undefined}
            data-open={data.plant?.open ? true : undefined}
            data-locked={data.locked === true ? true : undefined}
            data-finish={surface.finish}
        >
            {surface.defs}
            <Stubs ports={ports} size={size} surface={surface} z={0} />
            <FlipProvider value={{ flip: data.flip, width, height }}>
                <Drawing width={width} height={height} data={data} surface={surface} />
            </FlipProvider>
            <Stubs ports={ports} size={size} surface={surface} z={1} />
            <Terminals ports={ports} size={size} />
            {hasLabel && <ShapeLabel spec={spec} data={data} size={size} angle={angle} />}
        </g>
    );
}

/**
 * An element of the diagram, drawn from its data by its kind. JointJS places, rotates and sizes it; React draws
 * it at its size. A kind the editor doesn't know draws nothing rather than failing the page.
 */
export function ShapeNode(data: ShapeData) {
    const size = useCell(selectElementSize);
    const angle = useCell(selectElementAngle);
    const spec = specOf(data.kind);
    if (!spec) {
        return null;
    }
    return <ShapeDrawing spec={spec} data={data} size={size} angle={angle} hasLabel />;
}
