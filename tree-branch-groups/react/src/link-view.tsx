import { g } from '@joint/plus';
import { useCell, useCellId, useGraph, useLinkLayout } from '@joint/react-plus';
import type { ReactNode } from 'react';

import { canSplit } from './actions';
import { useEditor } from './editor-context';
import { INSERT_CHOICES, getAddItems } from './choices';
import type { AddChoice } from './choices';
import { INSERT_BUTTON_SIZE, Link } from './shapes';
import type { LinkData } from './shapes';
import { measureText } from './measure';
import { getInsertButtonPoint } from './tools';
import { useTooltip } from './use-tooltip';

/** The name of an option sits above the insert button, right next to the line: bold, in the blue of the nodes, on a tinted chip that fits it (see `index.css`). */
const OPTION_NAME_OFFSET = { x: 8, y: -17 };
const OPTION_CHIP = { paddingX: 6, height: 18, radius: 4 };
const OPTION_FONT = '600 12px sans-serif';

/**
 * What React renders on a link, over the line JointJS draws: the insert
 * button on the longest vertical part of a link that takes an insertion -
 * or, while a move is on, the drop point of the move, on the links that can
 * take it - with the name of the option the link leads to above it; the
 * arrow in the middle of the return link of a loop, turned along the link.
 * The route is read from the layout of the link, which follows every render.
 */
export function LinkContent(): ReactNode {
    const layout = useLinkLayout();
    const id = useCellId();
    const { graph } = useGraph();
    const editor = useEditor();
    const data = useCell((cell) => (cell as { data?: LinkData }).data ?? {});
    const link = graph.getCell(id);
    const moving = editor.moved !== null;
    const title = moving ? 'Move here' : 'Insert here';
    const buttonRef = useTooltip<SVGGElement>(title);
    if (!layout || !(link instanceof Link)) return null;

    if (data.backward) {
        const path = new g.Path(layout.d);
        const length = path.length();
        if (!length) return null;
        const point = path.pointAtLength(length / 2)!;
        const angle = path.tangentAtLength(length / 2)?.angle() ?? 0;
        return <path className="return-arrow" d="M -7 -6 L 5 0 L -7 6 Z" transform={`translate(${point.x}, ${point.y}) rotate(${angle})`} />;
    }

    const source = link.getSourceElement();
    const target = link.getTargetElement();
    if (!source || !target || !canSplit(link)) return null;
    // While a move is on, a link that cannot take it shows no button - its option name stays.
    const withButton = !moving || editor.canDropOnLink(link);
    const points = [{ x: layout.sourceX, y: layout.sourceY }, ...link.vertices(), { x: layout.targetX, y: layout.targetY }];
    const point = getInsertButtonPoint(points, source, target);
    if (!point) return null;
    const half = INSERT_BUTTON_SIZE / 2;

    return (
        <g transform={`translate(${point.x}, ${point.y})`}>
            {data.optionName ? (
                <g className="option-name">
                    <rect
                        x={OPTION_NAME_OFFSET.x}
                        y={OPTION_NAME_OFFSET.y - OPTION_CHIP.height / 2}
                        width={Math.ceil(measureText(data.optionName, OPTION_FONT)) + 2 * OPTION_CHIP.paddingX}
                        height={OPTION_CHIP.height}
                        rx={OPTION_CHIP.radius}
                        ry={OPTION_CHIP.radius}
                    />
                    <text x={OPTION_NAME_OFFSET.x + OPTION_CHIP.paddingX} y={OPTION_NAME_OFFSET.y} dominantBaseline="central">{data.optionName}</text>
                </g>
            ) : null}
            {withButton ? <g
                ref={buttonRef}
                className="link-button"
                role="button"
                tabIndex={-1}
                aria-label={title}
                onClick={(evt) => {
                    if (moving) {
                        editor.dropOnLink(link);
                        return;
                    }
                    const anchor = (evt.currentTarget as SVGGElement).getBoundingClientRect();
                    editor.openMenu({
                        anchor,
                        items: getAddItems(INSERT_CHOICES),
                        onChoose: (choice) => editor.insertOnLink(link, choice as AddChoice)
                    });
                }}
            >
                <rect x={-half} y={-half} width={INSERT_BUTTON_SIZE} height={INSERT_BUTTON_SIZE} rx={3} ry={3} />
                <path d="M -4 0 4 0 M 0 -4 0 4" />
            </g> : null}
        </g>
    );
}
