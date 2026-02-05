import { util } from '@joint/plus';
import { Attribute } from '../const';
import Theme, { edgeLabelAttributes } from '../theme';
import { SystemEdge } from '../../system/diagram/models';

import type { dia, shapes, ui } from '@joint/plus';
import type { SystemEdgeAttributes } from '../../system/diagram/models';

/** SVG markup for the edge */
const edgeMarkup = util.svg/* xml */`
    <path @selector="wrapper"
        stroke-linejoin="round"
        stroke-linecap="round"
        stroke="transparent"
        fill="none"
        cursor="pointer"
    />
    <path @selector="line"
        stroke-linejoin="round"
        fill="none"
        pointer-events="none"
    />
`;

/** SVG markup for the edge label */
const edgeLabelMarkup = util.svg/* xml */`
    <rect @selector="labelBody"/>
    <text @selector="labelText"/>
`;

const ICON = 'assets/icons/condition.svg';

export interface EdgeAttributes extends SystemEdgeAttributes {
    [Attribute.EdgePrompt]?: string;
}

export default class Edge extends SystemEdge<EdgeAttributes> {

    // The type remains the same (explicitly set it here for clarity).
    // We overriding the default engine Edge with our own Edge class.
    static override type = SystemEdge.type;

    preinitialize(): void {
        this.markup = edgeMarkup;
    }

    defaults(): Partial<EdgeAttributes> {
        const attributes: Partial<EdgeAttributes> = {
            // App-specific attributes
            [Attribute.Removable]: true,
            [Attribute.Selectable]: true,
            // JointJS attributes
            defaultLabel: {
                markup: edgeLabelMarkup,
                attrs: {
                    labelText: {
                        ...edgeLabelAttributes,
                        fill: Theme.EdgeLabelColor,
                        textAnchor: 'middle',
                        textVerticalAnchor: 'middle',
                        pointerEvents: 'none',
                    },
                    labelBody: {
                        ref: 'labelText',
                        fill:  Theme.EdgeLabelBackgroundColor,
                        stroke: Theme.EdgeLabelBorderColor,
                        rx: Theme.EdgeLabelBorderRadius,
                        ry: Theme.EdgeLabelBorderRadius,
                        x: `calc(x - ${Theme.EdgeLabelHorizontalPadding})`,
                        y: `calc(y - ${Theme.EdgeLabelVerticalPadding})`,
                        width: `calc(w + ${2 * Theme.EdgeLabelHorizontalPadding})`,
                        height: `calc(h + ${2 * Theme.EdgeLabelVerticalPadding})`
                    }
                },
                position: {
                    distance: 0.5
                }
            },
            attrs: {
                line: {
                    connection: true,
                    stroke: Theme.EdgeColor,
                    strokeWidth: Theme.EdgeWidth,
                },
                wrapper: {
                    connection: true,
                    // An extra buffer around the edge for easier interaction
                    strokeWidth: Theme.EdgeWidth + 8,
                }
            }
        };

        return util.defaultsDeep(attributes, super.defaults());
    }

    initialize(attributes: shapes.standard.LinkAttributes, options: dia.Cell.Options): void {
        super.initialize(attributes, options);

        this.updateLinkLabel();
        this.on(`change:${Attribute.EdgePrompt}`, () => this.updateLinkLabel());
    }

    getPrompt(): string | null {
        const prompt = this.get(Attribute.EdgePrompt);
        return prompt != null ? String(prompt) : null;
    }

    updateLinkLabel() {

        const prompt = this.getPrompt();
        const margin = 5;
        const maxLabelSize = { width: 180, height: 80 };

        if (prompt == null) {
            // No prompt, no label
            this.labels([]);
            return;
        }

        const text = prompt || '...';
        const wrappedText = util.breakText(text, maxLabelSize, edgeLabelAttributes, {
            ellipsis: true
        });

        const { fontSize, fontFamily } = edgeLabelAttributes;
        const size = measureTextSize(wrappedText, fontSize, fontFamily);
        this.set({
            labels: [{
                attrs: {
                    labelText: {
                        text: wrappedText
                    }
                }
            }],
            // Directed graph uses this property to make space for the label
            labelSize: {
                width: margin + size.width,
                height: 4 * margin + size.height
            },
        });
    }

    getInspectorConfig(): ui.Inspector.Options {
        const config: ui.Inspector.Options =  {
            headerText: 'Link',
            headerIcon: ICON,
            groups: {},
            inputs: {}
        };
        // We only show the prompt field if it is set on the link
        // i.e., branch links have prompts, others don't,
        if (this.getPrompt() != null) {
            config.groups.general = {
                label: 'General',
                index: 1
            };
            config.inputs[Attribute.EdgePrompt] = {
                type: 'text',
                label: 'Prompt',
                group: 'general',
            };
        }
        return config;
    }
}

function measureTextSize(text: string, fontSize: number, fontFamily: string) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return { width: 0, height: 0 };
    context.font = `${fontSize}px ${fontFamily}`;
    const lines = text.split('\n');
    const maxWidth = Math.max(...lines.map(line => context.measureText(line).width));
    const lineHeight = lines.length * (fontSize * 1.2); // 1.2 is a common line height multiplier
    return {
        width: maxWidth,
        height: lineHeight
    };
}
