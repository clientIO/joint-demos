/*! JointJS+ v4.2.2 (2026-01-22) - HTML5 Diagramming Framework

Copyright (c) 2025 client IO

This Source Code Form is subject to the terms of the JointJS+
License, v. 2.0. If a copy of the JointJS+ License was not
distributed with this file, You can obtain one at
https://www.jointjs.com/license or from the JointJS+ archive as was
distributed by client IO. See the LICENSE file.
*/

import Vue from 'vue';
import { Prop, Watch } from 'vue-property-decorator';
import Component from 'vue-class-component';
import type { dia } from '@joint/plus';

export interface Properties {
    [property: string]: dia.Path;
}

@Component({} as any)
export abstract class BaseInspector extends Vue {

    @Prop() cell: dia.Cell;
    @Prop() currentCellId: dia.Cell.ID;

    public props: Properties;

    @Watch('currentCellId')
    onCurrentCellIdChanged(currentValue: dia.Cell.ID, previousValue: dia.Cell.ID): void {
        const { graph } = this.cell;
        this.removeCellListener(graph.getCell(previousValue));
        this.addCellListener(graph.getCell(currentValue));
        this.assignFormFields();
    }

    public mounted(): void {
        this.addCellListener(this.cell);
        this.assignFormFields();
    }

    public beforeDestroy(): void {
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

