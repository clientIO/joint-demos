import type { mvc } from '@joint/plus';
import { dia, V } from '@joint/plus';
import type { AgentSkill } from '../models/Agent';
import Agent from '../models/Agent';
import Theme from '../theme';

export default class AgentView extends dia.ElementView<Agent> {

    static type = Agent.type + 'View';

    skillSVGElements: { [id: string]: SVGElement } = {};

    skillWidth = Theme.AgentSkillSize;
    skillHeight = Theme.AgentSkillSize;
    rowCapacity = 6;
    columnCapacity = 3;

    presentationAttributes(): dia.CellView.PresentationAttributes {
        return dia.ElementView.addPresentationAttributes({
            // Update the view when the skills change
            skills: [dia.ElementView.Flags.UPDATE]
        });
    }

    update(): this {
        super.update();
        this.updateSkills();
        return this;
    }

    updateSkills(): void {
        // `skillsContainer` is a <g> element defined in the Agent model
        const containerEl = this.findNode('skillsContainer');
        if (!containerEl) return;

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

    protected renderSkill(skill: AgentSkill): SVGElement {
        return V(/* xml */`
            <g class="agent-skill" data-skill-id="${skill.id}" data-tooltip="${skill.name}">
                <image class="agent-skill-icon" width="25" height="25" href="${skill.icon}"/>
                <image class="agent-skill-remove" x="17" y="-5" width="15" height="15" href="assets/icons/remove.svg" data-tooltip="Remove ${skill.name}"/>
            </g>
        `).node;
    }

    protected layoutSkills(): void {
        const skillSVGElements = Object.values(this.skillSVGElements);
        const skillRows: SVGElement[][] = [];
        // Group skills into rows
        let row: SVGElement[] = [];
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
                skillEl.setAttribute(
                    'transform',
                    `translate(${columnIndex * this.skillHeight}, ${rowIndex * this.skillWidth})`
                );
            });
        });
    }

    events(): mvc.EventsHash {
        return {
            'click .agent-add-skill-button': (evt: dia.Event) => this.onAddSkillButtonClick(evt),
            'click .agent-skill-remove': (evt: dia.Event) => this.onSkillRemoveClick(evt),
        };
    }

    onAddSkillButtonClick(evt: dia.Event): void {
        evt.stopPropagation();
        this.paper!.trigger('agent:add-skill:pointerclick', this, evt);
    }

    onSkillRemoveClick(evt: dia.Event): void {
        evt.stopPropagation();
        const skillId = evt.target.closest('.agent-skill')?.dataset.skillId;
        if (!skillId) return;
        this.paper!.trigger('agent:remove-skill:pointerclick', this, evt, skillId);
    }
}
