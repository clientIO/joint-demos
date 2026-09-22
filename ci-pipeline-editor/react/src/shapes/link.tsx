import type { dia } from '@joint/plus';
import { g } from '@joint/plus';
import { LinkModel as ReactLinkModel, useCell, useLinkLayout } from '@joint/react-plus';
import type { LinkLayout } from '@joint/react-plus';
import type { ReactNode } from 'react';

import { canSplit } from '../actions';
import { INSERT_CHOICES, getAddItems } from '../add-menu';
import type { AddChoice } from '../add-menu';
import { useTooltip } from '../components/use-tooltip';
import { useCellMark, useEditor } from '../editor-context';
import { AddButtonModel } from './add-button';
import { BACKWARD_LINK_Z, DROP_POINT_SIZE, INSERT_BUTTON_FROM_TARGET, INSERT_BUTTON_SIZE, LINK_Z } from './constants';
import { GroupEndModel, GroupModel, GroupStartModel } from './group';
import { measureText } from './measure';
import { useCellModel } from './use-cell-model';

export const LINK_TYPE = 'Link';

/** The arrowhead at the end of a link: its tip at the target, its base back along the link. */
const ARROWHEAD = 'M -8 -4 0 0 -8 4 Z';

/**
 * The React-facing state of a link: whether it runs against the flow (the
 * return link of a loop, which shows an arrow in its middle) and the name of
 * the option it leads to, for a link from a decision or from the start of a
 * fork (see `nameOptions()` in `layout/index.ts`).
 */
export interface LinkData {
    backward?: boolean;
    optionName?: string;
}

/**
 * A link of the tree: a `LinkModel` of `@joint/react` that JointJS routes -
 * the ends, the vertices of the layout, the connector - and React draws,
 * all of it (`LinkContent`, below): the line, its arrowhead, its buttons
 * and labels. The view has no markup of its own: the route is read from it
 * with `useLinkLayout()`.
 */
export class LinkModel extends ReactLinkModel {

    constructor(...args: ConstructorParameters<typeof ReactLinkModel>) {
        super(...args);
        this.markup = [];
    }

    defaults() {
        return {
            ...super.defaults(),
            type: LINK_TYPE,
            z: LINK_Z,
            attrs: {},
            // The routes of the layout are orthogonal; the corners are rounded.
            connector: { name: 'straight', args: { cornerType: 'cubic', cornerRadius: 6 }}
        };
    }

    static create(source: dia.Element, target: dia.Element): LinkModel {
        const link = new LinkModel({ source: { id: source.id }});
        link.connectTo(target);
        return link;
    }

    /** Points the link at `target`. */
    connectTo(target: dia.Element): void {
        this.target({ id: target.id });
    }

    /** Whether the link ends in an arrowhead: not into the `end` of a group or an add button - neither is a step - and not the return link of a loop. */
    hasArrowhead(): boolean {
        const target = this.getTargetElement();
        return !this.isBackward() && target !== null && !GroupEndModel.isGroupEnd(target) && !AddButtonModel.isAddButton(target);
    }

    getData(): LinkData {
        return (this.get('data') ?? {}) as LinkData;
    }

    private setData(change: Partial<LinkData>): void {
        // A new object: the React records of the graph change by identity.
        this.set('data', { ...this.getData(), ...change });
    }

    /** Names the link as an option of a decision or a fork (`Staging`), or takes the name off. */
    setOptionName(name: string | null): void {
        if (this.isBackward()) return;
        this.setData({ optionName: name ?? undefined });
    }

    /** Whether a link from `source` to `target` is the return link of a loop: from its `end` back to its `start`. */
    static isReturnLink(source: dia.Element, target: dia.Element): boolean {
        return GroupEndModel.isGroupEnd(source) && GroupStartModel.isGroupStart(target);
    }

    /**
     * A link that runs against the flow of the tree - the return link of a
     * loop - is dashed and lies below the other links, so that a link
     * crossing it runs over it. It has no arrowhead: its end merges into
     * another link; an arrow in its middle shows the way.
     */
    setBackward(backward: boolean): void {
        this.set({ z: backward ? BACKWARD_LINK_Z : LINK_Z });
        this.setData({ backward });
    }

    isBackward(): boolean {
        return Boolean(this.getData().backward);
    }
}

/**
 * Whether the link out of `element` has something right below the element:
 * the collapse button of a collapsed group, or the return link of a loop,
 * which leaves the link below the loop and joins it below the loop's start.
 */
function hasSomethingBelow(element: dia.Element): boolean {
    if (GroupModel.isGroup(element)) return element.isCollapsed() || element.getKind() === 'loop';
    return GroupStartModel.isGroupStart(element) && element.getKind() === 'loop';
}

/**
 * Whether `element` is the end of a loop: the link into it from a leaf gets
 * its insert button a fixed distance below the leaf, the mirror image of the
 * link out of the loop's start, whose button sits a fixed distance above its
 * child - the return link runs at equal distances around both.
 */
function isLoopEnd(element: dia.Element): boolean {
    return GroupEndModel.isGroupEnd(element) && element.getGroup().getKind() === 'loop';
}

/**
 * Where the button of a link goes, given the points of its route - the
 * source point, the vertices, the target point: the middle of its longest
 * vertical part - the part the link has of its own, not the one it shares
 * with its siblings on a bar, and never a horizontal part. When the link
 * leaves an element with something right below it (see
 * `hasSomethingBelow()`) the button sits near the child instead, a fixed
 * distance from the target, whatever room the link was given; when it joins
 * the end of a loop, a fixed distance from the source (see `isLoopEnd()`).
 * `null` for a link without a vertical part.
 */
export function getInsertButtonPoint(points: g.PlainPoint[], source: dia.Element, target: dia.Element): g.Point | null {
    let longest: g.Line | null = null;
    let longestIndex = -1;
    for (let i = 0; i < points.length - 1; i++) {
        const segment = new g.Line(points[i], points[i + 1]);
        if (Math.abs(segment.start.x - segment.end.x) > 0.5) continue;
        if (!longest || segment.length() > longest.length()) {
            longest = segment;
            longestIndex = i;
        }
    }
    if (!longest) return null;
    if (longestIndex === 0 && hasSomethingBelow(source)) {
        // Such a link is straight: the button sits a fixed distance above the child.
        const y = Math.max(longest.end.y - INSERT_BUTTON_FROM_TARGET, longest.start.y + INSERT_BUTTON_SIZE);
        return new g.Point(longest.start.x, y);
    }
    if (longestIndex === 0 && isLoopEnd(target)) {
        // The vertical part leaves the leaf: the button sits a fixed distance below it.
        const y = Math.min(longest.start.y + INSERT_BUTTON_FROM_TARGET, longest.end.y - INSERT_BUTTON_SIZE);
        return new g.Point(longest.start.x, y);
    }
    return longest.midpoint();
}

/** The name of an option sits above the insert button, centered on the line, a few pixels clear of the button: bold, in the blue of the nodes, on a tinted chip that fits it and covers the line behind it (see `index.css`). */
const OPTION_NAME_OFFSET_Y = -22;
const OPTION_CHIP = { paddingX: 6, height: 18, radius: 4 };
const OPTION_FONT = '600 12px sans-serif';

/**
 * The insert button of a link - on the longest vertical part of a link that
 * takes an insertion, or, while a move is on, the drop point of the move,
 * on the links that can take it - with the name of the option the link
 * leads to above it. Nothing on a link that takes nothing.
 */
function InsertButton({ model, layout, optionName }: { model: LinkModel; layout: LinkLayout; optionName?: string }): ReactNode {
    const editor = useEditor();
    const moving = editor.moved !== null;
    const title = moving ? 'Move here' : 'Insert here';
    const buttonRef = useTooltip<SVGGElement>(title);
    const source = model.getSourceElement();
    const target = model.getTargetElement();
    if (!source || !target || !canSplit(model)) return null;
    // While a move is on, a link that cannot take it shows no button - its option name stays.
    const withButton = !moving || editor.canDropOnLink(model);
    const points = [{ x: layout.sourceX, y: layout.sourceY }, ...model.vertices(), { x: layout.targetX, y: layout.targetY }];
    const point = getInsertButtonPoint(points, source, target);
    if (!point) return null;
    // A drop point is larger than an insert button.
    const size = moving ? DROP_POINT_SIZE : INSERT_BUTTON_SIZE;
    const half = size / 2;
    const chipWidth = optionName ? Math.ceil(measureText(optionName, OPTION_FONT)) + 2 * OPTION_CHIP.paddingX : 0;

    return (
        <g transform={`translate(${point.x}, ${point.y})`}>
            {optionName ? (
                <g className="option-name">
                    <rect
                        x={-chipWidth / 2}
                        y={OPTION_NAME_OFFSET_Y - OPTION_CHIP.height / 2}
                        width={chipWidth}
                        height={OPTION_CHIP.height}
                        rx={OPTION_CHIP.radius}
                        ry={OPTION_CHIP.radius}
                    />
                    <text x={0} y={OPTION_NAME_OFFSET_Y} textAnchor="middle" dominantBaseline="central">{optionName}</text>
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
                        editor.dropOnLink(model);
                        return;
                    }
                    const anchor = (evt.currentTarget as SVGGElement).getBoundingClientRect();
                    editor.openMenu({
                        anchor,
                        items: getAddItems(INSERT_CHOICES),
                        onChoose: (choice) => editor.insertOnLink(model, choice as AddChoice)
                    });
                }}
            >
                {/* The ring that pulses behind a drop point (see the stylesheet). */}
                {moving ? <rect className="pulse" x={-half} y={-half} width={size} height={size} rx={3} ry={3} /> : null}
                <rect x={-half} y={-half} width={size} height={size} rx={3} ry={3} />
                <path d="M -4 0 4 0 M 0 -4 0 4" transform={`scale(${size / INSERT_BUTTON_SIZE})`} />
            </g> : null}
        </g>
    );
}

/**
 * What React renders for a link, all of it: the line along the route JointJS
 * computed (read with `useLinkLayout()`, which follows every render), with a
 * copy in the color of the background right below it, so that where two
 * links run on top of each other the gaps of a dashed one show the
 * background; the arrowhead at its end, turned along the link; the arrow in
 * the middle of the return link of a loop, dashed and without an arrowhead,
 * or the insert button and the name of the option. In a group that wears
 * the link's mark as a class - a preview, a move in progress - for the
 * stylesheet to paint or hide (see `useCellMark()`).
 */
export function LinkContent(): ReactNode {
    const layout = useLinkLayout();
    const model = useCellModel();
    const data = useCell((cell) => (cell as { data?: LinkData }).data ?? {});
    const mark = useCellMark();
    if (!layout || !layout.d || !(model instanceof LinkModel)) return null;

    const path = new g.Path(layout.d);
    const length = path.length();
    const angleAt = (at: number): number => path.tangentAtLength(at)?.angle() ?? 0;
    const middle = path.pointAtLength(length / 2) ?? new g.Point(layout.targetX, layout.targetY);

    return (
        <g className={`link${mark ? ` ${mark}` : ''}`}>
            <path className="link-wrapper" d={layout.d} />
            <path className={`link-line${data.backward ? ' backward' : ''}`} d={layout.d} />
            {model.hasArrowhead() ? <path className="link-arrow" d={ARROWHEAD} transform={`translate(${layout.targetX}, ${layout.targetY}) rotate(${angleAt(length)})`} /> : null}
            {data.backward
                ? <path className="return-arrow" d="M -7 -6 L 5 0 L -7 6 Z" transform={`translate(${middle.x}, ${middle.y}) rotate(${angleAt(length / 2)})`} />
                : <InsertButton model={model} layout={layout} optionName={data.optionName} />}
        </g>
    );
}
