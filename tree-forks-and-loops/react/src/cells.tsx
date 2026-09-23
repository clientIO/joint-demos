import { selectCellType, selectElementData, selectElementSize, useCell } from '@joint/react-plus';

import { COLORS, GROUP_TYPE, NODE_TYPE } from './shapes';
import type { NodeData } from './shapes';

/**
 * A rectangle with a label. The start node of a group is a pill, labelled with
 * the kind of the group - it is the group on the screen, collapsed or not. The
 * end node is a point of the layout and draws nothing at all.
 */
export function NodeView() {
    const { width, height } = useCell(selectElementSize);
    const { label, role } = useCell(selectElementData<NodeData>);
    // Nothing to draw, but something to render: a view with no content of its
    // own leaves the links that end on it hidden.
    if (role === 'end') return <rect width={width} height={height} fill="none" stroke="none" />;
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
        </g>
    );
}

/**
 * A translucent slab, exactly the box the group spans, letting the pointer
 * through to the content. It is scaffolding of the layout and is drawn only
 * while the slabs are switched on (see `layout.ts`); what stands for a group
 * on the screen is its start node. The toggle of the group is a tool (see
 * `tools.ts`): it flips the `collapsed` flag on the model, and the editor
 * picks the change up and lays the tree out again.
 */
export function GroupView() {
    const { width, height } = useCell(selectElementSize);

    return (
        <rect
            width={width}
            height={height}
            rx={6}
            ry={6}
            fill={COLORS.group.fill}
            opacity={0.2}
            pointerEvents="none"
        />
    );
}

/**
 * Picks the component by the model type. Two models, two looks: a node is a
 * labelled rectangle, a group is the slab around its branches. Anything else
 * (there is nothing else) renders nothing.
 */
export function Cell() {
    // The selector is typed for the React defaults; the graph holds our own types.
    const type: string = useCell(selectCellType);
    switch (type) {
        case NODE_TYPE: return <NodeView />;
        case GROUP_TYPE: return <GroupView />;
        default: return null;
    }
}
