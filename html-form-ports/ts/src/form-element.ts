import { dia, util } from '@joint/core';

import { HtmlPortsElementView } from './html-ports-view';

import type { mvc } from '@joint/core';

export interface FieldDefinition {
    name: string;
    label: string;
    placeholder?: string;
    // Computed fields are read-only — their values are derived from the
    // input fields and their ports are meant to be mapped to an output.
    computed?: boolean;
    // CSS flex-basis of the field wrapper — fields wrap into rows freely
    // (e.g. two fields in the first row, one full-width field in the second).
    basis: string;
}

export const FIELDS: FieldDefinition[] = [
    { name: 'firstName', label: 'First name', placeholder: 'John', basis: '40%' },
    { name: 'lastName', label: 'Last name', placeholder: 'Doe', basis: '40%' },
    { name: 'company', label: 'Company', placeholder: 'Acme', basis: '100%' },
    { name: 'fullName', label: 'Full name', computed: true, basis: '100%' },
    { name: 'email', label: 'Email', computed: true, basis: '100%' }
];

// Vertical distance between the bottom of an input and the center of its port.
const PORT_OFFSET = 12;

export class FormElement extends dia.Element {

    defaults(): Partial<dia.Element.Attributes> {
        return {
            ...super.defaults,
            type: 'FormElement',
            size: { width: 280, height: 360 },
            title: 'Form',
            fields: {
                firstName: '',
                lastName: '',
                company: '',
                fullName: '',
                email: ''
            },
            attrs: {
                root: {
                    cursor: 'move',
                    magnet: false
                },
                body: {
                    width: 'calc(w)',
                    height: 'calc(h)',
                    fill: '#ffffff',
                    stroke: '#a0a0a0',
                    strokeWidth: 1,
                    rx: 6,
                    ry: 6
                },
                fo: {
                    x: 0,
                    y: 0,
                    width: 'calc(w)',
                    height: 'calc(h)'
                }
            },
            ports: {
                groups: {
                    // A single ports group. The layout is absolute — the exact
                    // port coordinates are measured from the rendered HTML
                    // inputs by the FormElementView.
                    field: {
                        position: 'absolute',
                        attrs: {
                            portBody: {
                                magnet: true,
                                r: 5,
                                fill: '#4666e5',
                                stroke: '#4666e5',
                                strokeWidth: 2,
                                cursor: 'crosshair'
                            }
                        },
                        markup: util.svg`
                            <circle @selector="portBody" />
                        `
                    }
                },
                items: FIELDS.map((field) => ({
                    id: field.name,
                    group: 'field',
                    // Placeholder coordinates — updated by the view after render.
                    args: { x: 0, y: 0 },
                    // Visually distinguish the in ports (editable fields,
                    // hollow) from the out ports (computed fields, solid) —
                    // only the fill differs, so both look the same size.
                    attrs: field.computed ? {} : {
                        portBody: {
                            fill: '#ffffff'
                        }
                    }
                }))
            }
        };
    }

    preinitialize(): void {
        this.markup = util.svg`
            <rect @selector="body" />
            <foreignObject @selector="fo" />
        `;
    }

    initialize(attributes?: dia.Element.Attributes, options?: dia.Cell.Options): void {
        super.initialize(attributes, options);
        this.on('change:fields', () => this.updateComputedFields());
        this.updateComputedFields();
    }

    // Fill the computed fields from the input fields.
    protected updateComputedFields(): void {
        const { firstName = '', lastName = '', company = '' } = this.get('fields');
        const fullName = [firstName, lastName].filter(Boolean).join(' ');
        const email = (firstName && lastName && company)
            ? `${firstName}.${lastName}@${company}.com`.replace(/\s+/g, '').toLowerCase()
            : '';
        this.prop('fields/fullName', fullName);
        this.prop('fields/email', email);
    }
}

export class FormElementView extends HtmlPortsElementView {

    private form: HTMLFormElement | null = null;

    override presentationAttributes(): dia.CellView.PresentationAttributes {
        return dia.ElementView.addPresentationAttributes({
            size: ['PORT_POSITIONS'],
            fields: ['FORM_FIELDS']
        });
    }

    override initFlag(): dia.CellView.FlagLabel {
        return ['RENDER', 'FORM_FIELDS'];
    }

    override events(): mvc.EventsHash {
        return {
            'input input': 'onFieldInput'
        };
    }

    override confirmUpdate(flags: number, opt: Record<string, unknown>): number {
        let remaining = super.confirmUpdate(flags, opt);
        if (this.hasFlag(remaining, 'FORM_FIELDS')) {
            this.updateFields();
            remaining = this.removeFlag(remaining, 'FORM_FIELDS');
        }
        return remaining;
    }

    override onRender(): void {
        this.renderForm();
        this.updateFields();
    }

    protected renderForm(): void {
        const fo = this.findNode('fo') as SVGForeignObjectElement;
        if (!fo) return;
        fo.replaceChildren();
        const form = document.createElement('form');
        form.className = 'form-element';
        const title = document.createElement('div');
        title.className = 'form-element-title';
        title.textContent = String(this.model.get('title') ?? '');
        form.appendChild(title);
        let dividerRendered = false;
        FIELDS.forEach((field) => {
            if (field.computed && !dividerRendered) {
                const divider = document.createElement('div');
                divider.className = 'form-element-divider';
                divider.textContent = 'Computed';
                form.appendChild(divider);
                dividerRendered = true;
            }
            const wrapper = document.createElement('label');
            wrapper.className = 'form-element-field';
            wrapper.style.flexBasis = field.basis;
            const caption = document.createElement('span');
            caption.textContent = field.label;
            wrapper.appendChild(caption);
            const control = document.createElement('input');
            control.type = 'text';
            control.placeholder = field.placeholder ?? '';
            control.dataset.field = field.name;
            if (field.computed) {
                control.readOnly = true;
                control.classList.add('computed');
            }
            wrapper.appendChild(control);
            form.appendChild(wrapper);
        });
        fo.appendChild(form);
        this.form = form;
    }

    protected onFieldInput(evt: dia.Event): void {
        const control = evt.target as HTMLInputElement;
        const { field } = control.dataset;
        if (!field) return;
        this.model.prop(['fields', field], control.value);
    }

    protected updateFields(): void {
        const { form, model } = this;
        if (!form) return;
        form.querySelectorAll<HTMLInputElement>('[data-field]').forEach((control) => {
            const value = String(model.prop(['fields', control.dataset.field]) ?? '');
            // Avoid resetting the caret of the control the user is typing in.
            if (control.value !== value) {
                control.value = value;
            }
        });
    }

    // Place each port directly under its input.
    protected updatePortPositions(): void {
        const { form } = this;
        if (!form) return;
        const args: Record<string, dia.Point> = {};
        form.querySelectorAll<HTMLElement>('[data-field]').forEach((control) => {
            const rect = this.localRect(control);
            args[control.dataset.field!] = {
                x: rect.x + rect.width / 2,
                y: rect.y + rect.height + PORT_OFFSET
            };
        });
        this.setPortArgs(args);
    }
}
