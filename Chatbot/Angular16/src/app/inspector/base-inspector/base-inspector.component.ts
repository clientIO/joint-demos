/*! JointJS+ v4.2.2 (2026-01-22) - HTML5 Diagramming Framework

Copyright (c) 2025 client IO

This Source Code Form is subject to the terms of the JointJS+
License, v. 2.0. If a copy of the JointJS+ License was not
distributed with this file, You can obtain one at
https://www.jointjs.com/license or from the JointJS+ archive as was
distributed by client IO. See the LICENSE file.
*/

import type { OnChanges, SimpleChanges, OnDestroy } from '@angular/core';
import { Component, Input } from '@angular/core';
import type { dia } from '@joint/plus';

export interface Properties {
    [property: string]: dia.Path;
}
@Component({
    template: ''
})
export abstract class BaseInspectorComponent implements OnChanges, OnDestroy {

    @Input() cell: dia.Cell;

    public props: Properties;

    public ngOnChanges(changes: SimpleChanges): void {
        if ('cell' in changes) {
            const { cell: change } = changes;
            if (!change.isFirstChange()) {
                this.removeCellListener(change.previousValue);
            }
            this.addCellListener(change.currentValue);
            this.assignFormFields();
        }
    }

    public ngOnDestroy(): void {
        this.removeCellListener(this.cell);
    }

    public changeCellProp(path: dia.Path, value: any): void {
        this.cell.prop(path, value);
    }

    protected abstract assignFormFields(): void;

    private addCellListener(cell: dia.Cell): void {
        cell.on('change', () => this.assignFormFields(), this);
    }

    private removeCellListener(cell: dia.Cell): void {
        cell.off(null, null, this);
    }
}
