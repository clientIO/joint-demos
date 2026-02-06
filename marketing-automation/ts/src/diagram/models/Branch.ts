import { util } from '@joint/plus';
import { Attribute } from '../const';
import Theme, { nodeLabelAttributes, typeLabelAttributes, iconBackgroundAttributes, iconAttributes } from '../theme';
import LabeledNode from './LabeledNode';

import type { LabeledNodeAttributes } from './LabeledNode';
import type { InspectorConfig } from '../../types';

const markup = util.svg/* xml*/`
    <path @selector="body" class="node-body branch-body"/>
    <rect @selector="iconBackground"/>
    <image @selector="icon" class="node-icon branch-icon"/>
    <text @selector="typeLabel" class="node-label branch-type-label"/>
    <text @selector="label" class="node-label branch-label"/>
`;

const TYPE = 'branch';

const ICON = 'assets/icons/branch.svg';

export default class Branch extends LabeledNode<LabeledNodeAttributes> {

    static type = TYPE;

    static growthLimit = Infinity;

    minimapBackground: string = Theme.BranchMinimapBackgroundColor;

    preinitialize(): void {
        this.markup = markup;
    }

    defaults(): Partial<LabeledNodeAttributes> {
        const attributes: LabeledNodeAttributes = {
            // App-specific attributes
            [Attribute.ContextMenu]: {
                x: `calc(w - ${Theme.NodeToolSize + 8})`,
                y: 8
            },
            // JointJS attributes
            z: 1,
            type: TYPE,
            size: {
                // Note: we make the model size slightly smaller to prevent
                // the layout engine from adding links to sloped edges.
                width: Theme.NodeWidth - Theme.BranchSlopeOffset * 2,
                height: Theme.NodeHeight
            },
            attrs: {
                root: {
                    cursor: 'pointer'
                },
                body: {
                    d: `M 0 0 L calc(w) 0 L calc(w + ${Theme.BranchSlopeOffset}) calc(h / 2) L calc(w) calc(h) L 0 calc(h) L -${Theme.BranchSlopeOffset} calc(h / 2) Z`,
                    fill: Theme.BranchBackgroundColor,
                    stroke: Theme.BranchBorderColor,
                    strokeWidth: Theme.NodeBorderWidth,
                    strokeLinejoin: 'round',
                },
                iconBackground: {
                    ...iconBackgroundAttributes,
                    fill: Theme.BranchIconBackgroundColor
                },
                icon: {
                    ...iconAttributes,
                    href: ICON
                },
                typeLabel: {
                    ...typeLabelAttributes,
                    textWrap: {
                        width: `calc(w - ${Theme.NodeHorizontalPadding * 2 + Theme.IconBackgroundSize + Theme.IconLabelSpacing + Theme.NodeToolSize})`,
                        maxLineCount: 1,
                        ellipsis: true
                    },
                    text: 'Branch',
                },
                label: {
                    ...nodeLabelAttributes,
                    textWrap: {
                        width: `calc(w - ${Theme.NodeHorizontalPadding * 2 + Theme.IconBackgroundSize + Theme.IconLabelSpacing})`,
                        maxLineCount: 1,
                        ellipsis: true
                    },
                },
            }
        };

        return util.defaultsDeep(attributes, super.defaults());
    }

    /**
     * @returns Inspector config for the branch.
     * Groups and inputs are dynamically built based on the branch's conditions.
     * @see {@link InspectorConfig}
     */
    getInspectorConfig(): InspectorConfig {
        const config: InspectorConfig = {
            headerText: 'Branch',
            headerIcon: ICON,
            headerIconBackground: Theme.BranchIconBackgroundColor,
            headerHint: 'Define conditions that split the flow',
            groups: {
                condition: {
                    label: 'Branch',
                    index: 2
                }
            },
            inputs: {
                to: {
                    type: 'list',
                    label: /* html */`Conditions:
                    <div class="field-hint-container">
                        <img class="field-hint-icon" src="assets/icons/hint.svg">
                        <div class="field-hint">Describe possible paths based on the branch conditions.</div>
                    </div>`,
                    addButtonLabel: '+ Add path',
                    group: 'condition',
                    item: {
                        [Attribute.EdgeCondition]: {
                            type: 'content-editable',
                            label: 'Condition',
                            defaultValue: ''
                        },
                        id: {
                            type: 'text',
                            defaultValue: () => util.uuid()
                        }
                    }
                }
            }
        };

        return util.defaultsDeep(config, super.getInspectorConfig());
    }

    /**
     * @returns the node outline path data.
     */
    override getOutlinePathData(options: { padding?: number } = {}): string {
        const { padding = 0 } = options;
        const { width, height } = this.size();
        let points = [
            { x: width, y: 0 },
            { x: width + Theme.BranchSlopeOffset, y: height / 2 },
            { x: width, y: height },
            { x: 0, y: height },
            { x: -Theme.BranchSlopeOffset, y: height / 2 },
            { x: 0, y: 0 }
        ];

        if (padding > 0) {
            points = offsetPolygon(points, -padding) as { x: number; y: number }[];
        }

        // Ensure points are in clockwise order (for the dash-offset animation to work correctly)
        points.reverse();

        return points.map((point, index) => {
            return (index === 0 ? 'M' : 'L') + ` ${point.x} ${point.y}`;
        }).join(' ') + ' Z';
    }
}


/**
 * Offsets a polygon defined by the given points by the specified padding.
 */
function offsetPolygon(points: { x: number; y: number }[], padding: number) {
    const n = points.length;
    const result = [];

    function normalize(v: { x: number; y: number }) {
        const len = Math.hypot(v.x, v.y);
        return { x: v.x / len, y: v.y / len };
    }

    function perpendicular(v: { x: number; y: number }) {
        return { x: -v.y, y: v.x };
    }

    function lineFromPoints(p1: { x: number; y: number }, p2: { x: number; y: number }) {
        // ax + by + c = 0
        const a = p2.y - p1.y;
        const b = p1.x - p2.x;
        const c = a * p1.x + b * p1.y;
        return { a, b, c };
    }

    function intersectLines(l1: { a: number; b: number; c: number }, l2: { a: number; b: number; c: number }) {
        const det = l1.a * l2.b - l2.a * l1.b;
        if (Math.abs(det) < 1e-10) return null;

        return {
            x: (l2.b * l1.c - l1.b * l2.c) / det,
            y: (l1.a * l2.c - l2.a * l1.c) / det
        };
    }

    // Build offset lines
    const offsetLines = [];

    for (let i = 0; i < n; i++) {
        const p1 = points[i];
        const p2 = points[(i + 1) % n];

        const edge = normalize({
            x: p2.x - p1.x,
            y: p2.y - p1.y
        });

        // outward normal (polygon must be CCW)
        const normal = perpendicular(edge);

        const offsetP1 = {
            x: p1.x + normal.x * padding,
            y: p1.y + normal.y * padding
        };
        const offsetP2 = {
            x: p2.x + normal.x * padding,
            y: p2.y + normal.y * padding
        };

        offsetLines.push(lineFromPoints(offsetP1, offsetP2));
    }

    // Intersect adjacent offset lines
    for (let i = 0; i < n; i++) {
        const l1 = offsetLines[i];
        const l2 = offsetLines[(i + 1) % n];
        result.push(intersectLines(l1, l2));
    }

    return result;
}
