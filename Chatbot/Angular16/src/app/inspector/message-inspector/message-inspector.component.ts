/*! JointJS+ v4.2.2 (2026-01-22) - HTML5 Diagramming Framework

Copyright (c) 2025 client IO

This Source Code Form is subject to the terms of the JointJS+
License, v. 2.0. If a copy of the JointJS+ License was not
distributed with this file, You can obtain one at
https://www.jointjs.com/license or from the JointJS+ archive as was
distributed by client IO. See the LICENSE file.
*/

import { Component, Input } from '@angular/core';
import type { shapes } from '@joint/plus';

import { BaseInspectorComponent } from '../base-inspector/base-inspector.component';

interface InspectorPort {
    id: string;
    label: string;
}

@Component({
    selector: 'app-message-inspector',
    templateUrl: './message-inspector.component.html',
    styleUrls: ['../inspector.component.scss']
})
export class MessageInspectorComponent extends BaseInspectorComponent {

    @Input() cell: shapes.app.Message = null;

    public label: string;
    public description: string;
    public icon: string;
    public ports: InspectorPort[];
    public canAddPort = false;

    public props = {
        label: ['attrs', 'label', 'text'],
        description: ['attrs', 'description', 'text'],
        icon: ['attrs', 'icon', 'xlinkHref'],
        portLabel: ['attrs', 'portLabel', 'text']
    };

    public addCellPort(): void {
        this.cell.addDefaultPort();
        this.assignFormPorts();
    }

    public removeCellPort(portId: string): void {
        this.cell.removePort(portId);
        this.assignFormPorts();
    }

    public changeCellPort(port: InspectorPort): void {
        const { cell, props } = this;
        cell.portProp(port.id, props.portLabel, port.label);
    }

    public trackByPortId(index: number, port: InspectorPort): string {
        return port.id;
    }

    protected assignFormFields(): void {
        const { cell, props } = this;
        this.label = cell.prop(props.label);
        this.description = cell.prop(props.description);
        this.icon = cell.prop(props.icon);
        this.assignFormPorts();
    }

    private assignFormPorts(): void {
        const { cell, props } = this;
        this.canAddPort = cell.canAddPort('out');
        this.ports = cell.getGroupPorts('out').map(({ id }) => {
            return {
                id,
                label: cell.portProp(id, props.portLabel)
            };
        });
    }
}
