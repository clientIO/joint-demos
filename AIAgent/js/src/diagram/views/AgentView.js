import { dia, V } from '@joint/plus';
import Agent from '../models/Agent';
import Theme from '../theme';

export default class AgentView extends dia.ElementView {
    
    static type = Agent.type + 'View';
    
    skillSVGElements = {};
    
    skillWidth = Theme.AgentSkillSize;
    skillHeight = Theme.AgentSkillSize;
    rowCapacity = 6;
    columnCapacity = 3;
    
    presentationAttributes() {
        return dia.ElementView.addPresentationAttributes({
            // Update the view when the skills change
            skills: [dia.ElementView.Flags.UPDATE]
        });
    }
    
    update() {
        super.update();
        this.updateSkills();
        return this;
    }
    
    updateSkills() {
        // `skillsContainer` is a <g> element defined in the Agent model
        const containerEl = this.findNode('skillsContainer');
        if (!containerEl)
            return;
        
        const skills = this.model.getSkills();
        
        // Remove skills that are no longer present
        for (const skillId in this.skillSVGElements) {
            if (skills[skillId]) {
                // Skill still present
                continue;
            }
            this.skillSVGElements[skillId].remove();
            delete this.skillSVGElements[skillId];
        }
        
        const maxSkills = this.rowCapacity * this.columnCapacity;
        let totalSkills = Object.keys(this.skillSVGElements).length;
        
        // Add new skills
        for (const skillId in skills) {
            if (this.skillSVGElements[skillId]) {
                // Skill already rendered
                continue;
            }
            if (totalSkills >= maxSkills) {
                // Do not render more than the maximum allowed skills
                break;
            }
            const skillEl = this.renderSkill(skills[skillId]);
            containerEl.appendChild(skillEl);
            this.skillSVGElements[skillId] = skillEl;
            totalSkills++;
        }
        
        this.layoutSkills();
    }
    
    renderSkill(skill) {
        return V(/* xml */ `
            <g class="agent-skill" data-skill-id="${skill.id}" data-tooltip="${skill.name}">
                <image class="agent-skill-icon" width="25" height="25" href="${skill.icon}"/>
                <image class="agent-skill-remove" x="17" y="-5" width="15" height="15" href="assets/icons/remove.svg" data-tooltip="Remove ${skill.name}"/>
            </g>
        `).node;
    }
    
    layoutSkills() {
        const skillSVGElements = Object.values(this.skillSVGElements);
        const skillRows = [];
        // Group skills into rows
        let row = [];
        skillSVGElements.forEach((skillEl, index) => {
            if (index % this.rowCapacity === 0) {
                if (row.length > 0) {
                    skillRows.push(row);
                }
                row = [];
            }
            row.push(skillEl);
        });
        if (row.length > 0) {
            skillRows.push(row);
        }
        // Apply layout
        skillRows.forEach((row, rowIndex) => {
            row.forEach((skillEl, columnIndex) => {
                skillEl.setAttribute('transform', `translate(${columnIndex * this.skillHeight}, ${rowIndex * this.skillWidth})`);
            });
        });
    }
    
    events() {
        return {
            'click .agent-add-skill-button': (evt) => this.onAddSkillButtonClick(evt),
            'click .agent-skill-remove': (evt) => this.onSkillRemoveClick(evt),
        };
    }
    
    onAddSkillButtonClick(evt) {
        evt.stopPropagation();
        this.paper.trigger('agent:add-skill:pointerclick', this, evt);
    }
    
    onSkillRemoveClick(evt) {
        evt.stopPropagation();
        const skillId = evt.target.closest('.agent-skill')?.dataset.skillId;
        if (!skillId)
            return;
        this.paper.trigger('agent:remove-skill:pointerclick', this, evt, skillId);
    }
}
