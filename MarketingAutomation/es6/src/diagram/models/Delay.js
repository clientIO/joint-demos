import { util } from '@joint/plus';
import Node from './Node';
import Theme, { typeLabelAttributes, nodeLabelAttributes, iconAttributes, iconBackgroundAttributes, rectBodyAttributes } from '../theme';
import { Attribute } from '../const';

const delayMarkup = util.svg /* xml*/ `
    <rect @selector="body" class="node-body delay-body"/>
    <rect @selector="iconBackground"/>
    <image @selector="icon" class="node-icon delay-icon"/>
    <text @selector="typeLabel" class="node-label delay-type-label"/>
    <text @selector="label" class="node-label delay-label"/>
`;

const TYPE = 'delay';

const ICON = 'assets/icons/delay.svg';

class Delay extends Node {
    constructor() {
        super(...arguments);
        
        this.minimapBackground = Theme.DelayMinimapBackgroundColor;
    }
    
    preinitialize() {
        this.markup = delayMarkup;
    }
    
    initialize(attributes, options) {
        super.initialize(attributes, options);
        
        this.updateDuration();
        this.on(`change:${Attribute.Duration}`, () => this.updateDuration());
    }
    
    defaults() {
        const attributes = {
            // App-specific attributes
            [Attribute.ContextMenu]: { x: `calc(w - ${Theme.NodeToolSize + Theme.NodeHorizontalPadding})`, y: Theme.NodeVerticalPadding },
            // Shape-specific attributes
            [Attribute.Duration]: {
                days: 0,
                hours: 0,
                minutes: 0
            },
            // JointJS attributes
            type: TYPE,
            size: {
                width: Theme.NodeWidth,
                height: Theme.NodeHeight,
            },
            attrs: {
                root: {
                    cursor: 'pointer'
                },
                body: rectBodyAttributes,
                iconBackground: Object.assign(Object.assign({}, iconBackgroundAttributes), { fill: Theme.DelayIconBackgroundColor }),
                icon: Object.assign(Object.assign({}, iconAttributes), { href: ICON }),
                typeLabel: Object.assign(Object.assign({}, typeLabelAttributes), { textWrap: {
                        width: `calc(w - ${Theme.NodeHorizontalPadding * 2 + Theme.IconBackgroundSize + Theme.IconLabelSpacing + Theme.NodeToolSize})`,
                        maxLineCount: 1,
                        ellipsis: true
                    }, text: 'Delay' }),
                label: Object.assign(Object.assign({}, nodeLabelAttributes), { textWrap: {
                        width: `calc(w - ${Theme.NodeHorizontalPadding * 2 + Theme.IconBackgroundSize + Theme.IconLabelSpacing})`,
                        maxLineCount: 1,
                        ellipsis: true
                    } }),
            }
        };
        
        return util.defaultsDeep(attributes, super.defaults());
    }
    ;
    
    /**
     * @returns The duration of the delay from the delay model.
     * @see {@link Attribute.Duration}
     */
    getDuration() {
        return this.get(Attribute.Duration);
    }
    
    updateDuration() {
        const duration = this.getDuration();
        const durationText = parseDuration(duration);
        this.attr('label/text', durationText);
    }
    
    /**
     * @returns Inspector config for the delay.
     * @see {@link InspectorConfig}
     */
    getInspectorConfig() {
        return {
            headerText: 'Delay',
            headerIcon: ICON,
            headerIconBackground: Theme.DelayIconBackgroundColor,
            headerHint: 'Pause the automation for a set duration',
            groups: {
                duration: {
                    label: 'Duration',
                    index: 1
                }
            },
            inputs: {
                [Attribute.Duration]: {
                    type: 'object',
                    group: 'duration',
                    label: /* html */ `Duration:
                    <div class="field-hint-container">
                        <img class="field-hint-icon" src="assets/icons/hint.svg">
                        <div class="field-hint">How long to wait before the automation flow continues.</div>
                    </div>
                `,
                    properties: {
                        days: {
                            type: 'number',
                            label: 'Days',
                            min: 0,
                            max: 365,
                        },
                        hours: {
                            type: 'number',
                            label: 'Hours',
                            min: 0,
                            max: 23,
                        },
                        minutes: {
                            type: 'number',
                            label: 'Minutes',
                            min: 0,
                            max: 59,
                        }
                    }
                }
            }
        };
    }
}

Delay.type = TYPE;

Delay.growthLimit = 1;
export default Delay;

// - Helper functions

/**
 * Parses the duration of the delay into a string, which can be displayed as a label.
 * @param duration - The duration of the delay.
 * @returns The parsed duration string.
 */
function parseDuration(duration) {
    
    const isDurationEmpty = duration.days === 0 && duration.hours === 0 && duration.minutes === 0;
    
    if (isDurationEmpty)
        return 'No delay set';
    
    const result = ['Wait for:'];
    
    if (duration.days > 0) {
        result.push(`${duration.days} day${duration.days > 1 ? 's' : ''}`);
    }
    
    if (duration.hours > 0) {
        result.push(`${duration.hours} hour${duration.hours > 1 ? 's' : ''}`);
    }
    
    if (duration.minutes > 0) {
        result.push(`${duration.minutes} minute${duration.minutes > 1 ? 's' : ''}`);
    }
    
    return result.join(' ');
}
