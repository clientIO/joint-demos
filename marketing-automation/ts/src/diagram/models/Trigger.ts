import { type dia, util } from '@joint/plus';
import { Attribute } from '../const';
import Theme, { nodeLabelAttributes, typeLabelAttributes, rectBodyAttributes, iconAttributes, iconBackgroundAttributes } from '../theme';
import Node from './Node';

import type { NodeAttributes } from './Node';
import type { TriggerData, TriggerDefinition } from '../../registry/types';
import type { InspectorConfig } from '../../types';

const triggerMarkup = util.svg/* xml*/`
    <rect @selector="body" class="node-body trigger-body"/>
    <rect @selector="iconBackground"/>
    <image @selector="icon" class="node-icon trigger-icon" />
    <text @selector="typeLabel" class="node-label trigger-type-label" />
    <text @selector="label" class="node-label trigger-label" />
    <g @selector="criteriaContainer"/>
    <g class="add-criteria-button-container" @selector="addCriteriaButtonContainer">
        <rect class="add-criteria-button" @selector="addCriteriaButton" />
        <text class="add-criteria-button-text" @selector="addCriteriaButtonText" />
    </g>
`;

const TYPE = 'trigger';

/** Computed minimum height of the trigger node (without any criteria) */
const triggerMinHeight = Theme.NodeHeight + Theme.TriggerAddButtonHeight + Theme.NodeVerticalPadding;

export interface TriggerCriteria {
    id: string;
    name: string;
    icon: string;
    data?: Record<string, any>;
}

interface TriggerAttributes extends NodeAttributes {
    [Attribute.Criteria]: TriggerCriteria[];
}

export default class Trigger extends Node<TriggerAttributes> {

    static override type = TYPE;

    static override growthLimit = 1;

    minimapBackground: string = Theme.TriggerMinimapBackgroundColor;

    criteriaDataDefinitions: Record<string, TriggerData> = {};

    preinitialize(): void {
        this.markup = triggerMarkup;
    }

    initialize(attributes: TriggerAttributes, options?: any): void {
        super.initialize(attributes, options);
        this.on('change:criteria', this.updateHeight);
        this.updateHeight();
    }

    defaults(): Partial<TriggerAttributes> {

        const attributes: TriggerAttributes = {
            // App-specific attributes
            [Attribute.Removable]: false,
            [Attribute.SourceOnly]: true,
            // Shape-specific attributes
            [Attribute.Criteria]: [],
            // JointJS attributes
            z: 1,
            type: TYPE,
            size: {
                width: Theme.NodeWidth,
                height: 160
            },
            attrs: {
                root: {
                    cursor: 'pointer'
                },
                body: rectBodyAttributes,
                iconBackground: {
                    ...iconBackgroundAttributes,
                    fill: Theme.TriggerIconBackgroundColor
                },
                icon: {
                    ...iconAttributes,
                    href: 'assets/icons/trigger.svg'
                },
                typeLabel: {
                    ...typeLabelAttributes,
                    text: 'Trigger enrollment for contacts',
                    textWrap: {
                        width: `calc(w - ${Theme.NodeHorizontalPadding * 2 + Theme.IconBackgroundSize + Theme.IconLabelSpacing})`,
                        maxLineCount: 1,
                        ellipsis: true
                    },
                },
                label: {
                    ...nodeLabelAttributes,
                    text: 'When this happens',
                    textWrap: {
                        width: `calc(w - ${Theme.NodeHorizontalPadding * 2 + Theme.IconBackgroundSize + Theme.IconLabelSpacing})`,
                        maxLineCount: 1,
                        ellipsis: true
                    },
                },
                criteriaContainer: {
                    transform: `translate(0, ${Theme.NodeHeight})`,
                },
                addCriteriaButtonContainer: {
                    // Ensure the button is always at the bottom of the trigger
                    transform: `translate(0, calc(h - ${Theme.TriggerAddButtonHeight + Theme.NodeVerticalPadding}))`,
                },
                addCriteriaButton: {
                    x: Theme.NodeHorizontalPadding,
                    width: `calc(w - ${Theme.NodeHorizontalPadding * 2})`,
                    height: Theme.TriggerAddButtonHeight,
                    rx: 8,
                    ry: 8,
                    fill: Theme.TriggerButtonBackgroundColor,
                    fontSize: 12,
                    fontFamily: Theme.FontFamily,
                    fontWeight: 500,
                },
                addCriteriaButtonText: {
                    x: 'calc(w / 2)',
                    y: Theme.TriggerAddButtonHeight / 2,
                    text: 'Add criteria',
                    textVerticalAnchor: 'middle',
                    textAnchor: 'middle',
                    fontSize: 12,
                    fontFamily: Theme.FontFamily,
                    fill: Theme.TriggerButtonLabelColor,
                }
            }
        };

        return util.defaultsDeep(attributes, super.defaults());
    }

    /**
     * @returns The criteria of the trigger from the trigger model.
     * @see {@link Attribute.Criteria}
     */
    getCriteria(): TriggerCriteria[] {
        const criteria = this.get(Attribute.Criteria);
        if (Array.isArray(criteria)) {
            return criteria;
        }
        // Backwards compatibility for object-based criteria
        if (typeof criteria === 'object' && criteria !== null) {
            return Object.values(criteria);
        }
        return [];
    }

    /**
     * @returns Dynamically built inspector config for the trigger.
     * Groups and inputs are dynamically built based on the trigger's criteria.
     * @see {@link InspectorConfig}
     */
    getInspectorConfig(): InspectorConfig {

        const criteria = this.getCriteria();
        const groups: InspectorConfig['groups'] = {};
        const inputs: InspectorConfig['inputs'] = {};

        let index = 1;

        criteria.forEach((criterion, i) => {

            const dataDefinition = this.criteriaDataDefinitions[criterion.id];
            if (!dataDefinition) return;

            const dataKeys = Object.keys(dataDefinition);
            if (dataKeys.length === 0) return;

            // Note: using the criteria id as the group name, this means that there
            // can be only one criteria of the same type.
            const groupName = criterion.id;

            groups[groupName] = {
                label: criterion.name,
                index: index++,
                closed: i > 0
            };

            const groupInputs: { [key: string]: unknown } = {};

            dataKeys.forEach(fieldKey => {
                const dataEntry = dataDefinition[fieldKey];

                groupInputs[`${Attribute.Criteria}/${i}/data/${fieldKey}`] = {
                    label: /* html */`${dataEntry.name}:
                        <div class="field-hint-container">
                            <img class="field-hint-icon" src="assets/icons/hint.svg">
                            <div class="field-hint">${dataEntry.description}</div>
                        </div>
                    `,
                    type: this.getInputType(dataEntry.type),
                    group: groupName
                };
            });

            Object.assign(inputs, groupInputs);
        });

        return {
            ...super.getInspectorConfig(),
            headerText: `Trigger`,
            headerIcon: this.attr('icon/href'),
            headerIconBackground: this.attr('iconBackground/fill'),
            headerHint: 'Configure automation rules',
            groups,
            inputs
        };
    }

    /**
     * @param dataEntryType - Converts the data entry type to the corresponding input type expected by the inspector.
     * @returns The type of the input for the data entry.
     */
    getInputType(dataEntryType: string): string {
        switch (dataEntryType) {
            case 'string':
                return 'text';
            case 'number':
                return 'number';
            case 'boolean':
                return 'toggle';
            case 'text':
                return 'content-editable';
            default:
                return 'text';
        }
    }

    /**
     * Updates the criteria definition for the given criteria id.
     * @param criteriaId - The id of the criteria to update.
     * @param definition - The definition of the criteria to update.
     * @see {@link TriggerDefinition}
     */
    updateCriteriaDefinition(criteriaId: string, definition: TriggerDefinition) {
        this.criteriaDataDefinitions[criteriaId] = definition.data || {};
    }

    /**
     * Adds a new criteria to the trigger.
     * @param criteria - The criteria to add.
     * @param options - The options to pass to the set method.
     * @see {@link TriggerCriteria}
     */
    addCriteria(criteria: TriggerCriteria, options: dia.Cell.Options): void {
        const current = this.getCriteria();
        if (current.some(c => c.id === criteria.id)) {
            return;
        }
        this.set(Attribute.Criteria, [...current, criteria], options);
    }

    /**
     * Removes a criteria from the trigger.
     * @param criteriaId - The id of the criteria to remove.
     * @param options - The options to pass to the set method.
     * @see {@link TriggerCriteria}
     */
    removeCriteria(criteriaId: string, options: dia.Cell.Options): void {
        const current = this.getCriteria();
        const updated = current.filter(c => c.id !== criteriaId);
        this.set(Attribute.Criteria, updated, options);
        // Clean up definitions if no longer used
        if (!updated.some(c => c.id === criteriaId)) {
            delete this.criteriaDataDefinitions[criteriaId];
        }
    }

    /**
     * @returns The height of the criteria container of the trigger from the trigger model.
     * @see {@link Attribute.Criteria}
     */
    protected getCriteriaHeight(): number {
        const criteria = this.getCriteria();
        const criteriaCount = criteria.length;

        if (criteriaCount <= 0) {
            return 0;
        }

        return criteriaCount * Theme.TriggerCriteriaHeight + (criteriaCount - 1) * Theme.TriggerCriteriaGap;
    }

    /**
     * @returns Computed height based on the minimum height, criteria height, and add button height and gap between subheader and criteria.
     * @see {@link triggerMinHeight}
     * @see {@link Attribute.Criteria}
     */
    protected computeHeight(): number {
        if (this.getCriteria().length === 0) {
            return triggerMinHeight;
        }

        return triggerMinHeight + this.getCriteriaHeight() + Theme.TriggerCriteriaGap;
    }

    /**
     * Updates the size of the trigger based on the minimum height, criteria height, and add button height.
     * @see {@link triggerMinHeight}
     * @see {@link getCriteriaHeight}
     * @see {@link computeHeight}
     */
    updateHeight(): void {
        const targetHeight = this.computeHeight();
        const { height: currentHeight } = this.size();
        if (currentHeight === targetHeight) {
            return;
        }
        this.size({ height: targetHeight });
    }
}
