import { selectCellType, selectElementData, selectElementSize, useCell, useCellId, useGraph } from '@joint/react-plus';

import { COLORS, GROUP_TYPE, Group, NODE_TYPE } from './shapes';
import type { GroupData, NodeData } from './shapes';

/** The stroke of an expanded group; also the right margin of the button of a collapsed one. */
const GROUP_STROKE_WIDTH = 25;
const BUTTON_SIZE = 18;

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
 * pointer through to the content. Collapsed, it shrinks to a labelled node.
 * The button in the corner toggles the `collapsed` flag on the model; the
 * editor picks the change up and lays the tree out again.
 */
export function GroupView() {
    const id = useCellId();
    const { graph } = useGraph();
    const { width, height } = useCell(selectElementSize);
    const { collapsed } = useCell(selectElementData<GroupData>);

    const buttonX = width - BUTTON_SIZE - (collapsed ? GROUP_STROKE_WIDTH / 2 : 0);
    const buttonY = collapsed ? (height - BUTTON_SIZE) / 2 : 0;

    function toggle(): void {
        const group = graph.getCell(id);
        if (Group.isGroup(group)) group.toggle();
    }

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
                    // Centered in the space left of the button.
                    x={(width - BUTTON_SIZE - GROUP_STROKE_WIDTH) / 2}
                    y={height / 2}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontFamily="sans-serif"
                    fontSize={12}
                    fontWeight="bold"
                    fill={COLORS.group.button}
                >
                    Branches
                </text>
            )}
            <g
                className="group-button"
                transform={`translate(${buttonX}, ${buttonY})`}
                cursor="pointer"
                role="button"
                tabIndex={0}
                aria-label={collapsed ? 'Expand the branches' : 'Collapse the branches'}
                aria-expanded={!collapsed}
                // Keep the paper from treating the click as a press on the element.
                onPointerDown={(event) => event.stopPropagation()}
                onClick={toggle}
                onKeyDown={(event) => {
                    if (event.key !== 'Enter' && event.key !== ' ') return;
                    event.preventDefault();
                    toggle();
                }}
            >
                <title>{collapsed ? 'Expand' : 'Collapse'}</title>
                <rect width={BUTTON_SIZE} height={BUTTON_SIZE} rx={3} ry={3} fill={COLORS.group.button} />
                <path
                    d={collapsed ? 'M -4 0 4 0 M 0 -4 0 4' : 'M -4 0 4 0'}
                    transform={`translate(${BUTTON_SIZE / 2}, ${BUTTON_SIZE / 2})`}
                    stroke="#FFFFFF"
                    strokeWidth={2}
                    pointerEvents="none"
                />
            </g>
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
