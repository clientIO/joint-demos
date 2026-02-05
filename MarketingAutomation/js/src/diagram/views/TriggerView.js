import { dia, util, V } from '@joint/plus';
import AnimatedElementView from './AnimatedElementView';
import Theme from '../theme';
import { Attribute } from '../const';

const CRITERIA_WIDTH = Theme.NodeWidth - 2 * Theme.NodeHorizontalPadding;
const CRITERIA_TYPOGRAPHY = {
    fontSize: 12,
    fontFamily: Theme.FontFamily
};

export default class TriggerView extends AnimatedElementView {
    
    criteriaSVGElements = {};
    
    getIconPosition() {
        return {
            x: Theme.NodeHorizontalPadding + Theme.TriggerCriteriaIconMargin,
            y: (Theme.TriggerCriteriaHeight - Theme.TriggerCriteriaIconSize) / 2
        };
    }
    
    getTextPosition() {
        return {
            x: this.getIconPosition().x + Theme.TriggerCriteriaIconSize + Theme.TriggerCriteriaIconMargin,
            y: Theme.TriggerCriteriaHeight / 2
        };
    }
    
    presentationAttributes() {
        return dia.ElementView.addPresentationAttributes({
            // Update the view when the criteria change
            [Attribute.Criteria]: [dia.ElementView.Flags.UPDATE]
        });
    }
    
    update() {
        super.update();
        this.updateCriteria();
        return this;
    }
    
    updateCriteria() {
        // `criteriaContainer` is a <g> element defined in the Trigger model
        const containerEl = this.findNode('criteriaContainer');
        if (!containerEl)
            return;
        
        const criteriaList = this.model.getCriteria();
        
        // Remove criteria that are no longer present
        for (const criteriaId in this.criteriaSVGElements) {
            if (criteriaList.some(c => c.id === criteriaId)) {
                // Criteria still present
                continue;
            }
            this.criteriaSVGElements[criteriaId].remove();
            delete this.criteriaSVGElements[criteriaId];
        }
        
        // Add new criteria
        for (const criteria of criteriaList) {
            if (this.criteriaSVGElements[criteria.id]) {
                // Criteria already rendered
                continue;
            }
            const criteriaEl = this.renderCriteria(criteria);
            containerEl.appendChild(criteriaEl);
            this.criteriaSVGElements[criteria.id] = criteriaEl;
        }
        
        this.layoutCriteria();
        // Ensure the node bbox is updated
        this.cleanNodesCache();
    }
    
    
    renderCriteria(triggerCriteria) {
        const { fontSize, fontFamily } = CRITERIA_TYPOGRAPHY;
        
        const criteriaName = util.breakText(triggerCriteria.name, { width: CRITERIA_WIDTH - Theme.TriggerCriteriaIconSize - Theme.TriggerCriteriaIconMargin * 2 - Theme.TriggerCriteriaDeleteButtonSize }, { fontSize, fontFamily }, { maxLineCount: 1, ellipsis: true, svgDocument: this.paper.svg });
        
        const iconPosition = this.getIconPosition();
        const textPosition = this.getTextPosition();
        
        return V(/* xml */ `
            <g class="trigger-criteria" data-id="${triggerCriteria.id}" data-tooltip="${triggerCriteria.name}">
                <rect
                    rx="8"
                    ry="8"
                    x="${Theme.NodeHorizontalPadding}"
                    width="${CRITERIA_WIDTH}"
                    height="${Theme.TriggerCriteriaHeight}"
                    fill="#EEF2FF"
                    stroke="#C7D2FE"
                    stroke-width="1"
                />
                <image
                    class="trigger-criteria-icon"
                    x="${iconPosition.x}"
                    y="${iconPosition.y}"
                    width="${Theme.TriggerCriteriaIconSize}"
                    height="${Theme.TriggerCriteriaIconSize}"
                    href="${triggerCriteria.icon}"
                />
                <text
                    x="${textPosition.x}"
                    y="${textPosition.y}"
                    font-size="${fontSize}"
                    fill="#1F2433"
                    font-family="${fontFamily}"
                    dominant-baseline="central">${criteriaName}
                </text>
                <image
                    class="trigger-criteria-remove"
                    data-id="${triggerCriteria.id}"
                    x="${CRITERIA_WIDTH + Theme.NodeHorizontalPadding - Theme.TriggerCriteriaDeleteButtonSize - Theme.TriggerCriteriaIconMargin}"
                    y="${Theme.TriggerCriteriaHeight / 2 - Theme.TriggerCriteriaDeleteButtonSize / 2}"
                    width="${Theme.TriggerCriteriaDeleteButtonSize}"
                    height="${Theme.TriggerCriteriaDeleteButtonSize}"
                    href="assets/icons/remove.svg"
                    data-tooltip="Remove ${triggerCriteria.name}"
                />
            </g>
        `).node;
    }
    
    layoutCriteria() {
        // Note: Iterate based on the model list order, not the map keys/values order
        // This ensures the visual layout matches the data order (e.g. if items are reordered)
        const criteriaList = this.model.getCriteria();
        
        criteriaList.forEach((criteria, index) => {
            const el = this.criteriaSVGElements[criteria.id];
            if (el) {
                el.setAttribute('transform', `translate(0, ${index * (Theme.TriggerCriteriaHeight + Theme.TriggerCriteriaGap)})`);
            }
        });
    }
    
    events() {
        return {
            'click .add-criteria-button-container': (evt) => this.onAddCriteriaButtonClick(evt),
            'click .trigger-criteria-remove': (evt) => this.onCriteriaRemoveClick(evt),
        };
    }
    
    onAddCriteriaButtonClick(evt) {
        evt.stopPropagation();
        this.paper.trigger('trigger:add-criteria:pointerclick', this, evt);
    }
    
    onCriteriaRemoveClick(evt) {
        evt.stopPropagation();
        const criteriaId = evt.target.closest('.trigger-criteria')?.dataset.id;
        if (!criteriaId)
            return;
        this.paper.trigger('trigger:remove-criteria:pointerclick', this, evt, criteriaId);
    }
}
