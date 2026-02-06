import { util } from '@joint/plus';
import { Attribute } from '../const';
import Theme, { edgeLabelAttributes } from '../theme';
import { SystemEdge } from '../../system/diagram/models';

/** SVG markup for the edge */
const edgeMarkup = util.svg /* xml */ `
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
const edgeLabelMarkup = util.svg /* xml */ `
    <rect @selector="labelBody"/>
    <text @selector="labelText"/>
`;

const ICON = 'assets/icons/condition.svg';

export default class Edge extends SystemEdge {
    
    // The type remains the same (explicitly set it here for clarity).
    // We overriding the default engine Edge with our own Edge class.
    static type = SystemEdge.type;
    
    preinitialize() {
        this.markup = edgeMarkup;
    }
    
    defaults() {
        const attributes = {
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
                        fill: Theme.EdgeLabelBackgroundColor,
                        stroke: Theme.EdgeLabelBorderColor,
                        rx: Math.min(Theme.EdgeLabelHorizontalPadding, Theme.EdgeLabelVerticalPadding),
                        ry: Math.min(Theme.EdgeLabelHorizontalPadding, Theme.EdgeLabelVerticalPadding),
                        strokeWidth: 1,
                        x: `calc(x - ${Theme.EdgeLabelHorizontalPadding})`,
                        y: `calc(y - ${Theme.EdgeLabelVerticalPadding})`,
                        width: `calc(w + ${2 * Theme.EdgeLabelHorizontalPadding})`,
                        height: `calc(h + ${2 * Theme.EdgeLabelVerticalPadding})`
                    }
                },
                position: {
                    distance: -(edgeLabelAttributes.fontSize + Theme.EdgeLabelVerticalPadding)
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
    
    initialize(attributes, options) {
        super.initialize(attributes, options);
        
        this.updateLinkLabel();
        this.on(`change:${Attribute.EdgeCondition}`, () => this.updateLinkLabel());
    }
    
    /**
     * @returns The condition of the edge from the edge model.
     * @see {@link Attribute.EdgeCondition}
     */
    getCondition() {
        const condition = this.get(Attribute.EdgeCondition);
        return condition != null ? String(condition) : null;
    }
    
    /**
     * Updates the link label based on the condition.
     */
    updateLinkLabel() {
        
        const condition = this.getCondition();
        const maxWidth = 200; // Maximum width for the label
        
        if (condition == null) {
            // No condition, no label
            this.labels([]);
            return;
        }
        
        const text = condition || '...';
        const wrappedText = util.breakText(text, { width: maxWidth }, edgeLabelAttributes, {
            ellipsis: true,
            maxLineCount: 1
        });
        
        this.set({
            labels: [{
                    attrs: {
                        labelText: {
                            text: wrappedText
                        }
                    }
                }],
        });
    }
    
    /**
     * @returns Inspector config for the edge.
     * @see {@link InspectorConfig}
     */
    getInspectorConfig() {
        const config = {
            headerText: 'Link',
            headerIcon: ICON,
            groups: {},
            inputs: {}
        };
        // We only show the condition field if it is set on the link
        // i.e., branch links have conditions, others don't,
        if (this.getCondition() != null) {
            config.groups.general = {
                label: 'General',
                index: 1
            };
            config.inputs[Attribute.EdgeCondition] = {
                type: 'text',
                label: 'Condition',
                group: 'general',
            };
            config.headerHint = 'Edit condition for this path';
        }
        return config;
    }
}
