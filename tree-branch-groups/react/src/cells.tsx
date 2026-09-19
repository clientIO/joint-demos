import { selectCellType, selectElementData, selectElementSize, useCell } from '@joint/react-plus';

import { COLORS, NODE_TYPE } from './shapes';
import type { NodeData } from './shapes';

/**
 * A rectangle with a label. The start of a group is a pill, its end a small
 * round button with a plus.
 */
export function NodeView() {
    const { width, height } = useCell(selectElementSize);
    const { label, role } = useCell(selectElementData<NodeData>);
    const colors = role ? COLORS.gate : COLORS.node;
    const radius = role ? height / 2 : 4;

    return (
        <g>
            <rect
                width={width}
                height={height}
                rx={radius}
                ry={radius}
                fill={colors.fill}
                stroke={colors.stroke}
                strokeWidth={1.5}
            />
            {role === 'end' ? (
                <path
                    d="M -5 0 5 0 M 0 -5 0 5"
                    transform={`translate(${width / 2}, ${height / 2})`}
                    stroke={colors.text}
                    strokeWidth={2}
                    fill="none"
                    pointerEvents="none"
                />
            ) : (
                <text
                    x={width / 2}
                    y={height / 2}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontFamily="sans-serif"
                    fontSize={13}
                    fill={colors.text}
                >
                    {label}
                </text>
            )}
        </g>
    );
}

/**
 * Picks the component by the model type. A node is a labelled rectangle. A
 * group is hidden by the `cellVisibility` of the paper and never gets here;
 * should it, it renders nothing.
 */
export function Cell() {
    // The selector is typed for the React defaults; the graph holds our own types.
    const type: string = useCell(selectCellType);
    switch (type) {
        case NODE_TYPE: return <NodeView />;
        default: return null;
    }
}
