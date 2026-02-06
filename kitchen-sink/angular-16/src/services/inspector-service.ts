/*! JointJS+ v4.2.2 (2026-01-22) - HTML5 Diagramming Framework

Copyright (c) 2025 client IO

This Source Code Form is subject to the terms of the JointJS+
License, v. 2.0. If a copy of the JointJS+ License was not
distributed with this file, You can obtain one at
https://www.jointjs.com/license or from the JointJS+ archive as was
distributed by client IO. See the LICENSE file.
*/

import * as joint from '@joint/plus';
import { inspectorDefinitions } from '../config/inspector';
const HIDDEN_CLASS_NAME = 'hidden';

type InspectorElements = {
    openGroupsButton: HTMLButtonElement;
    closeGroupsButton: HTMLButtonElement;
    container: HTMLElement;
    header: HTMLDivElement;
    content: HTMLElement;
}
export class InspectorService {

    inspector: joint.ui.Inspector;
    private readonly header: HTMLDivElement;
    private readonly content: HTMLElement;
    private readonly container: HTMLElement;

    constructor({
        openGroupsButton,
        closeGroupsButton,
        container,
        header,
        content
    }: InspectorElements) {
        openGroupsButton.addEventListener('click', () => this.inspector?.openGroups());
        closeGroupsButton.addEventListener('click', () => this.inspector?.closeGroups());
        this.header = header;
        this.content = content;
        this.container = container;
    }

    create(cell: joint.dia.Cell): joint.ui.Inspector {
        this.header.classList.remove(HIDDEN_CLASS_NAME);

        const { groups, inputs } = this.getInspectorConfig()[cell.get('type')];
        const inspector = joint.ui.Inspector.create(this.content, {
            cell,
            groups,
            inputs,
            container: this.container,
            renderFieldContent: (options, path, _value, inspector) => {
                if (options.type === 'image-picker') {
                    const label = document.createElement('label');
                    label.textContent = options.label;

                    const input = document.createElement('input');

                    input.type = 'file';
                    input.accept = 'image/x-png,image/gif,image/jpeg';

                    const field = document.createElement('div');
                    field.appendChild(label);
                    field.appendChild(input);

                    input.addEventListener('change', function() {
                        inspector.updateCell(field, path, options);
                    });

                    return field;
                }

                // Use the default field renderer.
                return null;
            },
            getFieldValue: (field, type) => {
                if (type === 'image-picker') {
                    const file = field.querySelector<HTMLInputElement>('input').files.item(0);
                    return { value: file ? URL.createObjectURL(file) : '' };
                }

                // Use the default field value getter.
                return null;
            }
        });

        if (this.inspector !== inspector) {
            inspector.on('close', () => {
                this.header.classList.add(HIDDEN_CLASS_NAME);
            });
            this.inspector = inspector;
        }

        return this.inspector;
    }

    getInspectorConfig() {
        return inspectorDefinitions;
    }
}


