import { selectCellType, selectElementData, selectElementSize, useCell } from '@joint/react-plus';

import { COLORS, GROUP_LABELS, GROUP_TYPE, NODE_TYPE } from './shapes';
import type { GroupData, NodeData } from './shapes';

/** The stroke of an expanded group. */
const GROUP_STROKE_WIDTH = 12;

/** A rectangle with a label. The start and end of a group are pills. */
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
 * A translucent slab. Expanded, the wide stroke of the same color makes it a
 * bit bigger than the box spanned by the start and end nodes, and it lets the
 * pointer through to the content. Collapsed, it shrinks to a node labelled
 * with the kind of the group. The toggle of the group is a tool (see
 * `tools.ts`): it flips the `collapsed` flag on the model, and the editor
 * picks the change up and lays the tree out again.
 */
export function GroupView() {
    const { width, height } = useCell(selectElementSize);
    const { kind, collapsed } = useCell(selectElementData<GroupData>);

    return (
        <g>
            <rect
                width={width}
                height={height}
                rx={6}
                ry={6}
                fill={COLORS.group.fill}
                stroke={collapsed ? 'none' : COLORS.group.fill}
                strokeWidth={collapsed ? 0 : GROUP_STROKE_WIDTH}
                opacity={collapsed ? 0.3 : 0.2}
                pointerEvents={collapsed ? 'auto' : 'none'}
            />
            {collapsed && (
                <text
                    x={width / 2}
                    y={height / 2}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontFamily="sans-serif"
                    fontSize={12}
                    fontWeight="bold"
                    fill={COLORS.group.button}
                >
                    {GROUP_LABELS[kind]}
                </text>
            )}
        </g>
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
