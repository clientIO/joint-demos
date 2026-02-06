import type { dia } from '@joint/plus';
import { util } from '@joint/plus';
import LabeledNode from './LabeledNode';
import Theme, { nodeLabelAttributes, typeLabelAttributes } from '../theme';
import { Attribute } from '../const';

import type { LabeledNodeAttributes } from './LabeledNode';
import type { InspectorConfig } from '../../types';

const markup = util.svg/* xml*/`
    <rect @selector="body" class="node-body agent-body"/>
    <rect @selector="innerBorder" class="agent-inner-border"/>
    <text @selector="typeLabel" class="node-label agent-type-label"/>
    <text @selector="label" class="node-label agent-label"/>
    <line @selector="separator"/>
    <text @selector="skillsLabel" class="node-label agent-label"/>
    <g @selector="addSkillButton" class="agent-add-skill-button">
        <circle @selector="addSkillButtonBody" class="agent-add-skill-button-body"/>
        <path @selector="addSkillButtonIcon"/>
    </g>
    <g @selector="skillsContainer"/>
`;

export interface AgentSkill {
    id: string;
    name: string;
    icon: string;
}

export interface AgentSkills {
    [id: string]: AgentSkill;
}

export interface AgentAttributes extends LabeledNodeAttributes {
    [Attribute.Skills]: AgentSkills;
    [Attribute.Conditions]: string[];
}

const TYPE = 'agent';

export default class Agent extends LabeledNode {

    static type = TYPE;

    static growthLimit = Infinity;

    preinitialize(): void {
        this.markup = markup;
    }

    defaults(): Partial<AgentAttributes> {
        const separatorY = Theme.NodeSpacing + Theme.FontSize * 2 + Theme.NodeLabelSpacing * 2;
        const skillsY = separatorY + Theme.NodeLabelSpacing * 2;
        const skillsLabelWidth = 40; // Approximate width of the "Skills:" label
        const attributes: Partial<AgentAttributes> = {
            // App-specific attributes
            [Attribute.ContextMenu]: {
                x: `calc(w - ${Theme.NodeToolSize + Theme.NodeToolSpacing + Theme.AgentBorderGap})`,
                y: 15
            },
            // Shape-specific attributes
            [Attribute.Skills]: {},
            [Attribute.Conditions]: [],
            // JointJS attributes
            type: TYPE,
            size: {
                width: Theme.NodeWidth,
                height: Theme.AgentHeight
            },
            attrs: {
                root: {
                    cursor: 'pointer'
                },
                body: {
                    width: 'calc(w)',
                    height: 'calc(h)',
                    fill: Theme.AgentBackgroundColor,
                    stroke: Theme.AgentEmphasizedBorderColor,
                    strokeWidth: Theme.AgentEmphasizedBorderWidth,
                    rx: Theme.NodeBorderRadius,
                    ry: Theme.NodeBorderRadius,
                },
                innerBorder: {
                    x: Theme.AgentBorderGap,
                    y: Theme.AgentBorderGap,
                    width: `calc(w - ${Theme.AgentBorderGap * 2})`,
                    height: `calc(h - ${Theme.AgentBorderGap * 2})`,
                    fill: 'none',
                    stroke: Theme.AgentBorderColor,
                    strokeWidth: Theme.AgentBorderWidth,
                    rx: Theme.NodeBorderRadius - Theme.AgentBorderGap,
                    ry: Theme.NodeBorderRadius - Theme.AgentBorderGap,
                },
                typeLabel: {
                    ...typeLabelAttributes,
                    x: Theme.NodeSpacing,
                    y: Theme.NodeSpacing + Theme.FontSize - Theme.NodeLabelSpacing / 2,
                    text: 'AI Agent',
                },
                label: {
                    ...nodeLabelAttributes,
                    x: Theme.NodeSpacing,
                    y: Theme.NodeSpacing + Theme.FontSize + Theme.NodeLabelSpacing / 2,
                    textWrap: {
                        width: Theme.NodeWidth - Theme.NodeSpacing * 2,
                        maxLineCount: 1,
                        ellipsis: true
                    },
                },
                separator: {
                    x1: Theme.NodeSpacing,
                    x2: `calc(w - ${Theme.NodeSpacing})`,
                    y1: separatorY,
                    y2: separatorY,
                    strokeLinecap: 'round',
                    stroke: Theme.AgentSeparatorColor,
                    strokeWidth: Theme.AgentSeparatorWidth,
                },
                skillsLabel: {
                    x: Theme.NodeSpacing,
                    // Align the text with the skill icons including the remove button - 5px offset
                    y: skillsY + Theme.NodeSpacing / 2 - 2.5,
                    fontSize: Theme.FontSize - 2,
                    fontWeight: 500,
                    textVerticalAnchor: 'top',
                    textAnchor: 'start',
                    text: 'Skills:',
                    fill: Theme.AgentSkillsLabelColor,
                    fontFamily: Theme.FontFamily,
                },
                addSkillButton: {
                    transform: `translate(${Theme.NodeSpacing + Theme.AgentSkillButtonSize / 2}, calc(h - ${Theme.NodeSpacing + Theme.AgentSkillButtonSize / 2}))`,
                    cursor: 'pointer',
                },
                addSkillButtonBody: {
                    fill: 'transparent',
                    stroke: Theme.AgentEmphasizedBorderColor,
                    strokeWidth: Theme.AgentEmphasizedBorderWidth,
                    r: Theme.AgentSkillButtonSize / 2,
                },
                addSkillButtonIcon: {
                    strokeWidth: 3,
                    strokeLinecap: 'round',
                    stroke: Theme.AgentSkillButtonLabelColor,
                    d: `
                        M ${-Theme.AgentSkillButtonIconSize / 2} 0
                        L ${Theme.AgentSkillButtonIconSize / 2} 0
                        M 0 ${-Theme.AgentSkillButtonIconSize / 2}
                        L 0 ${Theme.AgentSkillButtonIconSize / 2}
                    `,
                },
                skillsContainer: {
                    transform: `translate(${Theme.NodeSpacing + skillsLabelWidth}, ${skillsY})`,
                },
            }
        };

        return util.defaultsDeep(attributes, super.defaults());
    }

    getSkills(): AgentSkills {
        return this.get(Attribute.Skills) || {};
    }

    addSkill(skill: AgentSkill, options: dia.Cell.Options = {}): void {
        this.prop([Attribute.Skills, skill.id], skill, { ...options, rewrite: true });
    }

    removeSkill(skillId: string, options: dia.Cell.Options): void {
        this.removeProp([Attribute.Skills, skillId], options);
    }

    getInspectorConfig(): InspectorConfig {
        const config: InspectorConfig = {
            headerText: 'AI Agent',
            headerIcon: 'assets/icons/agent-header.svg',
            renderLabel: (input, path) => {
                if (input.useCustomLabel) {
                    // e.g. my-node-id/to/0/prompt
                    const [,,index] = path.split('/');
                    return /* html */`<label>Path ${Number(index) + 1}</label>`;
                }
                // Use default label otherwise
                return undefined;
            },
            groups: {
                agent: {
                    label: 'AI Agent'
                }
            },
            inputs: {
                [Attribute.NodePrompt]: {
                    type: 'content-editable',
                    label: 'AI Agent prompt',
                    group: 'agent',
                },
                to: {
                    type: 'list',
                    label: /* html */`Exit conditions:
                    <div class="field-hint-container">
                        <img class="field-hint-icon" src="assets/icons/hint.svg">
                        <div class="field-hint">Describe possible execution paths based on the AI Agent execution.</div>
                    </div>`,
                    addButtonLabel: '+ Add path',
                    group: 'agent',
                    item: {
                        [Attribute.EdgePrompt]: {
                            useCustomLabel: true, // see `renderLabel` above
                            type: 'content-editable',
                            label: 'Path',
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
}
