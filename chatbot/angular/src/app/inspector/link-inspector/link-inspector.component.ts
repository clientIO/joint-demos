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

@Component({
    selector: 'app-link-inspector',
    templateUrl: './link-inspector.component.html',
    styleUrls: ['../inspector.component.scss']
})
export class LinkInspectorComponent extends BaseInspectorComponent {

    @Input() cell: shapes.app.Link = null;

    public label: string;

    public props = {
        label: ['labels', 0, 'attrs', 'labelText', 'text']
    };

    protected assignFormFields(): void {
        const { cell, props } = this;
        this.label = cell.prop(props.label);
    }
}
